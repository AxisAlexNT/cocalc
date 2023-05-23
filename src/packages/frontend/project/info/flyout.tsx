/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

declare let DEBUG;

import { Alert, Table } from "antd";

import {
  ProjectActions,
  React,
  Rendered,
} from "@cocalc/frontend/app-framework";
import { Loading } from "@cocalc/frontend/components";
import { ProjectInfo as WSProjectInfo } from "@cocalc/frontend/project/websocket/project-info";
import {
  Process,
  ProjectInfo as ProjectInfoType,
} from "@cocalc/project/project-info/types";
import { field_cmp } from "@cocalc/util/misc";
import { Channel } from "../websocket/types";
import { CGroup, ProcState, ProjectProblems } from "./components";
import { CGroupInfo, DUState, PTStats, ProcessRow } from "./types";

interface Props {
  wrap?: Function;
  cg_info: CGroupInfo;
  chan: Channel | null;
  render_disconnected: () => JSX.Element | undefined;
  disconnected: boolean;
  disk_usage: DUState;
  error: JSX.Element | null;
  status: string;
  info: ProjectInfoType | undefined;
  loading: boolean;
  modal: string | Process | undefined;
  project_actions: ProjectActions | undefined;
  project_id: string;
  project_state: string | undefined;
  project_status: Immutable.Map<string, any> | undefined;
  pt_stats: PTStats;
  ptree: ProcessRow[] | undefined;
  select_proc: (pids: number[]) => void;
  selected: number[];
  set_expanded: (keys: number[]) => void;
  set_modal: (proc: string | Process | undefined) => void;
  set_selected: (pids: number[]) => void;
  show_explanation: boolean;
  show_long_loading: boolean;
  start_ts: number | undefined;
  sync: WSProjectInfo | null;
  render_cocalc: (proc: ProcessRow) => JSX.Element | undefined;
  render_val: (
    index: string,
    to_str: (val) => Rendered | React.ReactText
  ) => (val: number, proc: ProcessRow) => { props: any; children: any };
}

export function Flyout(_: Readonly<Props>): JSX.Element {
  const {
    wrap,
    cg_info,
    disconnected,
    disk_usage,
    error,
    info,
    loading,
    project_state,
    project_status,
    pt_stats,
    ptree,
    start_ts,
    render_val,
  } = _;

  // mimic a table of processes program like htop – with tailored descriptions for cocalc
  function render_top() {
    if (ptree == null) {
      return null;
    }

    return (
      <Table<ProcessRow>
        dataSource={ptree}
        size={"small"}
        pagination={false}
        style={{
          width: "100%",
          overflowX: "hidden",
          overflowY: "auto",
        }}
        loading={disconnected || loading}
      >
        <Table.Column<ProcessRow>
          key="process"
          title="Process"
          width="50%"
          align={"left"}
          ellipsis={true}
          render={(proc) => (
            <span>
              <ProcState state={proc.state} /> <b>{proc.name}</b>{" "}
              <span>{proc.args}</span>
            </span>
          )}
          sorter={field_cmp("name")}
        />
        <Table.Column<ProcessRow>
          key="cpu_pct"
          title="CPU%"
          width="25%"
          dataIndex="cpu_pct"
          align={"right"}
          render={render_val("cpu_pct", (val) => `${Math.round(val)}%`)}
          sorter={field_cmp("cpu_pct")}
        />
        <Table.Column<ProcessRow>
          key="mem"
          title="MEM"
          dataIndex="mem"
          width="25%"
          align={"right"}
          render={render_val("mem", (val) => `${val.toFixed(0)}M`)}
          sorter={field_cmp("mem")}
        />
      </Table>
    );
  }

  function renderCgroup() {
    return (
      <CGroup
        have_cgroup={info?.cgroup != null}
        cg_info={cg_info}
        disk_usage={disk_usage}
        pt_stats={pt_stats}
        start_ts={start_ts}
        project_status={project_status}
        mode={"flyout"}
        style={{ flex: "1 0 auto", marginBottom: "10px" }}
      />
    );
  }

  function body() {
    return (
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          height: "100%",
        }}
      >
        <ProjectProblems project_status={project_status} />
        {renderCgroup()}
        {wrap ? wrap(render_top()) : render_top()}
      </div>
    );
  }

  function renderError() {
    if (error == null) return;
    return <Alert message={error} type="error" />;
  }

  function notRunning() {
    if (project_state !== "running") {
      return (
        <Alert
          type="warning"
          banner={true}
          message={"Project is not running."}
        />
      );
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {notRunning()}
      {renderError()}
      {body()}
    </div>
  );
}
