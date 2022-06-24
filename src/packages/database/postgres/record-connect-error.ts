/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import getLogger from "@cocalc/backend/logger";
import { newGauge } from "../metrics";
import { PostgreSQL } from "./types";
const connectStatus = newGauge(
  "db_latest_connection_ts_total",
  "Last time the connect/disconnect event was emitted",
  ["status"]
);

const L = getLogger("db:record-connect-error");

// timestamp when the *first* disconnect event happend
// a "connect" event will reset this to null
let lastDisconnected: number | null = null;

function recordDisconnected() {
  L.debug("disconnected");
  const now = Date.now();
  connectStatus.labels("disconnected").set(now);
  if (lastDisconnected == null) {
    lastDisconnected = now;
  }
}

function recordConnected() {
  L.debug("connected");
  connectStatus.labels("connected").set(Date.now());
  lastDisconnected = null;
}

export function setupRecordConnectErrors(db: PostgreSQL) {
  db.on("connect", () => recordConnected());
  db.on("disconnect", () => recordDisconnected());
}

export function howLongDisconnectedMins(): number | undefined {
  if (lastDisconnected == null) {
    return undefined;
  } else {
    const last = lastDisconnected;
    const now = Date.now();
    const dtMin = (now - last) / 1000 / 60;
    return dtMin;
  }
}
