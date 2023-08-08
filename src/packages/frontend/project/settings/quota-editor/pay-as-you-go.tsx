/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Popconfirm, Tag } from "antd";
import { Icon, Loading } from "@cocalc/frontend/components";
import { webapp_client } from "@cocalc/frontend/webapp-client";
import { PROJECT_UPGRADES } from "@cocalc/util/schema";
import QuotaRow from "./quota-row";
import Information from "./information";
import type { ProjectQuota } from "@cocalc/util/db-schema/purchase-quotas";
import { useRedux, redux, useTypedRedux } from "@cocalc/frontend/app-framework";
import CostPerHour from "./cost-per-hour";
import { getPricePerHour } from "@cocalc/util/purchases/project-quotas";
import { copy_without } from "@cocalc/util/misc";
import { load_target } from "@cocalc/frontend/history";
import DynamicallyUpdatingCost from "@cocalc/frontend/purchases/pay-as-you-go/dynamically-updating-cost";
import track0 from "@cocalc/frontend/user-tracking";
import { User } from "@cocalc/frontend/users";

// when checking user has sufficient credits to run project with
// upgrade, require that they have enough for this many hours.
// Otherwise, it is way too easy to start project with upgrades,
// then have it just stop again an hour or less later, which is
// just annoying.
const MIN_HOURS = 12;

function track(obj) {
  track0("pay-as-you-go-project-upgrade", obj);
}

// These correspond to dedicated RAM and dedicated CPU, and we
// found them too difficult to cost out, so exclude them (only
// admins can set them).
const EXCLUDE = new Set(["memory_request", "cpu_shares"]);

interface Props {
  project_id: string;
  style: CSSProperties;
}

export default function PayAsYouGoQuotaEditor({ project_id, style }: Props) {
  const project = useRedux(["projects", "project_map", project_id]);

  // Slightly subtle -- it's null if not loaded but {} or the thing if loaded, even
  // if there is no data yet in the database.
  const savedQuotaState: ProjectQuota | null =
    project == null
      ? null
      : project
          .getIn(["pay_as_you_go_quotas", webapp_client.account_id])
          ?.toJS() ?? {};
  const [editing, setEditing] = useState<boolean>(false);
  // one we are editing:
  const [quotaState, setQuotaState] = useState<ProjectQuota | null>(
    savedQuotaState
  );

  const runningWithUpgrade = useMemo(() => {
    return (
      project?.getIn(["state", "state"]) == "running" &&
      project?.getIn(["run_quota", "pay_as_you_go", "account_id"]) ==
        webapp_client.account_id
    );
  }, [project]);

  const [maxQuotas, setMaxQuotas] = useState<ProjectQuota | null>(null);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading quotas...");
        setMaxQuotas(
          await webapp_client.purchases_client.getPayAsYouGoMaxProjectQuotas()
        );
      } catch (err) {
        setError(`${err}`);
      } finally {
        setStatus("");
      }
    })();
  }, []);

  useEffect(() => {
    if (editing) {
      setQuotaState(savedQuotaState);
    }
  }, [editing]);

  async function handleClose() {
    track({ action: "close", project_id });
    setEditing(false);
    if (quotaState == null) return;
    try {
      setStatus("Saving...");
      setError("");
      await webapp_client.purchases_client.setPayAsYouGoProjectQuotas(
        project_id,
        quotaState
      );
    } catch (err) {
      setError(`${err}`);
    } finally {
      setStatus("");
    }
  }

  async function handleStop() {
    track({ action: "stop", project_id });
    const quota = { ...quotaState, enabled: 0 };
    setQuotaState(quota);
    await webapp_client.purchases_client.setPayAsYouGoProjectQuotas(
      project_id,
      quota
    );
    const actions = redux.getActions("projects");
    await actions.stop_project(project_id);
  }

  function handlePreset(preset) {
    track({ action: "preset", preset, project_id });
    if (maxQuotas == null) return;
    let x;
    if (preset == "max") {
      x = maxQuotas;
    } else if (preset == "min") {
      x = {
        member_host: 0,
        network: 1,
        cores: 1,
        memory: 1000,
        disk_quota: 3000,
        mintime: 0.5,
      };
    } else if (preset == "medium") {
      x = {
        member_host: 1,
        network: 1,
        cores: 2,
        memory: 8000,
        disk_quota: 4000,
        mintime: 2,
      };
    } else if (preset == "large") {
      x = {
        member_host: 1,
        network: 1,
        always_running: 1,
        cores: 3,
        memory: 10000,
        disk_quota: 6000,
      };
    }
    x = copy_without(x, Array.from(EXCLUDE));
    for (const key in x) {
      if (maxQuotas[key] != null && maxQuotas[key] < x[key]) {
        x[key] = maxQuotas[key];
      }
    }
    setQuotaState(x);
  }

  async function handleRun() {
    if (quotaState == null) return;
    try {
      setError("");
      setStatus("Computing cost...");
      const prices =
        await webapp_client.purchases_client.getPayAsYouGoPricesProjectQuotas();
      const cost = getPricePerHour(quotaState, prices);
      setStatus("Saving quotas...");
      const quota = {
        ...quotaState,
        enabled: webapp_client.server_time().valueOf(),
        cost,
      };
      track({ action: "run", quota, project_id });
      setQuotaState(quota);

      const { allowed, reason } =
        await webapp_client.purchases_client.isPurchaseAllowed(
          "project-upgrade",
          cost * MIN_HOURS
        );
      if (!allowed) {
        await webapp_client.purchases_client.quotaModal({
          service: "project-upgrade",
          reason,
          allowed,
          cost: cost * MIN_HOURS,
        });
        {
          // Check again, since result of modal may not be sufficient.
          // This time if not allowed, will show an error.
          const { allowed, reason } =
            await webapp_client.purchases_client.isPurchaseAllowed(
              "project-upgrade",
              cost * MIN_HOURS
            );
          if (!allowed) {
            throw Error(reason);
          }
        }
      }

      await webapp_client.purchases_client.setPayAsYouGoProjectQuotas(
        project_id,
        quota
      );
      const actions = redux.getActions("projects");
      setStatus("Stopping project...");
      await actions.stop_project(project_id);
      setStatus("Starting project...");
      await actions.start_project(project_id);
      actions.project_log(project_id, {
        event: "pay-as-you-go-upgrade",
        quota,
      });
    } catch (err) {
      console.warn(err);
      setError(`${err}`);
    } finally {
      setStatus("");
    }
  }

  //   // Returns true if the admin inputs are valid, i.e.
  //   //    - at least one has changed
  //   //    - none are negative
  //   //    - none are empty
  //   function isModified(): boolean {
  //     for (const key of PROJECT_QUOTA_KEYS) {
  //       if ((savedQuotaState?.[key] ?? 0) != (quotaState?.[key] ?? 0)) {
  //         return true;
  //       }
  //     }
  //     return false;
  //   }

  if (editing && (quotaState == null || savedQuotaState == null)) {
    return <Loading />;
  }

  return (
    <Card
      style={style}
      title={
        <h4>
          <Icon name="compass" /> Pay As You Go
          <RunningStatus project={project} />
          {runningWithUpgrade && (
            <>
              {" "}
              (Amount:{" "}
              <DynamicallyUpdatingCost
                alwaysNonnegative
                costPerHour={
                  project?.getIn([
                    "run_quota",
                    "pay_as_you_go",
                    "quota",
                    "cost",
                  ]) ?? 0
                }
                start={project?.getIn([
                  "run_quota",
                  "pay_as_you_go",
                  "quota",
                  "start",
                ])}
              />
              )
            </>
          )}
          {status ? (
            <Tag color="success" style={{ marginLeft: "30px" }}>
              {status}
            </Tag>
          ) : undefined}
        </h4>
      }
      type="inner"
      extra={<Information />}
    >
      {quotaState != null && (editing || runningWithUpgrade) && (
        <div style={{ float: "right", marginLeft: "30px", width: "150px" }}>
          <CostPerHour quota={quotaState} />
        </div>
      )}
      {runningWithUpgrade && (
        <div>
          This project is running with the quota upgrades that{" "}
          <a
            onClick={() => {
              load_target("settings/purchases");
            }}
          >
            you purchased
          </a>
          . You will be charged <b>by the second</b> until the project is
          stopped.
          <div>
            <Popconfirm
              title={"Stop project?"}
              description={"Remove upgrades and stop the project?"}
              onConfirm={handleStop}
            >
              <Button style={{ marginRight: "8px", marginTop: "15px" }}>
                <Icon name="stop" /> Stop Project
              </Button>
            </Popconfirm>
            <Button onClick={() => setEditing(!editing)}>
              {editing ? "Hide" : "Show"} Quotas
            </Button>
          </div>
        </div>
      )}
      {!editing && !runningWithUpgrade && (
        <Button
          size="large"
          onClick={() => {
            if (!editing) {
              track({ action: "open", project_id });
            }
            setEditing(!editing);
          }}
        >
          <Icon name="credit-card" /> Upgrade...
        </Button>
      )}
      {editing && !runningWithUpgrade && (
        <div style={{ marginTop: "15px" }}>
          <Button onClick={handleClose}>Close</Button>
          <Popconfirm
            title="Run project with exactly these quotas?"
            description={
              <div style={{ width: "400px" }}>
                The project will restart with your quotas applied.{" "}
                <b>
                  You will be charged by the second for usage during this
                  session.
                </b>
                <br /> <br />
                NOTES: No licenses will be applied. Only one person can upgrade
                a project at once, though all collaborators get to use the
                upgraded version of the project.
              </div>
            }
            onConfirm={handleRun}
            okText="Upgrade"
            cancelText="No"
          >
            <Button style={{ marginLeft: "8px" }} type="primary">
              <Icon name="save" /> Upgrade Project...
            </Button>
          </Popconfirm>
        </div>
      )}
      {editing && (
        <>
          {error && (
            <Alert
              style={{ margin: "15px" }}
              type="error"
              showIcon
              description={error}
              closable
              onClose={() => setError("")}
            />
          )}
          <div style={{ margin: "15px 0" }}>
            <Tag
              icon={<Icon name="battery-quarter" />}
              style={{ cursor: "pointer" }}
              color="blue"
              onClick={() => handlePreset("min")}
            >
              Min
            </Tag>
            <Tag
              icon={<Icon name="battery-half" />}
              style={{ cursor: "pointer" }}
              color="blue"
              onClick={() => handlePreset("medium")}
            >
              Medium
            </Tag>
            <Tag
              icon={<Icon name="battery-three-quarters" />}
              style={{ cursor: "pointer" }}
              color="blue"
              onClick={() => handlePreset("large")}
            >
              Large
            </Tag>
            <Tag
              icon={<Icon name="battery-full" />}
              style={{ cursor: "pointer" }}
              color="blue"
              onClick={() => handlePreset("max")}
            >
              Max
            </Tag>
            <hr />
          </div>
          {PROJECT_UPGRADES.field_order
            .filter((name) => !EXCLUDE.has(name))
            .map((name) => (
              <QuotaRow
                key={name}
                name={name}
                quotaState={quotaState}
                setQuotaState={setQuotaState}
                maxQuotas={maxQuotas}
                disabled={runningWithUpgrade}
              />
            ))}
        </>
      )}
    </Card>
  );
}

function RunningStatus({ project }) {
  const user_map = useTypedRedux("users", "user_map");
  if (project?.getIn(["state", "state"]) != "running") {
    return (
      <Tag color="red" style={{ marginLeft: "30px" }}>
        Inactive
      </Tag>
    );
  }
  const pay_as_you_go_account_id = project.getIn([
    "run_quota",
    "pay_as_you_go",
    "account_id",
  ]);
  if (!pay_as_you_go_account_id) {
    return (
      <Tag color="red" style={{ marginLeft: "30px" }}>
        Inactive
      </Tag>
    );
  }
  return (
    <span>
      <Tag style={{ marginLeft: "30px" }} color="success">
        Active
      </Tag>
      paid for by{" "}
      {pay_as_you_go_account_id == webapp_client.account_id ? (
        "you"
      ) : (
        <User account_id={pay_as_you_go_account_id} user_map={user_map} />
      )}
    </span>
  );
}

// This is used specifically for the fixed tabs action
// bar, hence the weird marginInlineEnd below to get
// it to center properly.
// Also, when we also have pay as you go remote GPU
// Jupyter kernels, then this will be the sum of them
// and the pay as you go project...
export function PayAsYouGoCost({ project_id }) {
  const project = useRedux(["projects", "project_map", project_id]);
  if (!project) return null;
  const state = project.getIn(["state", "state"]);
  if (state != "running" && state != "starting") return null;
  const PAYG = project.getIn(["run_quota", "pay_as_you_go"]);
  if (PAYG?.get("account_id") != webapp_client.account_id) {
    // only show this when YOU are paying.
    return null;
  }
  const quota = PAYG.get("quota")?.toJS();
  if (!quota || !quota.cost || !quota.start) {
    return null;
  }
  return (
    <div style={{ textAlign: "center" }}>
      <Tag color="green" style={{ marginInlineEnd: 0 }}>
        <DynamicallyUpdatingCost
          alwaysNonnegative
          costPerHour={quota.cost}
          start={quota.start}
        />
      </Tag>
    </div>
  );
}
