import { Duplex } from "stream";
import SocketTarget from "./targets/SocketTarget";
import { RemoteNodeRef } from "./socket";
import {
  blockFromSubject,
  commit,
  createSubject,
  createSubscriber,
} from "@mojsoski/streams";

function getReadable(stream: Duplex) {
  const readable = createSubject<Buffer>();
  stream.on("data", (chunk) => readable.notify(Buffer.from(chunk)));
  stream.on("error", () => readable.close());
  stream.on("end", () => readable.close());
  return readable.subject;
}

function getWritable(socket: Duplex) {
  return createSubscriber<Buffer>({
    end() {
      socket.emit("close");
    },
    data(item) {
      socket.write(item);
    },
  });
}

function duplex(socket: Duplex) {
  const responses = createSubject<string>();
  const requests = createSubject<string>();
  const interfaces = createSubject<Omit<RemoteNodeRef, "socket">>();

  const readable = getReadable(socket);
  const writable = getWritable(socket);

  const handleRawString = createSubscriber<string>({
    end() {
      socket.emit("close");
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
        default:
          socket.emit("close");
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
        writable(Buffer.from("I" + JSON.stringify(item) + "\n", "utf-8"));
      }
    },
    onResponse(item: string | undefined): void {
      if (item) {
        writable(Buffer.from("S" + item + "\n", "utf-8"));
      }
    },
    onRequest(item: string | undefined): void {
      if (item) {
        writable(Buffer.from("Q" + item + "\n", "utf-8"));
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

export default function wrapSocket(socket: Duplex): SocketTarget {
  const connects = createSubject<void>();
  const disconnects = createSubject<void>();

  socket.on("end", () => {
    disconnects.notify();
  });

  socket.on("connect", () => {
    connects.notify();
    close;
  });

  const duplexHandler = duplex(socket);
  const handler = {
    connects: connects.subject,
    disconnects: disconnects.subject,
    ...duplexHandler,
  };

  socket.on("close", () => {
    connects.close();
    disconnects.close();
    duplexHandler.close();
  });

  return new SocketTarget({
    ...handler,
    close: () => {
      socket.emit("close");
    },
  });
}
