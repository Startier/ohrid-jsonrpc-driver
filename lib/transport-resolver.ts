import { ITransport } from "./transport";
import socketIo from "./transport/socket-io";
import tcp from "./transport/tcp";
import unix from "./transport/unix";
import websocket from "./transport/websocket";
export function resolveTransport(
  settings: Record<string, object | string | number | boolean>
) {
  return getTransport(
    (typeof settings.transport === "string" ? settings.transport : undefined) ??
      "socket.io"
  );
}

export function getTransport(transport: string): ITransport {
  switch (transport) {
    case "unix":
      return unix;
    case "socket.io":
      return socketIo;
    case "websocket":
      return websocket;
    case "tcp":
      return tcp;
  }
  throw new Error("Invalid transport specified");
}
