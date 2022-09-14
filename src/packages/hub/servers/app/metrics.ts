/*
Express middleware for recording metrics about response time to requests.
*/

import { dirname } from "path";
import { Router } from "express";
const { get, new_histogram } = require("@cocalc/hub/metrics-recorder");
import { join } from "path";
import basePath from "@cocalc/backend/base-path";
import getPool from "@cocalc/database/pool";
import { getLogger } from "@cocalc/hub/logger";

const log = getLogger("metrics");

// initialize metrics
const responseTimeHistogram = new_histogram("http_histogram", "http server", {
  buckets: [0.01, 0.1, 1, 2, 5, 10, 20],
  labels: ["path", "method", "code"],
});

// response time metrics
function metrics(req, res, next) {
  const resFinished = responseTimeHistogram.startTimer();
  const originalEnd = res.end;
  res.end = (...args) => {
    originalEnd.apply(res, args);
    if (!req.path) {
      return;
    }
    const pathSplit = req.path.split("/");
    // for API paths, we want to have data for each endpoint
    const path_tail = pathSplit.slice(pathSplit.length - 3);
    const is_api = path_tail[0] === "api" && path_tail[1] === "v1";
    let path;
    if (is_api) {
      path = path_tail.join("/");
    } else {
      // for regular paths, we ignore the file
      path = dirname(req.path).split("/").slice(0, 2).join("/");
    }
    resFinished({
      path,
      method: req.method,
      code: res.statusCode,
    });
  };
  next();
}

export function setupInstrumentation(router: Router) {
  router.use(metrics);
}

async function isEnabled(pool): Promise<boolean> {
  const {rows} = await pool.query(
    "SELECT value FROM server_settings WHERE name='prometheus_metrics'"
  );
  const enabled = rows.length > 0 && rows[0].value == "yes";
  log.info("isEnabled", enabled);
  return enabled;
}

export function initMetricsEndpoint(router: Router) {
  const endpoint = join(basePath, "metrics");
  log.info("initMetricsEndpoint at ", endpoint);
  // long cache so we can easily check before each response and it is still fast.
  const pool = getPool("long");

  router.get(endpoint, async (_req, res) => {
    res.header("Content-Type", "text/plain");
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    if (!(await isEnabled(pool))) {
      res.json({
        error:
          "Sharing of metrics at /metrics is disabled.  Metrics can be enabled in the site administration page.",
      });
      return;
    }
    const metricsRecorder = get();
    if (metricsRecorder != null) {
      res.send(await metricsRecorder.metrics());
    } else {
      res.json({ error: "Metrics recorder not initialized." });
    }
  });
}
