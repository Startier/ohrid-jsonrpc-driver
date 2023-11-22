import { createServer, createConnection, Server } from "net";
import { SocketNode } from "../socket";
import { ITransport, RemoteSocket } from "../transport";
import ServerTarget, { ServerTargetHandler } from "../targets/ServerTarget";
import { createSubject } from "@mojsoski/streams";
import wrapSocket from "../duplex-wrapper";
import { Log } from "@startier/ohrid";

function wrapServer(server: Server, log: Log): ServerTarget {
  const { subject, notify, close } = createSubject<RemoteSocket>();
  const handler: ServerTargetHandler = {
    close() {
      server.close();
    },
    connections: subject,
  };
  server.on("connection", (socket) => {
    log(
      "debug",
      `Socket connected: tcp://${socket.remoteAddress}:${socket.remotePort}`
    );

    const subscriber = (item: undefined | RemoteSocket) => {
      if (typeof item === "undefined") {
        socket.emit("close");
      }
    };

    subject.subscribe(subscriber);

    socket.on("close", () => {
      subject.unsubscribe(subscriber);
      socket.destroy();
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

  return {
    socket: wrapSocket(
      createConnection(Number(addr.port), addr.hostname),
      node.log
    ),
  };
}

function listen(
  port: number,
  node: SocketNode
): { socket: RemoteSocket; stop: () => void } {
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
