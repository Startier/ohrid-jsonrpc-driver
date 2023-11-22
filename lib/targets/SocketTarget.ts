import { ISubject, Subscriber } from "@mojsoski/streams";
import { Emit, Handler, RemoteSocket } from "../transport";

export interface SocketTargetHandler {
  disconnect?: (() => void) | undefined;
  close?: (() => void) | undefined;
  onInterface: Subscriber<Emit<"interface">>;
  onResponse: Subscriber<Emit<"response">>;
  onRequest: Subscriber<Emit<"request">>;
  responses: ISubject<Emit<"response">>;
  requests: ISubject<Emit<"request">>;
  interfaces: ISubject<Emit<"interface">>;
  connects: ISubject<void>;
  disconnects: ISubject<void>;
}

export default class SocketTarget implements RemoteSocket {
  public constructor(private readonly handler: SocketTargetHandler) {}

  public emit<T extends string>(k: T, item: Emit<T>): void {
    if (k === "interface") {
      return this.handler.onInterface(item as Emit<"interface">);
    }
    if (k === "response") {
      return this.handler.onResponse(item as Emit<"response">);
    }
    if (k === "request") {
      return this.handler.onRequest(item as Emit<"request">);
    }

    throw new Error(`Unsupported event for socket: ${k}`);
  }

  public on<T extends string>(k: T, cb: Handler<T>): void {
    if (k === "interface") {
      return this.handler.interfaces.subscribe(
        cb as Subscriber<Emit<"interface">>
      );
    }
    if (k === "response") {
      return this.handler.responses.subscribe(
        cb as Subscriber<Emit<"response">>
      );
    }
    if (k === "request") {
      return this.handler.requests.subscribe(cb as Subscriber<Emit<"request">>);
    }

    if (k === "connect") {
      return this.handler.connects.subscribe(cb as Subscriber<void>);
    }

    if (k === "disconnect") {
      return this.handler.disconnects.subscribe(cb as Subscriber<void>);
    }

    throw new Error(`Unsupported event for socket: ${k}`);
  }

  public off<T extends string>(k: T, cb: Handler<T>): void {
    if (k === "interface") {
      return this.handler.interfaces.unsubscribe(
        cb as Subscriber<Emit<"interface">>
      );
    }

    if (k === "response") {
      return this.handler.responses.unsubscribe(
        cb as Subscriber<Emit<"response">>
      );
    }

    if (k === "request") {
      return this.handler.requests.unsubscribe(
        cb as Subscriber<Emit<"request">>
      );
    }

    if (k === "connect") {
      return this.handler.connects.unsubscribe(cb as Subscriber<void>);
    }

    if (k === "disconnect") {
      return this.handler.disconnects.unsubscribe(cb as Subscriber<void>);
    }

    throw new Error(`Unsupported event for socket: ${k}`);
  }

  public disconnect() {
    if (this.handler.disconnect) {
      this.handler.disconnect();
    }
  }
  public close() {
    if (this.handler.close) {
      this.handler.close();
    }
  }
}
