import { createServer, createConnection, Server } from "net";
import { SocketNode } from "../socket";
import { ITransport, RemoteSocket } from "../transport";
import ServerTarget, { ServerTargetHandler } from "../targets/ServerTarget";
import { createSubject } from "@mojsoski/streams";
import wrapSocket from "../duplex-wrapper";

function wrapServer(server: Server): ServerTarget {
  const { subject, notify, close } = createSubject<RemoteSocket>();
  const handler: ServerTargetHandler = {
    close() {
      server.close();
    },
    connections: subject,
  };
  server.on("connection", (socket) => {
    notify(wrapSocket(socket));
  });
  server.on("close", () => {
    close();
  });
  return new ServerTarget(handler);
}

function connect(address: string, node: SocketNode): { socket: RemoteSocket } {
  const addr = new URL(address);
  if (addr.protocol !== "tcp") {
    node.log("error", `Invalid protocol, only tcp is supported`);
    throw 1;
  }

  return {
    socket: wrapSocket(createConnection(Number(addr.port), addr.host)),
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
    socket: wrapServer(server),
    stop: () => server.close(),
  };
}

const transport: ITransport = { connect, listen };

export default transport;
