import { Context, Log, Method } from "@startier/ohrid";
import {
  blockFromSubject,
  commit,
  createSubject,
  createSubscriber,
} from "@mojsoski/streams";
import { RpcClient, client, createClientDriver, server } from "@mojsoski/rpc";
import { RemoteSocket } from "./transport";

export type NodeInterface = {
  client: RpcClient<any>;
  supportedMethods: string[];
  name: string;
};

export function createInterface(
  node: SocketNode,
  { supportedMethods, socket, name }: RemoteNodeRef
): NodeInterface {
  return {
    client: handleSocket(node, socket),
    supportedMethods,
    name,
  };
}

export type RemoteNodeRef = {
  supportedMethods: string[];
  socket: RemoteSocket;
  name: string;
};

export interface SocketNode {
  get context(): Context;
  readonly rpcMethods: Record<string, Method>;
  terminate(): void;
  readonly log: Log;
}

export function handleSocket(
  instance: SocketNode,
  socket: RemoteSocket
): RpcClient<any> {
  const subscriber = createSubscriber<string>({
    data(item) {
      socket.emit("response", item);
    },
    end() {
      if (socket.disconnect) {
        socket.disconnect();
      }
      if (socket.close) {
        socket.close();
      }
    },
  });

  const impl = Object.fromEntries(
    Object.entries(instance.rpcMethods).map(([key, method]) => {
      const handler = (context: Context, ...params: unknown[]) => {
        return method.createCaller(context)(...params);
      };
      return [key, handler] as [string, typeof handler];
    })
  );

  const sub = createSubject<string>();
  socket.on("request", (data) => {
    if (data) {
      sub.notify(data);
    }
  });

  const jsonClient = client<{ [k: string]: any }>(
    createClientDriver(async function* (source) {
      for await (const request of source) {
        instance.log("debug", `JSON-RPC [OUT] Request: ${request}`);

        socket.emit("request", request);

        yield await new Promise<string>((resolve, reject) => {
          const handler = (response: string | undefined) => {
            instance.log("debug", `JSON-RPC [IN] Response: ${response}`);

            if (response) {
              resolve(response);
            } else {
              reject(response);
            }
            socket.off("response", handler);
          };
          socket.on("response", handler);
        });
      }
    })
  );

  commit(
    blockFromSubject(sub.subject)
      .map((item) => {
        instance.log("debug", `JSON-RPC [IN] Request: ${item}`);
        return item;
      })
      .pipe(server<Context>(impl, async () => instance.context))
      .map((item) => {
        instance.log("debug", `JSON-RPC [OUT] Response: ${item}`);
        return item;
      })
      .copyTo(subscriber)
  );

  return jsonClient;
}
