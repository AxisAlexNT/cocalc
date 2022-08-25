/*
Set default payment source for signed in customer.
*/

import createPaymentMethod from "@cocalc/server/billing/create-payment-method";
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
    throw Error("must be signed in to create payment method");
  }
  const { id } = getParams(req);
  if (!id) {
    throw Error("must specify the token id");
  }
  await createPaymentMethod(account_id, id);
  return { success: true };
}
