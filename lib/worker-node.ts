import { Driver, Log, Method, ServiceConfig } from "@startier/ohrid";
import WorkerNode from "./nodes/WorkerNode";

export const createWorkerNode: Driver["createNode"] = (
  name: string,
  config: ServiceConfig,
  rpcMethods: Record<string, Method>,
  log: Log
) => {
  const node = new WorkerNode(name, rpcMethods, log);
  const remoteHubAddress = process.env.REMOTE_HUB
    ? process.env.REMOTE_HUB
    : config.settings && typeof config.settings["remoteHub"] === "string"
    ? config.settings["remoteHub"]
    : undefined;

  if (!remoteHubAddress) {
    throw new Error("Remote hub address not specified");
  }
  node.connect(remoteHubAddress);

  return node.context;
};
