import { StripeClient } from "@cocalc/server/stripe/client";
import { isValidUUID } from "@cocalc/util/misc";
import { InvoicesData } from "@cocalc/util/types/stripe";

export default async function getInvoicesAndReceipts(
  account_id: string
): Promise<InvoicesData> {
  if (!isValidUUID(account_id)) {
    throw Error("invalid uuid");
  }
  const stripe = new StripeClient({ account_id });
  if (!(await stripe.get_customer_id())) {
    return {};
  }
  const mesg = await stripe.mesg_get_invoices({});
  return mesg.invoices;
}
