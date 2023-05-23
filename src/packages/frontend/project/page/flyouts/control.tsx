/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { Button } from "antd";

import {
  Icon,
  IconName,
  Loading,
  Paragraph,
  Title,
} from "@cocalc/frontend/components";
import { RestartProject } from "@cocalc/frontend/project/settings/restart-project";
import { StopProject } from "@cocalc/frontend/project/settings/stop-project";
import { COMPUTE_STATES } from "@cocalc/util/compute-states";
import { useProjectState } from "../project-state-hook";
import { UpgradeUsage } from "@cocalc/frontend/project/settings/upgrade-usage";
import { redux, useTypedRedux } from "@cocalc/frontend/app-framework";
import { Project } from "@cocalc/frontend/project/settings/types";

export function SettingsFlyout(_): JSX.Element {
  const { project_id, wrap } = _;

  const state = useProjectState(project_id);
  const project_map = useTypedRedux("projects", "project_map");
  const project = project_map?.get(project_id);

  // TODO this duplicates a lot with settings/body.tsx → make this one or more hooks

  const projects_store = redux.getStore("projects");
  const {
    get_total_upgrades_you_have_applied,
    get_upgrades_you_applied_to_project,
    get_total_project_quotas,
    get_upgrades_to_project,
  } = projects_store;

  const get_total_upgrades = redux.getStore("account").get_total_upgrades;

  const upgrades_you_can_use = get_total_upgrades();

  const upgrades_you_applied_to_all_projects =
    get_total_upgrades_you_have_applied();
  const upgrades_you_applied_to_this_project =
    get_upgrades_you_applied_to_project(project_id);
  const total_project_quotas = get_total_project_quotas(project_id); // only available for non-admin for now.
  const all_upgrades_to_this_project = get_upgrades_to_project(project_id);
  const store = redux.getStore("projects");
  const site_license_upgrades =
    store.get_total_site_license_upgrades_to_project(project_id);
  const site_license_ids: string[] = store.get_site_license_ids(project_id);
  const dedicated_resources =
    store.get_total_site_license_dedicated(project_id);

  const all_projects_have_been_loaded = useTypedRedux(
    "projects",
    "all_projects_have_been_loaded"
  );

  function renderState() {
    const s = state?.get("state");
    const iconName = COMPUTE_STATES[s]?.icon;
    const str = COMPUTE_STATES[s]?.display ?? s;

    const display = (
      <>
        <Icon name={iconName as IconName} /> {str}
      </>
    );

    switch (
      s as any // TODO: is "pending" a "ProjectStatus"?
    ) {
      case "running":
        return <span style={{ color: "green" }}>{display}</span>;
      case "starting":
        return <span style={{ color: "orange" }}>{display}</span>;
      case "pending":
        return <span style={{ color: "orange" }}>{display}</span>;
      case "stopping":
        return <span style={{ color: "orange" }}>{display}</span>;
      case "closed":
      case "archived":
      case "opened":
        return <span style={{ color: "red" }}>{display}</span>;
      default:
        return <span style={{ color: "red" }}>Unknown</span>;
    }
  }

  function renderStatus(): JSX.Element {
    return (
      <>
        <Title level={4}>
          Status: <span style={{ float: "right" }}>{renderState()}</span>
        </Title>
        <Button.Group>
          <RestartProject project_id={project_id} short={true} />
          <StopProject
            project_id={project_id}
            disabled={state.get("state") !== "running"}
            short={true}
          />
        </Button.Group>
      </>
    );
  }

  function renderUsage(): JSX.Element {
    if (project == null) return <Loading />;

    return (
      <UpgradeUsage
        project_id={project_id}
        project={project as any as Project}
        upgrades_you_can_use={upgrades_you_can_use}
        upgrades_you_applied_to_all_projects={
          upgrades_you_applied_to_all_projects
        }
        upgrades_you_applied_to_this_project={
          upgrades_you_applied_to_this_project
        }
        total_project_quotas={total_project_quotas}
        all_upgrades_to_this_project={all_upgrades_to_this_project}
        all_projects_have_been_loaded={all_projects_have_been_loaded}
        site_license_upgrades={site_license_upgrades}
        site_license_ids={site_license_ids}
        dedicated_resources={dedicated_resources}
        mode="flyout"
      />
    );
  }

  function body(): JSX.Element {
    return (
      <Paragraph style={{ padding: "0 5px 0 5px" }}>
        {renderStatus()}
        <hr />
        {renderUsage()}
      </Paragraph>
    );
  }

  return wrap(body());
}
