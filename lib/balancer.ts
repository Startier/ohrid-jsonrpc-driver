export interface Balancer<T> {
  connect(key: string, item: T): void;
  disconnect(key: string, item: T): void;
  balance(filter: (item: T) => boolean): T | undefined;
}

export function createBalancer<T>(): Balancer<T> {
  const nodes: Record<string, { items: T[]; requestId: number }> = {};
  return {
    connect(key: string, item: T) {
      if (!nodes[key]) {
        nodes[key] = {
          items: [item],
          requestId: 0,
        };
        return;
      }
      nodes[key].items.push(item);
    },
    disconnect(key: string, item: T) {
      if (nodes[key]) {
        nodes[key].items = nodes[key].items.filter((i) => i !== item);
      }
    },
    balance(filter) {
      let key: string | undefined = undefined;
      for (const [k, value] of Object.entries(nodes)) {
        if (value.items.find(filter)) {
          key = k;
        }
      }

      if (!key) {
        return undefined;
      }

      const store = nodes[key];
      if (store) {
        return store.items[++store.requestId % store.items.length];
      }
    },
  };
}
