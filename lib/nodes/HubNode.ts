import { Context, Log, Method } from "@startier/ohrid";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { RpcError } from "@mojsoski/rpc";
import { NodeInterface, SocketNode, createInterface } from "../socket";
import { Balancer, createBalancer } from "../balancer";
import terminationProxy from "../terminationProxy";

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
    public readonly log: Log
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

  public listen(port: number): void {
    this.terminate();
    const httpServer = createServer();
    const serverSocket = new Server(httpServer);

    this.terminationHandler = () => {
      serverSocket.close();
      httpServer.close();
      httpServer.closeAllConnections();
    };

    httpServer.listen(port, () => {
      this.log("info", `Hub server is running on port: ${port}`);
    });

    serverSocket.on("connection", (socket) => {
      let currentInterface: NodeInterface | undefined = undefined;

      socket.on("interface", ({ supportedMethods, name }) => {
        if (currentInterface !== undefined) {
          throw new Error("Cannot redefine interface");
        }
        this.log(
          "debug",
          `Created interface for '${socket.client.conn.remoteAddress}' (service: ${name}) with ${supportedMethods.length} method(s)`
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
