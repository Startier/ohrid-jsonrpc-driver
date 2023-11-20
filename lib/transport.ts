import { SocketNode } from "./socket";
export type RemoteSocket = {
  emit: (k: string, item: any) => unknown;
  disconnect?: () => void;
  close?: () => void;
  on: (k: string, cb: (data: any) => unknown) => unknown;
  off: (k: string, cb: (data: any) => unknown) => unknown;
};

export interface ITransport {
  connect: (address: string, node: SocketNode) => { socket: RemoteSocket };
  listen: (
    port: number,
    node: SocketNode
  ) => { socket: RemoteSocket; stop: () => void };
}
