/*
 *  This file is part of CoCalc: Copyright © 2022 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { PoweroffOutlined } from "@ant-design/icons";
import { React, useTypedRedux } from "@cocalc/frontend/app-framework";
import { A, NoWrap, QuestionMarkText, Tip } from "@cocalc/frontend/components";
import { DOC_CLOUD_STORAGE_URL } from "@cocalc/util/consts/project";
import { PROJECT_UPGRADES } from "@cocalc/util/schema";
import { COLORS } from "@cocalc/util/theme";
import { upgrade2quota_key, Upgrades } from "@cocalc/util/upgrades/quota";
import { Table, Typography } from "antd";
import { Project } from "../types";
import { renderBoolean } from "./components";
import {
  useCurrentUsage,
  useDisplayedFields,
  useMaxUpgrades,
  useRunQuota,
} from "./hooks";
import {
  booleanValueStr,
  QuotaData,
  QUOTAS_BOOLEAN,
  RunQuotaType,
  SHOW_MAX,
  Usage,
  Value,
} from "./misc";

const { Text } = Typography;
const PARAMS = PROJECT_UPGRADES.params;

const INFINITY_CHAR = "∞";

interface Props {
  project_id: string;
  project_state?: "opened" | "running" | "starting" | "stopping";
  project: Project;
}

export const RunQuota: React.FC<Props> = React.memo((props: Props) => {
  const { project_id, project_state /* project */ } = props;
  //const projectStatus = project.get("status");
  const currentUsage = useCurrentUsage({ project_id });
  const is_commercial = useTypedRedux("customize", "is_commercial");
  const runQuota = useRunQuota(project_id, project_state === "running");
  const maxUpgrades = useMaxUpgrades();
  const displayedFields = useDisplayedFields();

  function quotaValue(key: keyof RunQuotaType): Value {
    const val = runQuota[key];
    if (val == null) return "N/A";
    return val;
  }

  function displayedName(name: keyof Upgrades): string {
    if (name === "cores") return "CPU";
    if (name === "memory") return "Memory";
    return PARAMS[name]?.display ?? name;
  }

  function getMaxDedicated(name: keyof Upgrades) {
    if (name === "memory") return maxUpgrades?.["memory_request"] ?? "N/A";
    if (name === "cores") return maxUpgrades?.["cpu_shares"] ?? "N/A";
  }

  function getQuotaDedicated(name: keyof Upgrades) {
    if (name === "memory") return quotaValue("memory_request");
    if (name === "cores") return quotaValue("cpu_request");
  }

  const data: QuotaData[] = React.useMemo(() => {
    const ar = !!runQuota.always_running;
    return displayedFields.map((name: keyof Upgrades): QuotaData => {
      const key = upgrade2quota_key(name);
      return {
        key,
        display: displayedName(name),
        desc: PARAMS[name]?.desc ?? "",
        quota: key == "idle_timeout" && ar ? INFINITY_CHAR : quotaValue(key),
        quotaDedicated: getQuotaDedicated(name),
        maximum: maxUpgrades?.[name] ?? "N/A",
        maxDedicated: getMaxDedicated(name),
        usage: project_state === "running" ? currentUsage?.[key] : undefined,
      };
    });
  }, [runQuota, currentUsage, maxUpgrades, project_state === "running"]);

  function renderExtraMaximum(record: QuotaData) {
    if (SHOW_MAX.includes(record.key)) {
      return (
        <>
          The maximum possible quota is {record.maximum}
          {record.maxDedicated != null && (
            <>, of which {record.maxDedicated} could be dedicated</>
          )}
          .
        </>
      );
    }
  }

  function renderExtraExplanation(record: QuotaData) {
    const dedicatedVM = (
      <>
        If you need more RAM or CPU, consider upgrading to a{" "}
        <A href={"https://cocalc.com/pricing/dedicated"}>Dedicated VM</A>.
      </>
    );

    const dedicatedDisk = (
      <>
        It is possible to rent a{" "}
        <A href={"https://cocalc.com/pricing/dedicated"}>Dedicated Disk</A> for
        much more storage, or attach{" "}
        <A href={DOC_CLOUD_STORAGE_URL}>files hosted online</A>.
      </>
    );

    const idleTimeoutInfo = (
      <>
        To increase the idle timeout, either purchase a new license with a
        larger timeout period or the "always running" quota.
      </>
    );

    switch (record.key) {
      case "memory_request":
      case "memory_limit":
      case "cpu_limit":
      case "cpu_request":
        return is_commercial ? dedicatedVM : <></>;
      case "disk_quota":
        return is_commercial ? dedicatedDisk : <></>;
      case "idle_timeout":
        // special case: if we have always running, don't tell the user to increase idle timeout (stupid)
        return record.quota != INFINITY_CHAR ? idleTimeoutInfo : "";
      default:
        return <></>;
    }
  }

  function renderQuotaValue(record: QuotaData) {
    const { key, quota, quotaDedicated, usage } = record;
    if (QUOTAS_BOOLEAN.includes(key as any)) {
      return `This quota is ${booleanValueStr(quota)}.`;
    } else {
      const curStr =
        usage != null
          ? `Usage right now is ${usage.display} with a quota limit of ${quota}`
          : `The quota limit is ${quota}`;
      const dediStr =
        quotaDedicated != null
          ? `, of which ${quotaDedicated} are dedicated to this project.`
          : ".";
      return `${curStr}${dediStr}`;
    }
  }

  function renderExtra(record: QuotaData) {
    return (
      <>
        {record.desc} {renderQuotaValue(record)} {renderExtraMaximum(record)}{" "}
        {renderExtraExplanation(record)}
      </>
    );
  }

  function renderUsage(record: QuotaData) {
    if (project_state != "running") return;
    // the usage of a boolean quota is always the same as its value
    if (QUOTAS_BOOLEAN.includes(record.key as any)) return;
    const usage: Usage = record.usage;
    if (usage == null) return;
    const { element } = usage;
    // wrapped in "Text", because that works better with the table layout
    return <NoWrap>{element}</NoWrap>;
  }

  function renderQuotaLimit(record: QuotaData) {
    if (project_state != "running") {
      return (
        <Tip
          tip={`The project is currently not running. Start the project to see the effective quotas.`}
        >
          <PoweroffOutlined style={{ color: COLORS.GRAY_L }} />
        </Tip>
      );
    }

    const val = record["quota"];

    if (record.key === "idle_timeout" && val === "&infin;") {
      return (
        <QuestionMarkText tip="If the project stops or the underlying VM goes into maintenance, the project will automatically restart.">
          &infin;
        </QuestionMarkText>
      );
    }

    if (typeof val === "boolean") {
      return renderBoolean(val);
    } else if (typeof val === "number") {
      if (record.key === "idle_timeout") {
        return val;
      }
    } else {
      return (
        <Text strong={true}>
          <NoWrap>{val}</NoWrap>
        </Text>
      );
    }
  }

  function renderQuotas() {
    return (
      <Table<QuotaData>
        dataSource={data}
        size="small"
        pagination={false}
        rowClassName={() => "cursor-pointer"}
        expandable={{
          expandedRowRender: (record) => renderExtra(record),
          expandRowByClick: true,
        }}
      >
        <Table.Column<QuotaData>
          key="key"
          title={
            <QuestionMarkText tip="Name of the quota. Click on a row to expand details.">
              Name
            </QuestionMarkText>
          }
          render={(text) => <NoWrap>{text}</NoWrap>}
          dataIndex="display"
          width={"30%"}
        />
        <Table.Column<QuotaData>
          key="key"
          title={
            <QuestionMarkText tip="Current setting or active usage.">
              Usage
            </QuestionMarkText>
          }
          dataIndex="key"
          render={(_, record) => renderUsage(record)}
          width={"45%"}
          align={"left"}
        />
        <Table.Column<QuotaData>
          key="key"
          title={
            <QuestionMarkText tip="Usage limit imposed by the current quota configuration. Add a license to change this limit or adjust your quota upgrade contribution. Project needs to run in order to see the effective runtime quota.">
              Value
            </QuestionMarkText>
          }
          dataIndex="limit"
          render={(_, record) => renderQuotaLimit(record)}
          width={"25%"}
          align={"right"}
        />
      </Table>
    );
  }

  return <div>{renderQuotas()}</div>;
});
