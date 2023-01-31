/* Create the TCP server that communicates with hubs */

import { callback } from "awaiting";
import { writeFile } from "node:fs";
import { createServer } from "node:net";
import * as uuid from "uuid";

import enableMessagingProtocol, { CoCalcSocket } from "@cocalc/backend/tcp/enable-messaging-protocol";
import { unlockSocket } from "@cocalc/backend/tcp/locked-socket";
import * as client from "@cocalc/project/client";
import { hubPortFile } from "@cocalc/project/data";
import { options } from "@cocalc/project/init-program";
import { getLogger } from "@cocalc/project/logger";
import { secretToken } from "@cocalc/project/servers/secret-token";
import { once } from "@cocalc/util/async-utils";
import handleMessage from "./handle-message";

const winston = getLogger("hub-tcp-server");

export default async function init(): Promise<void> {
  if (!secretToken || secretToken.length < 16) {
    // being extra careful since security
    throw Error("secret token must be defined and at least 16 characters");
    return;
  }

  winston.info("starting tcp server: project <--> hub...");
  const server = createServer(handleConnection);
  server.listen(options.hubPort, options.hostname);
  await once(server, "listening");
  const address = server.address();
  if (address == null || typeof address == "string") {
    // null = failed; string doesn't happen since that's for unix domain
    // sockets, which we aren't using.
    // This is probably impossible, but it makes typescript happier.
    throw Error("failed to assign a port");
  }
  const { port } = address;
  winston.info(`hub tcp_server listening ${options.hostname}:${port}`);
  await callback(writeFile, hubPortFile, `${port}`);
}


async function handleConnection(socket: CoCalcSocket) {
  winston.info(`*new* connection from ${socket.remoteAddress}`);
  socket.on("error", (err) => {
    winston.error(`socket '${socket.remoteAddress}' error - ${err}`);
  });
  socket.on("close", () => {
    winston.info(`*closed* connection from ${socket.remoteAddress}`);
  });

  try {
    await unlockSocket(socket, secretToken);
  } catch (err) {
    winston.error(
      "failed to unlock socket -- ignoring any future messages and closing connection"
    );
    socket.destroy(new Error("invalid secret token"));
    return;
  }

  socket.id = uuid.v4();
  socket.heartbeat = new Date(); // obviously working now
  enableMessagingProtocol(socket);

  socket.on("mesg", (type, mesg) => {
    client.client?.active_socket(socket); // record that this socket is active now.
    if (type === "json") {
      // non-JSON types are handled elsewhere, e.g., for sending binary data.
      // I'm not sure that any other message types are actually used though.
      // winston.debug("received json mesg", mesg);
      handleMessage(socket, mesg);
    }
  });
}
