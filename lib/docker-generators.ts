import { Driver } from "@startier/ohrid";

export const handleDockerCompose: Driver["handleDockerCompose"] = async ({
  service,
  block,
  appendLine,
  dockerServiceName,
  store,
}) => {
  let settings = Object.entries(service.settings ?? {});
  if (service.settings?.port) {
    appendLine("ports:");
    await block(async () => {
      appendLine(`- "${service.settings?.port}:${service.settings?.port}"`);
    });
  }
  if (service.settings?.hub) {
    if (store.hubImage) {
      throw new Error("More than one hub was defined");
    }
    store.hubService = dockerServiceName;
  } else {
    if (store.hubService && store.hubPort) {
      if (!settings.find((item) => item[0] === "remoteHub")) {
        settings.push([
          "remoteHub",
          `http://${store.hubService}:${store.hubPort}`,
        ]);
      }
    }

    if (store.hubService) {
      appendLine("depends_on:");
      await block(async () => {
        appendLine(`- ${store.hubService}`);
      });
    }
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
        switch (key) {
          case "port":
            appendLine(`PORT: ${value}`);
            store.hubPort = value.toString();
            break;
          case "remoteHub":
            appendLine(`REMOTE_HUB: ${value}`);
            break;
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
