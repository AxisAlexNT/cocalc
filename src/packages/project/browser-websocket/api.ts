/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
 * License
 */

// Websocket based request/response api.
//
// All functionality here is of the form:
//
//  -- one request
//  -- one response

// This require is just because typescript is confused by
// the path for now.  Growing pains.
const { callback_opts } = require("@cocalc/util/async-utils");

import { browser_symmetric_channel } from "./symmetric_channel";
import { canonical_paths } from "./canonical-path";
import { eval_code } from "./eval-code";
import { terminal } from "../terminal/server";
import { lean, lean_channel } from "../lean/server";
import { nbgrader } from "../nbgrader/api";
import { jupyter_strip_notebook } from "../nbgrader/jupyter-parse";
import { jupyter_run_notebook } from "../nbgrader/jupyter-run";
import { nbconvert as jupyter_nbconvert } from "../jupyter/convert";
import { x11_channel } from "../x11/server";
import { synctable_channel } from "../sync/server";
import { syncdoc_call } from "../sync/sync-doc";
import { get_configuration } from "../configuration";
import { delete_files } from "./delete-files";
import { rename_file, move_files } from "./move-files";
import { realpath } from "./realpath";
import { project_info_ws } from "../project-info";
import { Mesg } from "@cocalc/frontend/project/websocket/types";
import { reuseInFlight } from "async-await-utils/hof";

import { getLogger } from "@cocalc/project/logger";
const winston = getLogger("websocket-api");

let primus: any = undefined;
export function init_websocket_api(_primus: any): void {
  primus = _primus;
  primus.plugin("responder", require("primus-responder"));

  primus.on("connection", function (spark) {
    // Now handle the connection
    winston.debug(`new connection from ${spark.address.ip} -- ${spark.id}`);

    spark.on("request", async function (data, done) {
      winston.debug("primus-api", "request", JSON.stringify(data), "REQUEST");
      const t0 = new Date().valueOf();
      try {
        const resp = await handleApiCall(data);
        //winston.debug("primus-api", "response", resp);
        done(resp);
      } catch (err) {
        // put this in for debugging...
        // It's normal to sometimes get errors, e.g., when a Jupyter kernel
        // isn't yet available.
        // console.trace(); winston.debug("primus-api error stacktrack", err.stack, err);
        done({ error: err.toString(), status: "error" });
      }
      winston.debug(
        "primus-api",
        "request",
        JSON.stringify(data),
        `FINISHED: time=${new Date().valueOf() - t0}ms`
      );
    });
  });

  primus.on("disconnection", function (spark) {
    winston.debug(
      "primus-api",
      `end connection from ${spark.address.ip} -- ${spark.id}`
    );
  });
}

import { run_formatter, run_formatter_string } from "../formatters";
const theClient = require("@cocalc/project/client");

async function handleApiCall0(data: Mesg): Promise<any> {
  const { client } = theClient;
  switch (data.cmd) {
    case "listing":
      return await listing(data.path, data.hidden);
    case "delete_files":
      return await delete_files(data.paths, winston);
    case "move_files":
      return await move_files(data.paths, data.dest, winston);
    case "rename_file":
      return await rename_file(data.src, data.dest, winston);
    case "canonical_paths":
      return await canonical_paths(data.paths);
    case "configuration":
      return await get_configuration(data.aspect, data.no_cache);
    case "prettier": // deprecated
    case "formatter":
      return await run_formatter(client, data.path, data.options, winston);
    case "prettier_string": // deprecated
    case "formatter_string":
      return await run_formatter_string(
        data.path,
        data.str,
        data.options,
        winston
      );
    case "jupyter":
      return await jupyter(data.path, data.endpoint, data.query);
    case "exec":
      return await exec(data.opts);
    case "eval_code":
      return eval_code(data.code);
    case "terminal":
      return await terminal(primus, winston, data.path, data.options);
    case "lean":
      return await lean(client, primus, winston, data.opts);
    case "nbgrader":
      return await nbgrader(client, winston, data.opts);
    case "jupyter_strip_notebook":
      return await jupyter_strip_notebook(data.ipynb_path);
    case "jupyter_nbconvert":
      return await jupyter_nbconvert(data.opts);
    case "jupyter_run_notebook":
      return await jupyter_run_notebook(winston, data.opts);
    case "lean_channel":
      return await lean_channel(client, primus, winston, data.path);
    case "x11_channel":
      return await x11_channel(
        client,
        primus,
        winston,
        data.path,
        data.display
      );
    case "synctable_channel":
      return await synctable_channel(
        client,
        primus,
        winston,
        data.query,
        data.options
      );
    case "syncdoc_call":
      return await syncdoc_call(data.path, winston, data.mesg);
    case "symmetric_channel":
      return await browser_symmetric_channel(
        client,
        primus,
        winston,
        data.name
      );
    case "realpath":
      return realpath(data.path);
    case "project_info":
      return await project_info_ws(primus, winston);
    default:
      throw Error(
        `command "${
          (data as any).cmd
        }" not implemented -- restart your project (in Project --> Settings)`
      );
  }
}
const handleApiCall = reuseInFlight(handleApiCall0);

/* implementation of the api calls */

import { get_listing } from "../directory-listing";
import { DirectoryListingEntry } from "@cocalc/util/types";
async function listing(
  path: string,
  hidden?: boolean
): Promise<DirectoryListingEntry[]> {
  return await get_listing(path, hidden);
}

import { handle_request as jupyter } from "../jupyter/websocket-api";

// Execute code
const { execute_code } = require("@cocalc/backend/misc_node");
interface ExecuteOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}
export async function exec(opts: any): Promise<ExecuteOutput> {
  return await callback_opts(execute_code)(opts);
}
