import { RemoteNodeRef, SocketNode } from "./socket";
export type RemoteSocket = {
  emit<T extends string>(k: T, item: Emit<T>): void;
  disconnect?: () => void;
  close?: () => void;
  on<T extends string>(k: T, cb: Handler<T>): void;
  off<T extends string>(k: T, cb: Handler<T>): void;
};

type EmitInterface<TKey> = TKey extends "interface"
  ? Omit<RemoteNodeRef, "socket">
  : never;

type EmitResponse<TKey> = TKey extends "response" ? string : never;
type EmitRequest<TKey> = TKey extends "request" ? string : never;

export type Emit<TKey extends string> =
  | EmitInterface<TKey>
  | EmitResponse<TKey>
  | EmitRequest<TKey>;

type EmittableHandlers<TKey extends string> = (
  data: Emit<TKey> | undefined
) => void;

type ConnectionHandler<TKey> = TKey extends "connection"
  ? (socket: RemoteSocket | undefined) => void
  : never;

type DisconnectHandler<TKey> = TKey extends "disconnect" ? () => void : never;
type ConnectHandler<TKey> = TKey extends "connect" ? () => void : never;

export type Handler<TKey extends string> =
  | ConnectionHandler<TKey>
  | DisconnectHandler<TKey>
  | ConnectHandler<TKey>
  | EmittableHandlers<TKey>;

export interface ITransport {
  connect: (address: string, node: SocketNode) => { socket: RemoteSocket };
  listen: (
    data: { port?: number; address?: string },
    node: SocketNode
  ) => { socket: RemoteSocket; stop: () => void };
}
