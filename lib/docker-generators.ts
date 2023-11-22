import { Driver } from "@startier/ohrid";

export const handleDockerCompose: Driver["handleDockerCompose"] = async ({
  service,
  block,
  appendLine,
}) => {
  let settings = Object.entries(service.settings ?? {});
  if (service.settings?.port) {
    appendLine("ports:");
    await block(async () => {
      appendLine(`- "${service.settings?.port}:${service.settings?.port}"`);
    });
  }

  if (typeof service.settings?.environment === "object") {
    settings.push(
      ...Object.entries(service.settings.environment).map(
        ([key, value]) => ["ENV:" + key, value.toString()] as [string, string]
      )
    );
  }

  settings = settings.filter(
    ([key, value]) =>
      (key.startsWith("ENV:") || key === "port" || key == "remoteHub") &&
      typeof value !== "object"
  );

  if (settings.length > 0) {
    appendLine("environment:");
    await block(async () => {
      for (const [key, value] of settings) {
        if (key.startsWith("ENV:")) {
          appendLine(`${key.slice("ENV:".length)}: ${value}`);
        }
      }
    });
  }
};

export const getDockerfileExtensions: Driver["getDockerfileExtensions"] = (
  place,
  services
) => {
  if (place === "afterRunner") {
    return Object.values(services ?? {})
      .map((item) =>
        item.settings?.port ? `EXPOSE ${item.settings?.port}` : ""
      )
      .join("\n");
  }
  return "";
};
