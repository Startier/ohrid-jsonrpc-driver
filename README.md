# @startier/ohrid-jsonrpc-driver

> A driver for @startier/ohrid that resolves method calls with a server/client architecture using JSON-RPC 2.0 for communication.

## Usage

Install the package using `npm` (or anything compatible):

```sh
npm install @startier/ohrid-jsonrpc-driver
```

Add the driver to `services.json`.

### Global

```json
{
  "driver": "@startier/ohrid-jsonrpc-driver"
}
```

### Service-specific

```json
{
  "services": {
    "example": {
      "driver": "@startier/ohrid-jsonrpc-driver",
      "settings": {}
    }
  }
}
```

## Settings

```ts
{
    hub?: boolean,
    port?: number,
    address?: string,
    transport?: "unix" | "tcp" | "websocket" | "socket.io",
    remoteHub?: string
}
```

### `transport`

The transport layer that will be used by the node.

### `remoteHub`

The server node that the node should connect to.

Different format is needed for different transport:

- `unix`: unix socket file path
- `tcp`: `tcp://host:port`
- `websocket`: `ws://host:port`
- `socket.io`: `http://host:port`

### `hub`

When set to `true` this node will be considered a server and will listen for connections.

- Requires (except for transport: `unix`): `port`
- Requires (for transport: `unix`): `address`

### `port`

The port that gets used when the node is considered a server.

### `address`

The file path that gets used when the node is considered a server and uses `unix` transport.
