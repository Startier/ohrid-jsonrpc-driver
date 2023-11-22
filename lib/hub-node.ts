import { Driver, Log, Method, ServiceConfig } from "@startier/ohrid";
import HubNode from "./nodes/HubNode";
import { resolveTransport } from "./transport-resolver";

export const createHubNode: Driver["createNode"] = (
  name: string,
  config: ServiceConfig,
  rpcMethods: Record<string, Method>,
  log: Log
) => {
  config.settings ??= {};
  const transport = resolveTransport(config.settings);
  const node = new HubNode(name, rpcMethods, log, transport);

  const port =
    typeof config.settings["port"] === "number"
      ? config.settings["port"]
      : undefined;

  const address =
    typeof config.settings["address"] === "string"
      ? config.settings["address"]
      : undefined;

  node.listen({ port, address });

  return node.context;
};
