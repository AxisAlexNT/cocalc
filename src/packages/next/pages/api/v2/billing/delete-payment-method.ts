/*
Delete a payment method for a signed in customer.
*/

import deletePaymentMethod from "@cocalc/server/billing/delete-payment-method";
import getAccountId from "lib/account/get-account";
import getParams from "lib/api/get-params";

export default async function handle(req, res) {
  try {
    res.json(await set(req));
  } catch (err) {
    res.json({ error: `${err.message}` });
    return;
  }
}

async function set(req): Promise<{ success: true }> {
  const account_id = await getAccountId(req);
  if (account_id == null) {
    throw Error("must be signed in to set stripe default card");
  }
  const { id } = getParams(req);
  if (!id) {
    throw Error("id of payment method must be specified");
  }
  await deletePaymentMethod(account_id, id);
  return { success: true };
}
