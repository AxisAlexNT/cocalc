/*
Cancel a subscription for a signed in customer.
*/

import cancelSubscription from "@cocalc/server/billing/cancel-subscription";
import getAccountId from "lib/account/get-account";
import getParams from "lib/api/get-params";

export default async function handle(req, res) {
  try {
    res.json(await cancel(req));
  } catch (err) {
    res.json({ error: `${err.message}` });
    return;
  }
}

async function cancel(req): Promise<{ success: true }> {
  const account_id = await getAccountId(req);
  if (account_id == null) {
    throw Error("must be signed in to set stripe default card");
  }
  const { id } = getParams(req);
  if (!id) {
    throw Error("id of subscription method must be specified");
  }
  await cancelSubscription(account_id, id);
  return { success: true };
}
