/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Icon } from "@cocalc/frontend/components/icon";
import { Uptime } from "@cocalc/util/consts/site-license";
import { Button } from "antd";
import { useRouter } from "next/router";

export interface StoreConf {
  run_limit: number;
  disk: number;
  ram: number;
  cpu: number;
  user: "academic" | "business";
  start?: Date;
  end?: Date;
  uptime: Uptime;
}

interface Props {
  conf: StoreConf;
}

const STYLE: React.CSSProperties = {
  fontSize: "150%",
  fontWeight: "bold",
  textAlign: "center",
  marginTop: "30px",
} as const;

export function LinkToStore(props: Props) {
  const { conf } = props;

  const router = useRouter();

  const params = Object.entries(conf)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const url = `/store/site-license?${params}`;

  return (
    <div style={STYLE}>
      <Button
        size={"large"}
        type={"default"}
        onClick={() => router.push(url)}
        icon={<Icon name="shopping-cart" />}
      >
        Select
      </Button>
    </div>
  );
}
