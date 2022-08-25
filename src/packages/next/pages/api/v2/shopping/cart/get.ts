/*
Get shopping cart for signed in user.  Can also optionally get everything
ever removed from cart, and also everything ever purchased.
*/

import getCart, { getItem, Item } from "@cocalc/server/shopping/cart/get";
import getAccountId from "lib/account/get-account";
import getParams from "lib/api/get-params";

export default async function handle(req, res) {
  try {
    res.json(await get(req));
  } catch (err) {
    res.json({ error: `${err.message}` });
    return;
  }
}

async function get(req): Promise<Item[] | Item> {
  const account_id = await getAccountId(req);
  if (account_id == null) {
    throw Error("must be signed in to get shopping cart information");
  }
  const { purchased, removed, id } = getParams(req);
  if (id != null) {
    return await getItem({ account_id, id });
  }
  return await getCart({ account_id, purchased, removed });
}
