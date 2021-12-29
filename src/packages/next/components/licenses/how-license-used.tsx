import { useState } from "react";
import Loading from "components/share/loading";
import { Alert, Input, Popover, Table } from "antd";
import SelectLicense from "./select-license";
import Avatar from "components/account/avatar";
import { search_split, search_match } from "@cocalc/util/misc";
import A from "components/misc/A";
import Timestamp from "components/misc/timestamp";
import apiPost from "lib/api/post";
import { capitalize, cmp } from "@cocalc/util/misc";
import editURL from "lib/share/edit-url";
import { Details as License } from "./license";
import { quotaColumn } from "./managed";

function columns(account_id) {
  return [
    {
      title: (
        <Popover
          placement="bottom"
          title="Project"
          content={
            <div style={{ maxWidth: "75ex" }}>
              This is the title and id of the project. If you are a collaborator
              on this project, then you can click the title to open the project.
            </div>
          }
        >
          Project
        </Popover>
      ),
      dataIndex: "title",
      key: "title",
      width: "30%",
      render: (title, { project_id, collaborators }) => (
        <div style={{ wordWrap: "break-word", wordBreak: "break-word" }}>
          {collaborators.includes(account_id) ? (
            <A href={editURL({ project_id, type: "collaborator" })} external>
              {title}
            </A>
          ) : (
            title
          )}
          <div style={{fontFamily:'monospace', fontSize:'9pt'}}>{project_id}</div>
        </div>
      ),
      sorter: { compare: (a, b) => cmp(a.title, b.title) },
    },
    {
      title: "Last Edited",
      dataIndex: "last_edited",
      key: "last_edited",
      render: (last_edited) => <Timestamp epoch={last_edited} />,
      sorter: { compare: (a, b) => cmp(a.last_edited, b.last_edited) },
    },
    {
      title: (
        <Popover
          title="Collaborators"
          content={
            <div style={{ maxWidth: "75ex" }}>
              These are the collaborators on this project. You are not
              necessarily included in this list, since this license can be
              applied to any project by somebody who knows the license code.
            </div>
          }
        >
          Collaborators
        </Popover>
      ),
      dataIndex: "collaborators",
      key: "collaborators",
      render: (collaborators) => (
        <>
          {collaborators.map((account_id) => (
            <Avatar
              key={account_id}
              account_id={account_id}
              size={24}
              style={{ marginRight: "2.5px" }}
            />
          ))}
        </>
      ),
    },

    {
      title: "State",
      dataIndex: "state",
      key: "state",
      sorter: { compare: (a, b) => cmp(a.state, b.state) },
      render: (state) => capitalize(state),
    },
    quotaColumn,
  ];
}

export default function HowLicenseUsed({ account_id }) {
  const [license, setLicense] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState<string>("");
  let [projects, setProjects] = useState<object[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <div style={{ width: "100%", overflowX: "scroll" }}>
      <h3>How a License You Manage is Being Used</h3>
      Select a license you manage to see how it is being used. You can see{" "}
      <i>all</i> projects that have this license applied to them (even if you
      are not a collaborator on them!), remove licenses from projects, and view
      analytics about how the license has been used over time to better inform
      your decision making.
      <div style={{ margin: "15px 0", width: "100%" }}>
        <SelectLicense
          disabled={loading}
          onSelect={async (license_id) => {
            setLicense(license_id);
            setError("");
            if (license_id) {
              setLoading(true);
              setProjects([]);
              try {
                setProjects(
                  await apiPost("/licenses/get-projects-with-license", {
                    license_id,
                  })
                );
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }
          }}
          license={license}
          style={{ width: "100%", maxWidth: "90ex" }}
        />
      </div>
      {license && error && <Alert type="error" message={error} />}
      {license && loading && (
        <Loading style={{ fontSize: "16pt", margin: "auto" }} />
      )}
      <div
        style={{
          border: "1px solid lightgrey",
          borderRadius: "5px",
          padding: "15px",
          backgroundColor: "#f8f8f8",
          width: "100%",
          maxWidth: "90ex",
        }}
      >
        {license ? (
          <License license_id={license} />
        ) : (
          <div style={{ textAlign: "center", fontSize: "13pt" }}>
            Select a license above.
          </div>
        )}
      </div>
      {license && !loading && projects.length > 1 && (
        <div style={{ margin: "15px 0", maxWidth: "50ex" }}>
          <Input.Search
            placeholder="Search project titles..."
            allowClear
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      )}
      {license && !loading && (
        <Table
          columns={columns(account_id)}
          dataSource={doSearch(projects, search)}
          rowKey={"project_id"}
          style={{ marginTop: "15px" }}
          pagination={{ hideOnSinglePage: true, pageSize: 100 }}
        />
      )}
    </div>
  );
}

function doSearch(data: object[], search: string): object[] {
  const v = search_split(search.toLowerCase().trim());
  const w: object[] = [];
  for (const x of data) {
    if (x["search"] == null) {
      x["search"] = `${x["title"] ?? ""} ${x["id"]}`.toLowerCase();
    }
    if (search_match(x["search"], v)) {
      w.push(x);
    }
  }
  return w;
}
