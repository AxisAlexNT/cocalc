/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Checkout -- finalize purchase and pay.
*/

import { Icon } from "@cocalc/frontend/components/icon";
import { money } from "@cocalc/util/licenses/purchase/utils";
import { copy_without as copyWithout, isValidUUID } from "@cocalc/util/misc";
import { Alert, Button, Col, Row, Table } from "antd";
import PaymentMethods from "components/billing/payment-methods";
import A from "components/misc/A";
import Loading from "components/share/loading";
import SiteName from "components/share/site-name";
import apiPost from "lib/api/post";
import useAPI from "lib/hooks/api";
import useIsMounted from "lib/hooks/mounted";
import useCustomize from "lib/use-customize";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";
import { computeCost } from "./compute-cost";
import { describeItem, DisplayCost } from "./site-license-cost";

export default function CheckoutWithCaptcha() {
  const { reCaptchaKey } = useCustomize();
  return (
    <GoogleReCaptchaProvider reCaptchaKey={reCaptchaKey}>
      <Checkout />
    </GoogleReCaptchaProvider>
  );
}

function Checkout() {
  const { reCaptchaKey } = useCustomize();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const router = useRouter();
  const isMounted = useIsMounted();
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string>("");
  const [subTotal, setSubTotal] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  // most likely, user will do the purchase and then see the congratulations page
  useEffect(() => {
    router.prefetch("/store/congrats");
  }, []);

  const cart = useAPI("/shopping/cart/get");

  const items = useMemo(() => {
    if (!cart.result) return undefined;
    const x: any[] = [];
    let subTotal = 0;
    for (const item of cart.result) {
      if (!item.checked) continue;
      item.cost = computeCost(item.description);
      subTotal += item.cost.discounted_cost;
      x.push(item);
    }
    setSubTotal(subTotal);
    return x;
  }, [cart.result]);

  if (cart.error) {
    return <Alert type="error" message={cart.error} />;
  }
  if (!items) {
    return <Loading center />;
  }

  async function placeOrder() {
    try {
      setOrderError("");
      setPlacingOrder(true);
      let reCaptchaToken: undefined | string;
      if (reCaptchaKey) {
        if (!executeRecaptcha) {
          throw Error("Please wait a few seconds, then try again.");
        }
        reCaptchaToken = await executeRecaptcha("checkout");
      }

      // This api call tells the backend, "buy everything in my shopping cart."
      // It succeeds if the purchase goes through.
      await apiPost("/shopping/cart/checkout", { reCaptchaToken });
      // Success!
      if (!isMounted.current) return;
      // If the user is still viewing the page after the purchase happened, we
      // send them to the congrats page, which shows them what they recently purchased,
      // with links about how to use it, etc.
      router.push("/store/congrats");
    } catch (err) {
      // The purchase failed.
      setOrderError(err.message);
    } finally {
      if (!isMounted.current) return;
      setPlacingOrder(false);
    }
  }

  function renderProjectID(project_id: string): JSX.Element | null {
    if (!project_id || !isValidUUID(project_id)) return null;
    return (
      <div>
        For project: <code>{project_id}</code>
      </div>
    );
  }

  const columns = [
    {
      responsive: ["xs" as "xs"],
      render: ({ cost, description, project_id }) => {
        return (
          <div>
            <DescriptionColumn cost={cost} description={description} />
            {renderProjectID(project_id)}
            <div>
              <b style={{ fontSize: "11pt" }}>
                <DisplayCost cost={cost} simple oneLine />
              </b>
            </div>
          </div>
        );
      },
    },
    {
      responsive: ["sm" as "sm"],
      title: "Product",
      align: "center" as "center",
      render: () => (
        <div style={{ color: "darkblue" }}>
          <Icon name="key" style={{ fontSize: "24px" }} />
          <div style={{ fontSize: "10pt" }}>Site License</div>
        </div>
      ),
    },
    {
      responsive: ["sm" as "sm"],
      width: "60%",
      render: (_, { cost, description, project_id }) => (
        <>
          <DescriptionColumn cost={cost} description={description} />{" "}
          {renderProjectID(project_id)}
        </>
      ),
    },
    {
      responsive: ["sm" as "sm"],
      title: "Price",
      align: "right" as "right",
      render: (_, { cost }) => (
        <b style={{ fontSize: "11pt" }}>
          <DisplayCost cost={cost} simple />
        </b>
      ),
    },
  ];

  function placeOrderButton() {
    return (
      <Button
        disabled={subTotal == 0 || placingOrder}
        style={{ marginTop: "7px", marginBottom: "15px" }}
        size="large"
        type="primary"
        onClick={placeOrder}
      >
        {placingOrder ? (
          <Loading delay={0}>Placing Order...</Loading>
        ) : (
          "Place Your Order"
        )}
      </Button>
    );
  }

  function renderOrderError() {
    if (!orderError) return;
    return (
      <Alert
        type="error"
        message={
          <>
            <b>Error placing order:</b> {orderError}
          </>
        }
        style={{ margin: "30px 0" }}
      />
    );
  }

  function emptyCart() {
    return (
      <>
        <h3>
          <Icon name={"shopping-cart"} style={{ marginRight: "5px" }} />
          {cart.result?.length > 0 && (
            <>
              Nothing in Your <SiteName />{" "}
              <A href="/store/cart">Shopping Cart</A> is Selected
            </>
          )}
          {(cart.result?.length ?? 0) == 0 && (
            <>
              Your <SiteName /> <A href="/store/cart">Shopping Cart</A> is Empty
            </>
          )}
        </h3>
        <A href="/store/site-license">Buy a License</A>
      </>
    );
  }

  function nonemptyCart(items) {
    return (
      <>
        {renderOrderError()}
        <Row>
          <Col md={14} sm={24}>
            <div>
              <h3 style={{ fontSize: "16pt" }}>
                <Icon name={"list"} style={{ marginRight: "5px" }} />
                Checkout (<A href="/store/cart">{items.length} items</A>)
              </h3>
              <h4 style={{ fontSize: "13pt", marginTop: "20px" }}>
                1. Payment Method
              </h4>
              <p>
                The default payment method shown below will be used for this
                purchase.
              </p>
              <PaymentMethods startMinimized setTaxRate={setTaxRate} />
            </div>
          </Col>
          <Col md={{ offset: 1, span: 9 }} sm={{ span: 24, offset: 0 }}>
            <div>
              <div
                style={{
                  textAlign: "center",
                  border: "1px solid #ddd",
                  padding: "15px",
                  borderRadius: "5px",
                  minWidth: "300px",
                }}
              >
                {placeOrderButton()}
                <Terms />
                <OrderSummary items={items} taxRate={taxRate} />
                <span style={{ fontSize: "13pt" }}>
                  <TotalCost items={items} taxRate={taxRate} />
                </span>
              </div>
              <GetAQuote items={items} />
            </div>
          </Col>
        </Row>

        <h4 style={{ fontSize: "13pt", marginTop: "15px" }}>
          2. Review Items ({items.length})
        </h4>
        <div style={{ border: "1px solid #eee" }}>
          <Table
            showHeader={false}
            columns={columns}
            dataSource={items}
            rowKey={"id"}
            pagination={{ hideOnSinglePage: true }}
          />
        </div>
        <h4 style={{ fontSize: "13pt", marginTop: "30px" }}>
          3. Place Your Order
        </h4>
        <div style={{ fontSize: "12pt" }}>
          <Row>
            <Col sm={12}>{placeOrderButton()}</Col>
            <Col sm={12}>
              <div style={{ fontSize: "15pt" }}>
                <TotalCost items={cart.result} taxRate={taxRate} />
                <br />
                <Terms />
              </div>
            </Col>
          </Row>
        </div>
      </>
    );
  }

  return (
    <>
      {items.length == 0 && emptyCart()}
      {items.length > 0 && nonemptyCart(items)}
      {renderOrderError()}
    </>
  );
}

function fullCost(items) {
  let full_cost = 0;
  for (const { cost, checked } of items) {
    if (checked) {
      full_cost += cost.cost;
    }
  }
  return full_cost;
}

function discountedCost(items) {
  let discounted_cost = 0;
  for (const { cost, checked } of items) {
    if (checked) {
      discounted_cost += cost.discounted_cost;
    }
  }
  return discounted_cost;
}

function TotalCost({ items, taxRate }) {
  const cost = discountedCost(items) * (1 + taxRate);
  return (
    <>
      Total: <b style={{ float: "right", color: "darkred" }}>{money(cost)}</b>
    </>
  );
}

function OrderSummary({ items, taxRate }) {
  const cost = discountedCost(items);
  const full = fullCost(items);
  const tax = cost * taxRate;
  return (
    <div style={{ textAlign: "left" }}>
      <b style={{ fontSize: "14pt" }}>Order Summary</b>
      <div>
        Items ({items.length}):{" "}
        <span style={{ float: "right" }}>{money(full, true)}</span>
      </div>
      {full - cost > 0 && (
        <div>
          Self-service discount (25%):{" "}
          <span style={{ float: "right" }}>-{money(full - cost, true)}</span>
        </div>
      )}
      <div>
        Estimated tax:{" "}
        <span style={{ float: "right" }}>{money(tax, true)}</span>
      </div>
    </div>
  );
}

function Terms() {
  return (
    <div style={{ color: "#666", fontSize: "10pt" }}>
      By placing your order, you agree to{" "}
      <A href="/policies/terms" external>
        our terms of service
      </A>{" "}
      regarding refunds and subscriptions.
    </div>
  );
}

function DescriptionColumn({ cost, description }) {
  const { input } = cost;
  return (
    <>
      <div style={{ fontSize: "12pt" }}>
        {description.title && (
          <div>
            <b>{description.title}</b>
          </div>
        )}
        {description.description && <div>{description.description}</div>}
        {describeItem({ info: input })}
      </div>
    </>
  );
}

const MIN_AMOUNT = 100;

function GetAQuote({ items }) {
  const router = useRouter();
  const [more, setMore] = useState<boolean>(false);
  let isSub;
  for (const item of items) {
    if (item.description.period != "range") {
      isSub = true;
      break;
    }
  }

  function createSupportRequest() {
    const x: any[] = [];
    for (const item of items) {
      x.push({
        cost: money(item.cost.cost),
        ...copyWithout(item, [
          "account_id",
          "added",
          "removed",
          "purchased",
          "checked",
          "cost",
        ]),
      });
    }
    const body = `Hello,\n\nI would like to request a quote.  I filled out the online form with the\ndetails listed below:\n\n\`\`\`\n${JSON.stringify(
      x,
      undefined,
      2
    )}\n\`\`\``;
    router.push({
      pathname: "/support/new",
      query: {
        hideExtra: true,
        subject: "Request for a quote",
        body,
        type: "question",
      },
    });
  }

  return (
    <div style={{ paddingTop: "15px" }}>
      <A onClick={() => setMore(!more)}>
        Need to obtain a quote, invoice, modified terms, a purchase order, to
        use PayPal or pay via wire transfer, etc.?
      </A>
      {more && (
        <div>
          {fullCost(items) <= MIN_AMOUNT || isSub ? (
            <Alert
              showIcon
              style={{
                margin: "15px 0",
                fontSize: "12pt",
                borderRadius: "5px",
              }}
              type="warning"
              message={
                <>
                  Customized payment is available only for{" "}
                  <b>non-subscription purchases over ${MIN_AMOUNT}</b>. Make
                  sure your cost before tax and discounts is over ${MIN_AMOUNT}{" "}
                  and <A href="/store/cart">convert</A> any subscriptions in
                  your cart to explicit date ranges, then try again. If this is
                  confusing, <A href="/support/new">make a support request</A>.
                </>
              }
            />
          ) : (
            <Alert
              showIcon
              style={{
                margin: "15px 0",
                fontSize: "12pt",
                borderRadius: "5px",
              }}
              type="info"
              message={
                <>
                  Click the button below to copy your shopping cart contents to
                  a support request, and we will take if from there. Note that
                  the 25% self-service discount is <b>only available</b> when
                  you purchase from this page.
                  <div style={{ textAlign: "center", marginTop: "5px" }}>
                    <Button onClick={createSupportRequest}>
                      <Icon name="medkit" /> Copy cart to support request
                    </Button>
                  </div>
                </>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
