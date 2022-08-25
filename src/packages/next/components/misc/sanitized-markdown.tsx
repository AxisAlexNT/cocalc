/*
 *  This file is part of CoCalc: Copyright © 2021 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { CSSProperties } from "react";
import { FileContext } from "@cocalc/frontend/lib/file-context";
import Markdown from "@cocalc/frontend/editors/slate/static-markdown";
import A from "components/misc/A";

export default function SanitizedMarkdown({
  style,
  value,
}: {
  style?: CSSProperties;
  value: string;
}) {
  const ctx = {
    AnchorTagComponent: A,
    noSanitize: false,
  };
  return (
    <FileContext.Provider value={ctx}>
      <Markdown value={value} style={style} />
    </FileContext.Provider>
  );
}
