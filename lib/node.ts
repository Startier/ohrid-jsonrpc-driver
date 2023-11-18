import { Driver, Log, Method, ServiceConfig } from "@startier/ohrid";
import { createWorkerNode } from "./worker-node";
import { createHubNode } from "./hub-node";

export const createNode: Driver["createNode"] = (
  name: string,
  config: ServiceConfig,
  rpcMethods: Record<string, Method>,
  log: Log
) => {
  if (rpcMethods.invoke) {
    throw new Error(`RPC method name 'invoke' is not allowed`);
  }

  if (config.settings && config.settings["hub"]) {
    return createHubNode(name, config, rpcMethods, log);
  }

  return createWorkerNode(name, config, rpcMethods, log);
};
