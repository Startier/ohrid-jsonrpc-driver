import { Context } from "@startier/ohrid";
import { SocketNode } from "./socket";

export default function terminationProxy(
  node: SocketNode,
  context: Context
): Context {
  return new Proxy(context, {
    set: function <TKey extends keyof Context, TValue extends Context[TKey]>(
      target: Context,
      key: TKey,
      value: TValue
    ) {
      target[key] = value;
      if (key === "exit" && value === true) {
        node.terminate();
      }
      return true;
    },
  });
}
