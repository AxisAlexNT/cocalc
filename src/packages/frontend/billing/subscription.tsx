/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Alert, Button, ButtonToolbar, Col, Row } from "react-bootstrap";
import {
  stripeAmount,
  stripeDate,
  planInterval,
  capitalize,
} from "@cocalc/util/misc";
import { A } from "../components";
import {
  CSS,
  React,
  useActions,
  useState,
  useIsMountedRef,
  useTypedRedux,
} from "../app-framework";
const { HelpEmailLink } = require("../customize");
import { Subscription as StripeSubscription } from "./types";

interface Props {
  subscription: StripeSubscription;
  style?: CSS;
}

export const Subscription: React.FC<Props> = ({ subscription, style }) => {
  const [confirm_cancel, set_confirm_cancel] = useState(false);
  const [canceling, set_canceling] = useState(false);
  const invoices = useTypedRedux("billing", "invoices");
  const actions = useActions("billing");
  const is_mounted_ref = useIsMountedRef();

  function render_description(): JSX.Element | undefined {
    // if this invoice for this subscription is available in the browser (since loaded, and recent enough),
    // use it to provide a nice description of what was paid for most recently by this subscription.
    if (invoices == null) return;
    const invoice_id = subscription.latest_invoice;
    if (invoice_id == null) return;
    for (const invoice of invoices.get("data")) {
      if (invoice.get("id") == invoice_id) {
        // got it
        const cnt = invoice.getIn(["lines", "total_count"]) ?? 0; // always 1 for subscription?
        const url = invoice.get("hosted_invoice_url");
        return (
          <div>
            {invoice.getIn(["lines", "data", 0, "description"])}
            {cnt > 1 ? ", etc. " : " "}
            {url && (
              <div>
                <A href={url}>Invoice...</A>
              </div>
            )}
          </div>
        );
      }
    }
  }

  function render_cancel_at_end_or_price(): JSX.Element {
    if (subscription.cancel_at_period_end) {
      return <div>Will cancel at period end.</div>;
    } else {
      return <div>{render_price()}</div>;
    }
  }

  function render_price(): JSX.Element {
    return (
      <span>
        {stripeAmount(subscription.plan.amount, subscription.plan.currency)} for{" "}
        {planInterval(
          subscription.plan.interval,
          subscription.plan.interval_count
        )}
      </span>
    );
  }

  function render_info(): JSX.Element {
    const sub = subscription;
    const cancelable = !(
      sub.cancel_at_period_end ||
      canceling ||
      confirm_cancel
    );
    return (
      <Row style={{ paddingBottom: "5px", paddingTop: "5px" }}>
        <Col md={5}>{render_description()}</Col>
        <Col md={2}>{capitalize(sub.status)}</Col>
        <Col md={4} style={{ color: "#666" }}>
          {stripeDate(sub.current_period_start)} –{" "}
          {stripeDate(sub.current_period_end)} (start: {stripeDate(sub.created)}
          ){render_cancel_at_end_or_price()}
        </Col>
        <Col md={1}>
          {cancelable ? (
            <Button
              style={{ float: "right" }}
              disabled={canceling}
              onClick={() => set_confirm_cancel(true)}
            >
              {canceling ? "Canceling..." : "Cancel..."}
            </Button>
          ) : (
            <Button style={{ float: "right" }} disabled={true}>
              Canceled
            </Button>
          )}
        </Col>
      </Row>
    );
  }

  function render_confirm(): JSX.Element | undefined {
    if (!confirm_cancel) {
      return;
    }
    // These buttons are not consistent with other button language. The
    // justification for this is use of "Cancel" a subscription.
    return (
      <Alert>
        <Row
          style={{
            borderBottom: "1px solid #999",
            paddingBottom: "15px",
            paddingTop: "15px",
          }}
        >
          <Col md={6}>
            Are you sure you want to cancel this subscription? If you cancel
            your subscription, it will run to the end of the subscription
            period, but will not be renewed when the current (already paid for)
            period ends. If you need further clarification or need a refund,
            email <HelpEmailLink />.
          </Col>
          <Col md={6}>
            <ButtonToolbar>
              <Button
                style={{ marginBottom: "5px" }}
                onClick={() => set_confirm_cancel(false)}
              >
                Make no change
              </Button>
              <Button
                bsStyle="danger"
                onClick={async () => {
                  set_confirm_cancel(false);
                  set_canceling(true);
                  await actions.cancel_subscription(subscription.id);
                  if (is_mounted_ref.current) {
                    set_canceling(false);
                  }
                }}
              >
                Yes, cancel at period end (do not auto-renew)
              </Button>
            </ButtonToolbar>
          </Col>
        </Row>
      </Alert>
    );
  }

  return (
    <div
      style={{
        ...{
          borderBottom: "1px solid #999",
          padding: "5px 0",
        },
        ...style,
      }}
    >
      {render_info()}
      {render_confirm()}
    </div>
  );
};
