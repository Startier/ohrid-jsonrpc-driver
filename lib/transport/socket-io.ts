import { createServer } from "http";
import { Server } from "socket.io";
import { ITransport, RemoteSocket } from "../transport";
import { SocketNode } from "../socket";
import { io } from "socket.io-client";

const transport: ITransport = {
  listen(
    { port }: { port?: number; address?: string },
    node: SocketNode
  ): { socket: RemoteSocket; stop: () => void } {
    if (typeof port !== "number") {
      throw new Error("Invalid port");
    }
    const httpServer = createServer();
    const serverSocket = new Server(httpServer);
    httpServer.listen(port, () => {
      node.log("info", `Hub server is running on port: ${port}`);
    });

    const stop = () => {
      serverSocket.close();
      httpServer.close();
      httpServer.closeAllConnections();
    };

    return { stop, socket: serverSocket };
  },
  connect(address: string): { socket: RemoteSocket } {
    return {
      socket: io(address, {
        autoConnect: true,
        reconnection: false,
      }) as RemoteSocket,
    };
  },
};

export default transport;
