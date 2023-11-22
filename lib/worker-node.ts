import { Driver, Log, Method, ServiceConfig } from "@startier/ohrid";
import WorkerNode from "./nodes/WorkerNode";
import { resolveTransport } from "./transport-resolver";

export const createWorkerNode: Driver["createNode"] = (
  name: string,
  config: ServiceConfig,
  rpcMethods: Record<string, Method>,
  log: Log
) => {
  const transport = resolveTransport(config.settings ?? {});
  const node = new WorkerNode(name, rpcMethods, log, transport);
  const remoteHubAddress =
    config.settings && typeof config.settings["remoteHub"] === "string"
      ? config.settings["remoteHub"]
      : undefined;

  if (!remoteHubAddress) {
    throw new Error("Remote hub address not specified");
  }
  node.connect(remoteHubAddress);

  return node.context;
};
