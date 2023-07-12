/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import getPool, { getClient, getMockPool, getTransactionClient } from "./pool";
export default getPool;
export { getClient, getMockPool, getTransactionClient };
export type { Client, PoolClient } from "pg";

export { timeInSeconds } from "./util";
