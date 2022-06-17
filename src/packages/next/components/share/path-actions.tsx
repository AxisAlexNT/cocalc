/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import Link from "next/link";
import ExternalLink from "./external-link";
import rawURL from "lib/share/raw-url";
import downloadURL from "lib/share/download-url";
import { r_join } from "@cocalc/frontend/components/r_join";
import SiteName from "./site-name";
import Edit from "./edit";

interface Props {
  id: string;
  path: string;
  relativePath: string;
  isDir?: boolean;
  exclude?: Set<string>;
  project_id: string;
  image?: string;
  description?: string;
}

export default function PathActions({
  id,
  path,
  relativePath,
  isDir,
  exclude,
  project_id,
  image,
  description,
}: Props) {
  const include = (action: string) => !exclude?.has(action);
  const v: JSX.Element[] = [];
  if (include("hosted")) {
    v.push(
      <Link key="hosted" href={`/share/public_paths/${id}`}>
        <a>
          Hosted by <SiteName />
        </a>
      </Link>
    );
  }
  if (include("raw")) {
    v.push(
      <ExternalLink key="raw" href={rawURL({ id, path, relativePath })}>
        Raw
      </ExternalLink>
    );
  }
  if (include("embed")) {
    v.push(
      <Link
        key="embed"
        href={`/share/public_paths/embed/${id}${
          relativePath ? "/" + relativePath : ""
        }`}
      >
        <a>Embed</a>
      </Link>
    );
  }
  if (!isDir && include("download")) {
    v.push(
      <a key="download" href={downloadURL(id, path, relativePath)}>
        Download
      </a>
    );
  }
  if (include("edit")) {
    v.push(
      <Edit
        key="edit"
        id={id}
        isDir={isDir}
        path={path}
        relativePath={relativePath}
        image={image}
        project_id={project_id}
        description={description}
      />
    );
  }

  return r_join(v, " | ");
}
