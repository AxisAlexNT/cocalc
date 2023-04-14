/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

export { SCHEMA } from "./types";
export type {
  DBSchema,
  TableSchema,
  FieldSpec,
  UserOrProjectQuery,
} from "./types";
export type { RenderSpec } from "./render-types";

// The tables
import "./account-creation-actions";
import "./account-profiles";
import "./accounts";
import "./auth";
import "./blobs";
import "./client-error-log";
import "./central-log";
import "./collaborators";
import "./compute-images";
import "./compute-servers";
import "./copy-paths";
import "./crm";
import "./email-counter";
import "./file-access-log";
import "./file-use";
import "./file-use-times";
import "./hub-servers";
import "./instances"; // probably deprecated
import "./jupyter";
import "./listings";
import "./lti";
import "./mentions";
import "./openai";
import "./organizations";
import "./password-reset";
import "./pg-system";
import "./project-info";
import "./project-log";
import "./project-status";
import "./projects";
import "./public-paths";
import "./public-path-stars";
import "./project-invite-tokens";
import "./registration-tokens";
import "./server-settings";
import "./site-licenses";
import "./site-settings";
import "./shopping-cart-items";
import "./stats";
import "./storage-servers";
import "./system-notifications";
import "./syncstring-schema";
import "./tracking";
import "./usage-info";
import "./vouchers";
import "./webapp-errors";
import "./site-whitelabeling";

export {
  DEFAULT_FONT_SIZE,
  NEW_FILENAMES,
  DEFAULT_NEW_FILENAMES,
  DEFAULT_COMPUTE_IMAGE,
  FALLBACK_COMPUTE_IMAGE,
} from "./defaults";

export * from "./operators";
export type { Operator } from "./operators";

export { site_settings_conf } from "./site-defaults";

export { client_db } from "./client-db";
