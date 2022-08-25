/*
 *  This file is part of CoCalc: Copyright © 2021 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Layout } from "antd";
import Footer from "components/landing/footer";
import A from "components/misc/A";
import SquareLogo from "components/logo-square";
import Header from "components/landing/header";
import Content from "components/landing/content";
import withCustomize from "lib/with-customize";
import { Customize } from "lib/customize";
import Head from "components/landing/head";
import { join } from "path";
import basePath from "lib/base-path";
import screenshot from "public/cocalc-screenshot-20200128-nq8.png";
import Path from "components/app/path";
import PublicPaths from "components/share/public-paths";
import getAccountId from "lib/account/get-account";
import getPool, { timeInSeconds } from "@cocalc/database/pool";

const topLinkStyle = { marginRight: "20px" };

export default function Home({ customize, publicPaths }) {
  const {
    shareServer,
    siteName,
    siteDescription,
    organizationName,
    organizationURL,
    splashImage,
    indexInfo,
    sandboxProjectId,
    onCoCalcCom,
  } = customize;

  function renderAboveImage() {
    return (
      <>
        {sandboxProjectId && (
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ textAlign: "center", color: "#666" }}>
              The Public {siteName} Sandbox
            </h3>
            <Path
              style={{ marginRight: "15px", marginBottom: "15px" }}
              project_id={sandboxProjectId}
              description="Public Sandbox"
            />
          </div>
        )}
        {shareServer && onCoCalcCom && (
          <>
            <h3 style={{ textAlign: "center" }}>
              <A href="/share/public_paths/page/1">
                Explore what people have shared using {siteName}!
              </A>
            </h3>
            {publicPaths && (
              <div
                style={{
                  maxHeight: "60vh",
                  overflow: "auto",
                  marginRight: "15px",
                }}
              >
                <PublicPaths publicPaths={publicPaths} />
              </div>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <Customize value={customize}>
      <Head title="Collaborative Calculation" />
      <Layout>
        <Header />
        <Layout.Content style={{ backgroundColor: "white" }}>
          {customize.account && (
            <div
              style={{
                textAlign: "center",
                margin: "30px 0 -15px 0",
                color: "#666",
                fontSize: "30pt",
                fontWeight: 500,
              }}
            >
              Signed in as{" "}
              <A href="/config">
                {`${customize.account.first_name} ${
                  customize.account.last_name
                } ${
                  customize.account.name
                    ? "(@" + customize.account.name + ")"
                    : ""
                }`}
              </A>
              <div style={{ fontSize: "11pt", margin: "15px 0" }}>
                {customize.isCommercial &&
                  customize.account &&
                  !customize.account.is_anonymous && (
                    <>
                      <A href="/store" style={topLinkStyle}>
                        Store
                      </A>{" "}
                      <A href={"/licenses"} style={topLinkStyle}>
                        Licenses
                      </A>{" "}
                      <A href={"/billing"} style={topLinkStyle}>
                        Billing
                      </A>{" "}
                    </>
                  )}
                {customize.account != null && (
                  <>
                    <A
                      href={join(basePath, "projects")}
                      external
                      style={topLinkStyle}
                    >
                      Projects
                    </A>{" "}
                  </>
                )}
                {customize.landingPages && (
                  <>
                    <A href="/features/" style={topLinkStyle}>
                      Features
                    </A>{" "}
                    <A href="/software" style={topLinkStyle}>
                      Software
                    </A>{" "}
                    {customize.isCommercial && (
                      <>
                        <A href="/pricing" style={topLinkStyle}>
                          Pricing
                        </A>{" "}
                      </>
                    )}
                  </>
                )}
                {customize.account != null && (
                  <>
                    <A href={"/config"} style={topLinkStyle}>
                      Config
                    </A>{" "}
                  </>
                )}
                {customize.shareServer && (
                  <>
                    <A style={topLinkStyle} href={"/share/public_paths/page/1"}>
                      Share
                    </A>{" "}
                  </>
                )}
                <>
                  <A style={topLinkStyle} href="/support">
                    Support
                  </A>{" "}
                  <A style={topLinkStyle} href="/info/status">
                    Status
                  </A>{" "}
                  <A style={topLinkStyle} href="https://doc.cocalc.com">
                    Docs
                  </A>
                </>
              </div>
            </div>
          )}
          <Content
            logo={<SquareLogo style={{ width: "120px", height: "120px" }} />}
            title={siteName}
            subtitle={siteDescription}
            description={
              <div>
                An instance of <A href="https://cocalc.com">CoCalc</A>{" "}
                {organizationName && organizationURL && (
                  <>
                    hosted by <A href={organizationURL}>{organizationName}</A>
                  </>
                )}
                {onCoCalcCom && (
                  <div style={{ marginTop: "15px" }}>
                    <A href="https://about.cocalc.com">
                      Mission and Features of CoCalc
                    </A>
                    <br />
                    <br />
                    <iframe
                      width="210"
                      height="300"
                      src="https://www.youtube.com/embed/PQ5p92DN0bs"
                      title="YouTube video player"
                      frameBorder={0}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                    <br />
                  </div>
                )}
              </div>
            }
            image={
              sandboxProjectId
                ? undefined
                : splashImage
                ? splashImage
                : screenshot
            }
            aboveImage={renderAboveImage()}
            alt={"Screenshot showing CoCalc in action!"}
            indexInfo={indexInfo}
          />
          <Footer />
        </Layout.Content>
      </Layout>
    </Customize>
  );
}

export async function getServerSideProps(context) {
  const isAuthenticated = (await getAccountId(context.req)) != null;
  const pool = getPool("long");
  const { rows } = await pool.query(
    "select value from server_settings where name='share_server'"
  );
  let publicPaths;
  if (rows.length > 0 && rows[0].value == "yes") {
    const { rows } = await pool.query(
      `SELECT id, path, url, description, ${timeInSeconds("last_edited")},
    counter::INT,
     (SELECT COUNT(*)::INT FROM public_path_stars WHERE public_path_id=id) AS stars
    FROM public_paths
    WHERE vhost IS NULL AND disabled IS NOT TRUE AND unlisted IS NOT TRUE AND
    ((authenticated IS TRUE AND $1 IS TRUE) OR (authenticated IS NOT TRUE))
    ORDER BY stars DESC,last_edited DESC LIMIT $2`,
      [isAuthenticated, 150]
    );
    publicPaths = rows;
  } else {
    publicPaths = null;
  }

  return await withCustomize(
    { context, props: { publicPaths } },
    { name: true }
  );
}
