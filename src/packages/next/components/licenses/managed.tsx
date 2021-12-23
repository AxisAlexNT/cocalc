import useAPI from "lib/hooks/api";
import Loading from "components/share/loading";
import { Alert, Table } from "antd";

function renderTimestamp(x) {
  return x ? new Date(x).toLocaleString() : "-";
}

const columns = [
  {
    title: "Title",
    dataIndex: "title",
    key: "title",
    width: "30%",
    render: (title, record) => (
      <div
        style={{
          wordWrap: "break-word",
          wordBreak: "break-word",
          color: "#666",
        }}
      >
        <b>{title}</b>
        {record.description.trim() && <div>{record.description}</div>}
      </div>
    ),
  },
  {
    title: "Last Used",
    dataIndex: "last_used",
    key: "last_used",
    render: renderTimestamp,
  },
  {
    title: "Activates",
    dataIndex: "activates",
    key: "activates",
    render: renderTimestamp,
  },
  {
    title: "Expires",
    dataIndex: "expires",
    key: "expires",
    render: renderTimestamp,
  },
  {
    title: "Created",
    dataIndex: "created",
    key: "created",
    render: renderTimestamp,
  },
  {
    title: "Managers",
    dataIndex: "managers",
    key: "managers",
  },
  {
    title: "Limit",
    dataIndex: "run_limit",
    key: "run_limit",
  },
  {
    title: "Quota",
    dataIndex: "quota",
    key: "quota",
    render: (quota) => {
      return (
        <div
          style={{
            wordWrap: "break-word",
            wordBreak: "break-word",
            color: "#666",
          }}
        >
          {JSON.stringify(quota)}
        </div>
      );
    },
  },
];

export default function ManagedLicenses() {
  const { result, error } = useAPI("licenses/get-managed");
  if (error) {
    return <Alert type="error" message={error} />;
  }
  if (!result) {
    return <Loading />;
  }
  return (
    <div>
      <h3>Licenses that you Manage</h3>
      These are the licenses that you purchased or manage.
      <Table
        columns={columns}
        dataSource={result}
        rowKey={"id"}
        style={{ marginTop: "15px" }}
      />
      <pre>{JSON.stringify(result, undefined, 2)}</pre>
    </div>
  );
}