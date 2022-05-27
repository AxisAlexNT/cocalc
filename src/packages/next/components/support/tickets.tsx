import { ReactNode } from "react";
import { Alert, Divider, Layout, Tag, Timeline, Tooltip } from "antd";
import useAPI from "lib/hooks/api";
import Loading from "components/share/loading";
import A from "components/misc/A";
import { capitalize, trunc } from "@cocalc/util/misc";
import Markdown from "@cocalc/frontend/editors/slate/static-markdown";
import { Icon } from "@cocalc/frontend/components/icon";
import { NoZendesk } from "./util";
import { useCustomize } from "lib/customize";
import { MAX_WIDTH } from "lib/config";

export default function Tickets() {
  let { result, error } = useAPI("support/tickets");
  const { zendesk } = useCustomize();

  if (!zendesk) {
    return <NoZendesk />;
  }
  return (
    <Layout.Content
      style={{
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          maxWidth: MAX_WIDTH,
          margin: "15px auto",
          padding: "15px",
          backgroundColor: "white",
          color: "#555",
        }}
      >
        {" "}
        <h1 style={{ textAlign: "center", fontSize: "24pt" }}>
          Support Tickets
        </h1>
        <p style={{ fontSize: "12pt" }}>
          Check the status of your support tickets here or{" "}
          <A href="/support/new">create a new ticket</A>. Newly created
          tickets do not appear here for a few minutes.
        </p>
        {error && (
          <Alert
            style={{ margin: "30px 0" }}
            type="error"
            message={"Error loading support tickets"}
            description={error}
          />
        )}
        <Divider>Tickets</Divider>
        <br />
        {result ? (
          <SupportTimeline tickets={result.tickets} />
        ) : (
          <Loading style={{ fontSize: "20pt" }} />
        )}
      </div>
    </Layout.Content>
  );
}

function SupportTimeline({ tickets }) {
  const v: ReactNode[] = [];
  for (const ticket of tickets ?? []) {
    v.push(
      <Timeline.Item key={ticket.id} color={statusToColor(ticket.status)}>
        <Ticket ticket={ticket} />
      </Timeline.Item>
    );
  }
  return <Timeline>{v}</Timeline>;
}

const COLOR = {
  new: "orange",
  open: "orange",
  pending: "red",
  solved: "#666",
};

function statusToColor(status: string): string {
  return COLOR[status] ?? "yellow";
}

function Ticket({ ticket }) {
  const {
    id,
    userURL,
    created_at,
    updated_at,
    description,
    status,
    subject,
    type,
  } = ticket;
  return (
    <div style={{ marginBottom: "15px" }}>
      <div style={{ float: "right" }}>
        <Type type={type} status={status} />
      </div>
      <A href={userURL}>
        <Status status={status} />
        <b style={{ fontSize: "13pt" }}>{trunc(subject, 80)}</b>
      </A>
      <br />
      <div style={{ float: "right" }}>
        <Tooltip title="Click to visit Zendesk and see all responses to your support request.">
          <A href={userURL}>
            <Icon name="external-link" /> Ticket: {id}
          </A>
        </Tooltip>
      </div>
      (created: {dateToString(created_at)}, updated: {dateToString(updated_at)})
      <br />
      <div
        style={{
          overflow: "auto",
          maxHeight: "30vh",
          border: "1px solid lightgrey",
          padding: "15px",
          marginTop: "5px",
          backgroundColor: "#fdfdfd",
          borderRadius: "3px",
        }}
      >
        <Markdown value={description} />
      </div>
    </div>
  );
}

const STATUS_TIP = {
  pending: "We are waiting for your response.",
  new: "We are looking at your support request but have not responded yet.",
  open: "We are trying to solve your support request.",
  solved: "We consider this support request solved.",
};

function Status({ status }) {
  return (
    <Tooltip title={STATUS_TIP[status]}>
      <Tag color={statusToColor(status)} style={{ fontSize: "12pt" }}>
        {capitalize(status)}
      </Tag>
    </Tooltip>
  );
}

const TYPE_COLOR = {
  problem: "red",
  question: "blue",
  task: "orange",
};

export function Type({
  status,
  type,
}: {
  status?: string;
  type: "problem" | "question" | "task";
}) {
  return (
    <Tag
      color={status == "solved" ? "#666" : TYPE_COLOR[type]}
      style={{ fontSize: "12pt" }}
    >
      {capitalize(type)}
    </Tag>
  );
}

function dateToString(d: string): string {
  try {
    return new Date(d).toLocaleString();
  } catch (_err) {
    return d;
  }
}
