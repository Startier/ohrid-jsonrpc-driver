import { Handler, RemoteSocket } from "../transport";
import { ISubject, Subscriber } from "@mojsoski/streams";

export interface ServerTargetHandler {
  disconnect?: (() => void) | undefined;
  close?: (() => void) | undefined;
  connections: ISubject<RemoteSocket>;
}

export default class ServerTarget implements RemoteSocket {
  public constructor(private readonly handler: ServerTargetHandler) {}

  public emit<T extends string>(k: T): void {
    throw new Error(`Unsupported event for server: ${k}`);
  }

  public on<T extends string>(k: T, cb: Handler<T>): void {
    if (k !== "connection") {
      throw new Error(`Unsupported event for server: ${k}`);
    }
    this.handler.connections.subscribe(cb as Subscriber<RemoteSocket>);
  }

  public off<T extends string>(k: T, cb: Handler<T>): void {
    if (k !== "connection") {
      throw new Error(`Unsupported event for server: ${k}`);
    }

    this.handler.connections.unsubscribe(cb as Subscriber<RemoteSocket>);
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
