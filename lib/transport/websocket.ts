import { createServer } from "http";
import { Server, WebSocket } from "ws";
import { ITransport, RemoteSocket } from "../transport";
import { SocketNode } from "../socket";
import { Log } from "@startier/ohrid";
import { createSubject } from "@mojsoski/streams";
import ServerTarget, { ServerTargetHandler } from "../targets/ServerTarget";
import { wrapWebSocket } from "../duplex-wrapper";

function wrapServerSocket(server: Server, log: Log) {
  const { subject, notify, close } = createSubject<RemoteSocket>();
  const clients: WebSocket[] = [];
  const handler: ServerTargetHandler = {
    close() {
      log("debug", `close() called on server`);
      for (const idx in clients) {
        clients[idx].close();
      }
      server.close();
    },
    connections: subject,
  };
  server.on("connection", (socket) => {
    log("debug", `Socket connected: ${socket.url}`);
    clients.push(socket);
    socket.on("close", () => {
      clients.splice(clients.indexOf(socket), 1);
    });

    notify(wrapWebSocket(socket, log));
  });
  server.on("close", () => {
    close();
  });
  return new ServerTarget(handler);
}

const transport: ITransport = {
  listen(
    { port }: { port?: number; address?: string },
    node: SocketNode
  ): { socket: RemoteSocket; stop: () => void } {
    if (typeof port !== "number") {
      throw new Error("Invalid port");
    }

    const httpServer = createServer();
    const serverSocket = new Server({ server: httpServer });
    httpServer.listen(port, () => {
      node.log("info", `Hub server is running on port: ${port}`);
    });

    const stop = () => {
      serverSocket.close();
      httpServer.close();
      httpServer.closeAllConnections();
    };

    return { stop, socket: wrapServerSocket(serverSocket, node.log) };
  },
  connect(address, node): { socket: RemoteSocket } {
    return {
      socket: wrapWebSocket(new WebSocket(address), node.log),
    };
  },
};

export default transport;
