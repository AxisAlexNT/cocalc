import "../styles/globals.css";
import "antd/dist/antd.css";
import "@cocalc/cdn/dist/codemirror/lib/codemirror.css";
import "@cocalc/cdn/dist/katex/katex.min.css";

import type { AppProps } from "next/app";
import { Layout, Embed } from "components/layout";

export default function MyApp({ Component, pageProps }: AppProps) {
  if (pageProps.layout == "embed") {
    // e.g., used by embed view
    return (
      <Embed>
        <Component {...pageProps} />
      </Embed>
    );
  }
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
