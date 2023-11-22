import { Context, Log, Method } from "@startier/ohrid";
import { ErrorCodes, RpcClient, RpcError } from "@mojsoski/rpc";
import { SocketNode, handleSocket } from "../socket";
import terminationProxy from "../terminationProxy";
import { ITransport, RemoteSocket } from "../transport";

type WaitHandle = {
  resolve: () => void;
  reject: (error: any) => void;
};

export default class WorkerNode implements SocketNode {
  private client: RpcClient<any> | undefined = undefined;
  private ctx: Context;
  private socket: RemoteSocket | undefined;

  private internalClientResolvers: WaitHandle[] = [];
  private get internalClient() {
    return this.client;
  }

  private set internalClient(client: RpcClient<any> | undefined) {
    if (client) {
      for (const { resolve } of this.internalClientResolvers) {
        resolve();
      }
      this.internalClientResolvers = [];
    }
    this.client = client;
  }

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
        if (!this.internalClient) {
          await new Promise<void>((resolve, reject) => {
            this.internalClientResolvers.push({ resolve, reject });
          });
        }

        try {
          return await this.internalClient![method.name](...params);
        } catch (e) {
          if (e instanceof RpcError && e.code === ErrorCodes.MethodNotFound) {
            return await this.internalClient!["invoke"](method.name, ...params);
          }
          throw e;
        }
      },
    });
  }

  public terminate(): void {
    if (this.socket?.disconnect) {
      this.socket.disconnect();
    }
    if (this.socket?.close) {
      this.socket.close();
    }
  }

  public connect(remoteHubAddress: string) {
    this.terminate();

    const { socket } = this.transport.connect(remoteHubAddress, this);
    this.socket = socket;
    socket.on("connect", () => {
      this.internalClient = handleSocket(this, socket);
      this.log("info", `Connected to remote hub: ${remoteHubAddress}`);
      socket.emit("interface", {
        supportedMethods: Object.keys(this.rpcMethods),
        name: this.name,
      });
    });
    socket.on("disconnect", () => {
      this.internalClient = undefined;
      this.log("info", `Disconnected from remote hub: ${remoteHubAddress}`);
    });
  }

  public get context(): Context {
    return this.ctx;
  }
}
