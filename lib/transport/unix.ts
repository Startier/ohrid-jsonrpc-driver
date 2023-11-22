import { createServer, createConnection, Server, Socket } from "net";
import { SocketNode } from "../socket";
import { ITransport, RemoteSocket } from "../transport";
import ServerTarget, { ServerTargetHandler } from "../targets/ServerTarget";
import { createSubject } from "@mojsoski/streams";
import wrapSocket from "../duplex-wrapper";
import { Log } from "@startier/ohrid";

function wrapServer(server: Server, log: Log): ServerTarget {
  const { subject, notify, close } = createSubject<RemoteSocket>();
  const clients: Socket[] = [];
  const handler: ServerTargetHandler = {
    close() {
      log("debug", `close() called on server`);
      for (const idx in clients) {
        clients[idx].destroy();
      }
      server.close(() => {
        server.unref();
      });
    },
    connections: subject,
  };
  server.on("connection", (socket) => {
    log("debug", `Socket connected`);
    clients.push(socket);
    socket.on("close", () => {
      clients.splice(clients.indexOf(socket), 1);
    });

    notify(wrapSocket(socket, log));
  });
  server.on("close", () => {
    close();
  });
  return new ServerTarget(handler);
}

function connect(address: string, node: SocketNode): { socket: RemoteSocket } {
  const connection = createConnection(address);

  return {
    socket: wrapSocket(connection, node.log),
  };
}

function listen(
  { address }: { port?: number; address?: string },
  node: SocketNode
): { socket: RemoteSocket; stop: () => void } {
  if (typeof address !== "string") {
    throw new Error("Invalid path");
  }
  const server = createServer();
  server.listen(address, () => {
    node.log("info", `Hub server is running on unix socket: ${address}`);
  });
  return {
    socket: wrapServer(server, node.log),
    stop: () => server.close(),
  };
}

const transport: ITransport = { connect, listen };

export default transport;
