import { Context, Log, Method } from "@startier/ohrid";
import { RpcError } from "@mojsoski/rpc";
import { NodeInterface, SocketNode, createInterface } from "../socket";
import { Balancer, createBalancer } from "../balancer";
import terminationProxy from "../terminationProxy";
import { ITransport, RemoteSocket } from "../transport";

type WaitHandle = {
  resolve: (client: NodeInterface) => void;
  reject: (rpcError: RpcError) => void;
  methodName: string;
};

export default class HubNode implements SocketNode {
  private ctx: Context;
  private waitHandles: WaitHandle[] = [];
  private balancer: Balancer<NodeInterface>;
  private terminationHandler: () => void = () => {};

  public constructor(
    private name: string,
    public readonly rpcMethods: Record<string, Method>,
    public readonly log: Log,
    private readonly transport: ITransport
  ) {
    this.ctx = terminationProxy(this, {
      currentService: this.name,
      log: this.log,
      remoteCall: async (method, ...params): Promise<any> => {
        return await this.callWithInterface(method.name, ...params);
      },
    });
    this.balancer = createBalancer();
    rpcMethods.invoke = {
      service: name,
      name: "invoke",
      createCaller: () => {
        return async (methodName: string, ...params) =>
          await this.callWithInterface(methodName, ...params);
      },
    };
  }

  public terminate(): void {
    this.terminationHandler();
  }

  public listen(listenConfig: { port?: number; address?: string }): void {
    this.terminate();

    const { socket: server, stop } = this.transport.listen(listenConfig, this);

    this.terminationHandler = () => {
      stop();
      if (server.close) {
        server.close();
      }
      if (server.disconnect) {
        server.disconnect();
      }
    };

    server.on("connection", (socket: RemoteSocket | undefined) => {
      if (!socket) {
        return;
      }
      let currentInterface: NodeInterface | undefined = undefined;

      socket.on("interface", (socketInterface) => {
        if (!socketInterface) return;
        const { supportedMethods, name } = socketInterface;
        if (currentInterface !== undefined) {
          throw new Error("Cannot redefine interface");
        }
        this.log(
          "debug",
          `Created interface for ${name} with ${supportedMethods.length} method(s)`
        );

        currentInterface = createInterface(this, {
          supportedMethods,
          socket,
          name,
        });

        this.balancer.connect(currentInterface.name, currentInterface);

        for (const waitHandle of this.waitHandles) {
          if (supportedMethods.includes(waitHandle.methodName)) {
            waitHandle.resolve(currentInterface);
            this.waitHandles = this.waitHandles.filter(
              (item) => item !== waitHandle
            );
          }
        }
      });

      socket.on("disconnect", () => {
        if (currentInterface) {
          this.balancer.disconnect(currentInterface.name, currentInterface);
        }
      });
    });
  }

  public get context(): Context {
    return this.ctx;
  }

  private async callWithInterface(methodName: string, ...params: unknown[]) {
    this.log("debug", `Resolving ${methodName}...`);

    let node = this.balancer.balance((item) =>
      item.supportedMethods.includes(methodName)
    );

    if (!node) {
      this.log("debug", `Method '${methodName}' not available`);
      node = await new Promise<NodeInterface>((resolve, reject) => {
        this.waitHandles.push({ resolve, reject, methodName });
      });
      this.log("debug", `Method '${methodName}' available`);
    }

    this.log("debug", `Resolved '${methodName}' on node '${node.name}'`);
    return await node.client[methodName](...params);
  }
}
