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
    log(
      "debug",
      `Socket connected: tcp://${socket.remoteAddress}:${socket.remotePort}`
    );
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
  const addr = new URL(address);
  if (addr.protocol !== "tcp:") {
    node.log("error", `Invalid protocol, only tcp is supported`);
    throw 1;
  }

  const connection = createConnection(Number(addr.port), addr.hostname);

  return {
    socket: wrapSocket(connection, node.log),
  };
}

function listen(
  { port }: { port?: number; address?: string },
  node: SocketNode
): { socket: RemoteSocket; stop: () => void } {
  if (typeof port !== "number") {
    throw new Error("Invalid port");
  }
  const server = createServer();
  server.listen(port, () => {
    node.log("info", `Hub server is running on port: ${port}`);
  });
  return {
    socket: wrapServer(server, node.log),
    stop: () => server.close(),
  };
}

const transport: ITransport = { connect, listen };

export default transport;
