/*
 *  This file is part of CoCalc: Copyright © 2023 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { COLORS } from "@cocalc/util/theme";
import { Icon } from "../icon";

// unify when a star is rendered with a kernel
export function KernelStar({ priority = 0 }: { priority?: number }) {
  if (priority < 10) return null;

  return (
    <>
      {" "}
      <Icon name="star-filled" style={{ color: COLORS.YELL_L }} />
    </>
  );
}
