/*
 *  This file is part of CoCalc: Copyright © 2021 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import A from "components/misc/A";
import Logo from "components/logo-rectangular";
import { Layout } from "antd";
import { useCustomize } from "lib/customize";
import Contact from "./contact";

function Item({
  first,
  children,
}: {
  first?: boolean;
  children: string | JSX.Element;
}) {
  if (first) return <>{children}</>;
  return (
    <>
      &nbsp;{" – "}&nbsp;{children}
    </>
  );
}

export default function Footer() {
  const {
    siteName,
    organizationName,
    organizationURL,
    termsOfServiceURL,
    contactEmail,
    landingPages,
    zendesk,
    imprint,
    policies,
    onCoCalcCom,
  } = useCustomize();

  function organization(): JSX.Element {
    if (organizationURL) {
      return <A href={organizationURL}>{organizationName}</A>;
    } else {
      return <>{organizationName}</>;
    }
  }

  function renderOrganization() {
    if (!organizationName) return null;
    return <Item>{organization()}</Item>;
  }

  return (
    <Layout.Footer
      style={{
        textAlign: "center",
        borderTop: "1px solid lightgrey",
        backgroundColor: "white",
      }}
    >
      <div>
        <Item first>{siteName ?? "CoCalc"}</Item>
        {onCoCalcCom && <Item>
          <A href="https://about.cocalc.com/">About</A>
        </Item>}
        <Item>
          <A href="https://cocalc.com">CoCalc</A>
        </Item>
        {renderOrganization()}
        {!landingPages && termsOfServiceURL && (
          <Item>
            <A href={termsOfServiceURL}>Terms of Service</A>
          </Item>
        )}
        {contactEmail && (
          <Item>
            <Contact showEmail={false} />
          </Item>
        )}
        {zendesk && (
          <Item>
            <A href="/support/new">Support Ticket</A>
          </Item>
        )}
        {imprint && (
          <Item>
            <A href="/policies/imprint">Imprint</A>
          </Item>
        )}
        {policies && (
          <Item>
            <A href="/policies/policies">Policies</A>
          </Item>
        )}
        <Item>
          <A href="/info/status">Status</A>
        </Item>
      </div>
      <br />
      <div>
        <Logo style={{ height: "40px", width: "40px" }} />
      </div>
    </Layout.Footer>
  );
}
