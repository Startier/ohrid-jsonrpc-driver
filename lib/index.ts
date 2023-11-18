import { Driver } from "@startier/ohrid";
import {
  getDockerfileExtensions,
  handleDockerCompose,
} from "./docker-generators";
import { createNode } from "./node";

const driver: Driver = {
  handleDockerCompose,
  getDockerfileExtensions,
  createNode,
};

export default driver;
