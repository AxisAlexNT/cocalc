/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { useState } from "react";
import { Alert, Input } from "antd";
import A from "components/misc/A";
import SiteName from "components/share/site-name";
import { useRouter } from "next/router";

export default function ProxyInput() {
  const router = useRouter();
  const [error, setError] = useState<string>("");

  return (
    <div style={{ margin: "15px 0" }}>
      <A href="https://doc.cocalc.com/share.html">
        Share what you create in <SiteName />
      </A>{" "}
      or paste a URL from anywhere on the web of a notebook, GitHub repo, or
      markdown file:
      <Input.Search
        style={{ marginTop: "10px" }}
        size="large"
        placeholder="URL to notebook or GitHub username or GitHub username/repo or Gist id"
        allowClear
        enterButton="Enter"
        onSearch={(url) => {
          try {
            router.push(urlToProxyURL(url));
          } catch (err) {
            setError(`Please enter a valid URL -- ${err}`);
          }
        }}
      />
      {error && (
        <Alert
          style={{ marginTop: "15px" }}
          type="error"
          message={error}
          showIcon
        />
      )}
    </div>
  );
}

// INPUT: a URL to something on the internet
// OUTPUT: a URL on the share serve (without the http, host stuff)
//         that proxies that input URL.
// The cases we treat are:
//     - gist
//     - github user or repo
//     - general URL fallback, if none of the above apply
function urlToProxyURL(url: string): string {
  const { host, pathname } = new URL(url);
  if (host == new URL(document.URL).host) {
    // URL on this very server - just go to it
    return url;
  } else if (host == "github.com") {
    return `/github${pathname}`;
  } else if (host == "gist.github.com") {
    return `/gist${pathname}`;
  } else {
    return `/url/${host}${pathname}`;
  }
}
