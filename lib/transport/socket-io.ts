import { Server, createServer } from "http";
import { ITransport, RemoteSocket } from "../transport";
import { SocketNode } from "../socket";
import { io } from "socket.io-client";

const transport: ITransport = {
  listen(
    port: number,
    node: SocketNode
  ): { socket: RemoteSocket; stop: () => void } {
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
        reconnection: true,
      }),
    };
  },
};

export default transport;
