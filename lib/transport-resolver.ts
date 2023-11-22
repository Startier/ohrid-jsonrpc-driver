import { ITransport } from "./transport";
import socketIo from "./transport/socket-io";
import tcp from "./transport/tcp";

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
    case "socket.io":
      return socketIo;
    case "tcp":
      return tcp;
  }
  throw new Error("Invalid transport specified");
}
