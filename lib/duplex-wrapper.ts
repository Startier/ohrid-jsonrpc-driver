import { Duplex } from "stream";
import SocketTarget from "./targets/SocketTarget";
import { RemoteNodeRef } from "./socket";
import {
  blockFromSubject,
  commit,
  createSubject,
  createSubscriber,
} from "@mojsoski/streams";
import { Log } from "@startier/ohrid";
import { WebSocket } from "ws";

function getReadable(stream: Duplex | WebSocket) {
  const readable = createSubject<Buffer>();

  stream.on(stream instanceof Duplex ? "data" : "message", (chunk) =>
    readable.notify(Buffer.from(chunk))
  );
  stream.on("error", () => {
    stream.emit("close");
  });
  stream.on("end", () => {});
  return readable.subject;
}

function getWritable(socket: Duplex | WebSocket) {
  return createSubscriber<Buffer>({
    end() {
      if (socket instanceof Duplex) {
        socket.end();
      } else {
        socket.close();
      }
    },
    data(item) {
      if (socket instanceof Duplex) {
        socket.write(item);
      } else {
        socket.send(item);
      }
    },
  });
}

function duplex(socket: Duplex | WebSocket, log: Log) {
  const responses = createSubject<string>();
  const requests = createSubject<string>();
  const interfaces = createSubject<Omit<RemoteNodeRef, "socket">>();

  const readable = getReadable(socket);
  const writable = getWritable(socket);

  const handleRawString = createSubscriber<string>({
    end() {
      if (socket instanceof Duplex) {
        socket.end();
      } else {
        socket.close();
      }
    },
    data(item) {
      switch (item.at(0)) {
        case "I":
          interfaces.notify(JSON.parse(item.slice(1)));
          break;
        case "S":
          responses.notify(item.slice(1));
          break;
        case "Q":
          requests.notify(item.slice(1));
          break;
        default:
          log("warning", `Ignored invalid packet: ${JSON.stringify(item)}`);
          break;
      }
    },
  });

  commit(
    blockFromSubject(readable)
      .pipe(async function* (blocks) {
        const decoder = new TextDecoder("utf-8");
        let text = "";
        for await (const block of blocks) {
          const decodedBlock = decoder.decode(block, { stream: true });
          if (decodedBlock.includes("\n")) {
            const previous = text;
            const idx = decodedBlock.indexOf("\n");
            yield previous + decodedBlock.slice(0, idx);
            let rest = decodedBlock.slice(idx + 1);
            while (rest.includes("\n")) {
              const idx = decodedBlock.indexOf("\n");
              yield decodedBlock.slice(0, idx);
              rest = decodedBlock.slice(idx + 1);
            }
            text = rest;
          } else {
            text += decodedBlock;
          }
        }
      })
      .copyTo(handleRawString)
  );

  return {
    onInterface(item: Omit<RemoteNodeRef, "socket"> | undefined): void {
      if (item) {
        const packet = "I" + JSON.stringify(item) + "\n";
        writable(Buffer.from(packet, "utf-8"));
      }
    },
    onResponse(item: string | undefined): void {
      if (item) {
        const packet = "S" + item + "\n";
        writable(Buffer.from(packet, "utf-8"));
      }
    },
    onRequest(item: string | undefined): void {
      if (item) {
        const packet = "Q" + item + "\n";
        writable(Buffer.from(packet, "utf-8"));
      }
    },
    responses: responses.subject,
    requests: requests.subject,
    interfaces: interfaces.subject,
    close() {
      requests.close();
      responses.close();
      interfaces.close();
    },
  };
}

export function wrapWebSocket(socket: WebSocket, log: Log): SocketTarget {
  const connects = createSubject<void>();
  const disconnects = createSubject<void>();
  let open = false;

  socket.on("open", () => {
    open = true;
    connects.notify();
  });

  const duplexHandler = duplex(socket, log);

  socket.binaryType = "nodebuffer";
  socket.on("message", () => {});
  socket.emit("");
  const handler = {
    connects: connects.subject,
    disconnects: disconnects.subject,
    ...duplexHandler,
  };

  socket.on("close", () => {
    open = false;
    disconnects.notify();
    duplexHandler.close();
  });

  return new SocketTarget({
    ...handler,
    close: () => {
      log("debug", `close() called on stream`);
      socket.close();
    },
  });
}

export default function wrapSocket(socket: Duplex, log: Log): SocketTarget {
  const connects = createSubject<void>();
  const disconnects = createSubject<void>();

  let open = false;

  socket.on("connect", () => {
    open = true;
    connects.notify();
  });

  const duplexHandler = duplex(socket, log);
  const handler = {
    connects: connects.subject,
    disconnects: disconnects.subject,
    ...duplexHandler,
  };

  socket.on("close", () => {
    open = false;
    disconnects.notify();
    duplexHandler.close();
  });
  return new SocketTarget({
    ...handler,
    close: () => {
      log("debug", `close() called on stream`);
      socket.destroy();
    },
  });
}
