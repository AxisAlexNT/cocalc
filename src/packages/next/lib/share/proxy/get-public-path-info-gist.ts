/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import fetch from "node-fetch";
import { RAW_MAX_SIZE_BYTES } from "./api";

export default async function getPublicPathInfoGist(
  url: string // 'gist/user/gistId'
) {
  const v = url.split("/");
  if (v.length < 3) {
    throw Error(`invalid gist url - "${url}"`);
  }
  const [_, user, gistId] = v;
  const rawUrl = `https://gist.githubusercontent.com/${user}/${gistId}/raw/`;
  const content = await (await fetch(rawUrl, { size: RAW_MAX_SIZE_BYTES })).text();
  return {
    contents: { content, size: content.length },
    relativePath: "",
    projectTitle: `${user}'s GitHub Gists -- https://gist.github.com/${user}`,
    githubOrg: user,
  };
}
