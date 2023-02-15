/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import { debounce } from "lodash";
import { filename_extension } from "@cocalc/util/misc";
import { redux, useTypedRedux, useMemo } from "@cocalc/frontend/app-framework";
import { COLORS } from "@cocalc/util/theme";
import { Icon, Tip, Space } from "@cocalc/frontend/components";
import { UsersViewing } from "@cocalc/frontend/account/avatar/users-viewing";
import VideoChatButton from "./video/launch-button";
import { HiddenXSSM } from "@cocalc/frontend/components";
import { hidden_meta_file } from "@cocalc/util/misc";
import type { ChatActions } from "./actions";

const CHAT_INDICATOR_STYLE: React.CSSProperties = {
  fontSize: "14pt",
  borderRadius: "3px",
  paddingTop: "5px",
};

const USERS_VIEWING_STYLE: React.CSSProperties = {
  maxWidth: "120px",
};

const CHAT_INDICATOR_TIP = (
  <span>
    Hide or show the chat for this file.
    <hr />
    Use HTML, Markdown, and LaTeX in your chats, and press shift+enter to send
    them. Your collaborators will be notified.
  </span>
);

interface Props {
  project_id: string;
  path: string;
  is_chat_open?: boolean;
}

export const ChatIndicator: React.FC<Props> = ({
  project_id,
  path,
  is_chat_open,
}) => {
  const fullscreen = useTypedRedux("page", "fullscreen");
  const file_use = useTypedRedux("file_use", "file_use");
  const is_new_chat = useMemo(
    () =>
      !!redux.getStore("file_use")?.get_file_info(project_id, path)
        ?.is_unseenchat,
    [file_use, project_id, path]
  );

  const toggle_chat = debounce(
    () => {
      const a = redux.getProjectActions(project_id);
      if (is_chat_open) {
        a.close_chat({ path });
      } else {
        a.open_chat({ path });
      }
    },
    1000,
    { leading: true }
  );

  function render_chat_button() {
    if (filename_extension(path) === "sage-chat") {
      // Special case: do not show side chat for chatrooms
      return;
    }

    const color = is_new_chat ? COLORS.FG_RED : COLORS.TAB;
    const action = is_chat_open ? "Hide" : "Show";
    const title = (
      <span>
        <Icon name="comment" />
        <Space /> <Space /> {action} chat
      </span>
    );
    return (
      <div
        style={{
          color,
        }}
        className={is_new_chat ? "smc-chat-notification" : undefined}
      >
        {is_chat_open && (
          <span
            style={{ marginLeft: "5px", marginRight: "5px", color: "#428bca" }}
          >
            <VideoChatButton
              project_id={project_id}
              path={path}
              button={false}
              sendChat={(value) => {
                const actions = redux.getEditorActions(
                  project_id,
                  hidden_meta_file(path, "sage-chat")
                ) as ChatActions;
                actions.send_chat(value);
              }}
            />
          </span>
        )}
        <Tip
          title={title}
          tip={CHAT_INDICATOR_TIP}
          placement={"leftTop"}
          delayShow={3000}
          stable={false}
        >
          <span onClick={toggle_chat}>
            <Icon
              name={is_chat_open ? "caret-down" : "caret-left"}
              style={{ color: COLORS.FILE_ICON }}
            />
            <Space />
            <Icon name="comment" style={{ color: COLORS.FILE_ICON }} />
            <HiddenXSSM style={{ fontSize: "10.5pt", marginLeft: "5px" }}>
              Chat
            </HiddenXSSM>
          </span>
        </Tip>
      </div>
    );
  }

  const style: React.CSSProperties = {
    ...CHAT_INDICATOR_STYLE,
    ...{ display: "flex" },
    ...(fullscreen
      ? { top: "1px", right: "23px" }
      : { top: "-30px", right: "3px" }),
  };
  return (
    <div style={style}>
      <UsersViewing
        project_id={project_id}
        path={path}
        style={USERS_VIEWING_STYLE}
      />
      {render_chat_button()}
    </div>
  );
};
