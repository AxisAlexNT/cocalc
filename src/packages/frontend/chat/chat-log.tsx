/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Render all the messages in the chat.
*/

import React, { MutableRefObject, useEffect, useMemo, useRef } from "react";
import { List, Map, Set as immutableSet } from "immutable";
import {
  useActions,
  useRedux,
  useTypedRedux,
} from "@cocalc/frontend/app-framework";
import { Alert } from "antd";
import Message from "./message";
import { parse_hashtags, search_match, search_split } from "@cocalc/util/misc";
import { ChatActions } from "./actions";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import useVirtuosoScrollHook from "@cocalc/frontend/components/virtuoso-scroll-hook";
import { Avatar } from "@cocalc/frontend/account/avatar/avatar";
import { HashtagBar } from "@cocalc/frontend/editors/task-editor/hashtag-bar";
import { newest_content, getSelectedHashtagsSearch } from "./utils";

type MessageMap = Map<string, any>;

interface ChatLogProps {
  project_id: string; // used to render links more effectively
  path: string;
  show_heads: boolean;
  scrollToBottomRef?: MutableRefObject<(force?: boolean) => void>;
}

export const ChatLog: React.FC<ChatLogProps> = React.memo(
  ({ project_id, path, scrollToBottomRef, show_heads }) => {
    const actions: ChatActions = useActions(project_id, path);
    const messages = useRedux(["messages"], project_id, path);
    const drafts = useRedux(["drafts"], project_id, path);
    const font_size = useRedux(["font_size"], project_id, path);

    // see similar code in task list:
    const selectedHashtags0 = useRedux(["selectedHashtags"], project_id, path);
    const { selectedHashtags, selectedHashtagsSearch } = useMemo(() => {
      return getSelectedHashtagsSearch(selectedHashtags0);
    }, [selectedHashtags0]);

    const search =
      useRedux(["search"], project_id, path) + selectedHashtagsSearch;

    useEffect(() => {
      scrollToBottomRef?.current?.(true);
    }, [search]);

    const user_map = useTypedRedux("users", "user_map");
    const account_id = useTypedRedux("account", "account_id");
    const sorted_dates = useMemo<string[]>(() => {
      return get_sorted_dates(messages, search);
    }, [messages, search, project_id, path]);

    const visibleHashtags = useMemo(() => {
      let X = immutableSet<string>([]);
      for (const date of sorted_dates) {
        const message = messages.get(date);
        const value = newest_content(message);
        for (const x of parse_hashtags(value)) {
          const tag = value.slice(x[0] + 1, x[1]).toLowerCase();
          X = X.add(tag);
        }
      }
      return X;
    }, [messages, sorted_dates]);

    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const manualScrollRef = useRef<boolean>(false);

    useEffect(() => {
      if (scrollToBottomRef == null) return;
      scrollToBottomRef.current = (force?: boolean) => {
        if (manualScrollRef.current && !force) return;
        manualScrollRef.current = false;
        virtuosoRef.current?.scrollToIndex({ index: 99999999999999999999 });
        // sometimes scrolling to bottom is requested before last entry added,
        // so we do it again in the next render loop.  This seems needed mainly
        // for side chat when there is little vertical space.
        setTimeout(
          () =>
            virtuosoRef.current?.scrollToIndex({ index: 99999999999999999999 }),
          0
        );
      };
    }, [scrollToBottomRef != null]);

    const virtuosoScroll = useVirtuosoScrollHook({
      cacheId: `${project_id}${path}`,
    });

    // Given the date of the message as an ISO string, return rendered version.
    function render_message(date: string, i: number): JSX.Element | undefined {
      const message: MessageMap | undefined = messages.get(date);
      if (message === undefined) return;
      return (
        <Message
          key={date}
          account_id={account_id}
          user_map={user_map}
          message={message}
          project_id={project_id}
          path={path}
          font_size={font_size}
          selectedHashtags={selectedHashtags}
          actions={actions}
          is_prev_sender={is_prev_message_sender(i, sorted_dates, messages)}
          is_next_sender={is_next_message_sender(i, sorted_dates, messages)}
          show_avatar={
            show_heads && !is_next_message_sender(i, sorted_dates, messages)
          }
          include_avatar_col={show_heads}
          get_user_name={(account_id) => get_user_name(user_map, account_id)}
          scroll_into_view={() =>
            virtuosoRef.current?.scrollIntoView({ index: i })
          }
        />
      );
    }

    function render_not_showing(): JSX.Element | undefined {
      if (messages == null) return;
      const not_showing = messages.size - sorted_dates.length;
      if (not_showing <= 0) return;
      return (
        <Alert
          style={{ margin: "0 5px" }}
          type="warning"
          key="not_showing"
          message={
            <b>
              WARNING: Hiding {not_showing} chats that do not match search for '
              {search.trim()}'.
            </b>
          }
        />
      );
    }

    function renderComposing() {
      if (!drafts || drafts.size == 0) return;
      const v: JSX.Element[] = [];
      const cutoff = new Date().valueOf() - 1000 * 30; // 30s
      for (const [sender_id] of drafts) {
        if (account_id == sender_id) continue;
        const record = drafts.get(sender_id);
        if (record.get("active") < cutoff || !record.get("input").trim()) {
          continue;
        }
        v.push(
          <div
            key={sender_id}
            style={{ margin: "5px", color: "#666", textAlign: "center" }}
          >
            <Avatar size={20} account_id={sender_id} />
            <span style={{ marginLeft: "15px" }}>
              {get_user_name(user_map, sender_id)} is writing a message...
            </span>
          </div>
        );
      }
      if (v.length == 0) return;
      scrollToBottomRef?.current?.();
      return <div>{v}</div>;
    }

    return (
      <>
        {visibleHashtags.size > 0 && (
          <HashtagBar
            actions={{
              set_hashtag_state: (tag, state) => {
                actions.setHashtagState(tag, state);
              },
            }}
            selected_hashtags={selectedHashtags0}
            hashtags={visibleHashtags}
          />
        )}
        {render_not_showing()}
        <Virtuoso
          ref={virtuosoRef}
          totalCount={sorted_dates.length}
          itemContent={(index) => {
            return (
              <div style={{ overflow: "hidden" }}>
                {render_message(sorted_dates[index], index)}
              </div>
            );
          }}
          rangeChanged={({ endIndex }) => {
            // manually scrolling if NOT at the bottom.
            manualScrollRef.current = endIndex < sorted_dates.length - 1;
          }}
          {...virtuosoScroll}
        />
        {renderComposing()}
      </>
    );
  }
);

function is_next_message_sender(
  index: number,
  dates: string[],
  messages: Map<string, MessageMap>
): boolean {
  if (index + 1 === dates.length) {
    return false;
  }
  const current_message = messages.get(dates[index]);
  const next_message = messages.get(dates[index + 1]);
  return (
    current_message != null &&
    next_message != null &&
    current_message.get("sender_id") === next_message.get("sender_id")
  );
}

function is_prev_message_sender(
  index: number,
  dates: string[],
  messages: Map<string, MessageMap>
): boolean {
  if (index === 0) {
    return false;
  }
  const current_message = messages.get(dates[index]);
  const prev_message = messages.get(dates[index - 1]);
  return (
    current_message != null &&
    prev_message != null &&
    current_message.get("sender_id") === prev_message.get("sender_id")
  );
}

// NOTE: I removed search including send name, since that would
// be slower and of questionable value.
function search_matches(message: MessageMap, search_terms): boolean {
  const first = message.get("history", List()).first();
  if (first == null) return false;
  return search_match(first.get("content", ""), search_terms);
}

export function get_sorted_dates(messages, search) {
  // WARNING: This code is technically wrong since the keys are the string
  // representations of ms since epoch.  However, it won't fail until over
  // 200 years from now, so we leave it to future generations to worry about.
  let m = messages;
  if (m == null) return [];
  if (search) {
    const search_terms = search_split(search);
    m = m.filter((message) => search_matches(message, search_terms));
  }
  return m.keySeq().sort().toJS();
}

export function get_user_name(user_map, account_id: string): string {
  if (user_map == null) return "Unknown";
  const account = user_map.get(account_id);
  if (account == null) return "Unknown";
  return account.get("first_name", "") + " " + account.get("last_name", "");
}
