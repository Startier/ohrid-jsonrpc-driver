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

  const port = process.env.PORT
    ? Number(process.env.PORT)
    : typeof config.settings["port"] === "number"
    ? config.settings["port"]
    : undefined;

  if (typeof port !== "number") {
    throw new Error("Port was not specified");
  }

  node.listen(port);

  return node.context;
};
