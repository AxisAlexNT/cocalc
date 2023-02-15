import { useMemo, useRef } from "react";
import { useEditorRedux } from "@cocalc/frontend/app-framework";
import { Loading } from "@cocalc/frontend/components";
import { State, elementsList } from "./actions";
import Canvas from "./canvas";
import ToolPanel from "./tools/panel";
import PenPanel from "./tools/pen";
import NotePanel from "./tools/note";
import TextPanel from "./tools/text";
import CodePanel from "./tools/code";
import IconPanel from "./tools/icon";
import TimerPanel from "./tools/timer";
import FramePanel from "./tools/frame";
import EdgePanel from "./tools/edge";
import NavigationPanel from "./tools/navigation";
import { useFrameContext, usePageInfo } from "./hooks";
import Upload from "./tools/upload";
import KernelPanel from "./elements/code/kernel";
import NewPage from "./new-page";

export default function Whiteboard() {
  const { actions, isFocused, path, project_id, desc, font_size } =
    useFrameContext();
  const useEditor = useEditorRedux<State>({ project_id, path });

  const is_loaded = useEditor("is_loaded");
  const readOnly = useEditor("read_only");
  const pagesMap = useEditor("pages");
  const elementsMap = useEditor("elements");
  const sortedPageIds = useEditor("sortedPageIds");

  const pageId = useMemo(() => {
    if (sortedPageIds == null || pagesMap == null) return null;
    const pageNumber = desc.get("page");
    return sortedPageIds.get(pageNumber - 1);
  }, [desc.get("page"), sortedPageIds]);

  const elementsOnPage = useMemo(() => {
    if (sortedPageIds == null || pagesMap == null) return null;
    if (pageId == null) return [];
    return elementsList(pagesMap.get(pageId)) ?? [];
  }, [pagesMap?.get(pageId ?? "")]);

  usePageInfo(pagesMap);

  const cursorsMap = useEditor("cursors");
  const cursors = useMemo(() => {
    const cursors: { [id: string]: { [account_id: string]: any[] } } = {};
    for (const [account_id, locs] of cursorsMap) {
      const x = locs?.toJS();
      const id = x?.[0]?.id;
      if (id == null) continue;
      if (cursors[id] == null) {
        cursors[id] = {};
      }
      cursors[id][account_id] = x;
    }
    return cursors;
  }, [cursorsMap]);

  const selectedTool = desc.get("selectedTool") ?? "select";
  const evtToDataRef = useRef<Function | null>(null);
  const whiteboardDivRef = useRef<HTMLDivElement | null>(null);

  if (!is_loaded || elementsOnPage == null) {
    return (
      <div
        style={{
          fontSize: "40px",
          textAlign: "center",
          padding: "15px",
          color: "#999",
        }}
      >
        <Loading />
      </div>
    );
  }

  if (pageId == null) {
    // there are no pages at all.
    return (
      <div className="smc-vfill" style={{ justifyContent: "center" }}>
        <NewPage
          tip={"There are no pages.  Click here to create the first page."}
          label={"Create Page"}
        />
      </div>
    );
  }

  const tool = desc.get("selectedTool");
  return (
    <div
      className="smc-vfill"
      style={{ position: "relative" }}
      ref={whiteboardDivRef}
    >
      {isFocused && (
        <>
          {!readOnly && <KernelPanel />}
          <ToolPanel selectedTool={tool ?? "select"} readOnly={readOnly} />
          {!desc.get("selectedToolHidePanel") && (
            <>
              {tool == "pen" && <PenPanel />}
              {tool == "note" && <NotePanel />}
              {tool == "text" && <TextPanel />}
              {tool == "code" && <CodePanel />}
              {tool == "icon" && <IconPanel />}
              {tool == "timer" && <TimerPanel />}
              {tool == "frame" && <FramePanel />}
              {tool == "edge" && <EdgePanel />}
            </>
          )}
          <NavigationPanel
            mainFrameType={actions.mainFrameType}
            fontSize={font_size}
            elements={elementsOnPage}
            elementsMap={elementsMap}
            whiteboardDivRef={whiteboardDivRef}
          />
        </>
      )}
      <Upload evtToDataRef={evtToDataRef} readOnly={readOnly}>
        <Canvas
          mainFrameType={actions.mainFrameType}
          elements={elementsOnPage}
          elementsMap={elementsMap}
          font_size={font_size}
          selection={
            selectedTool == "select"
              ? new Set(desc.get("selection")?.toJS() ?? [])
              : undefined
          }
          selectedTool={selectedTool}
          evtToDataRef={evtToDataRef}
          readOnly={readOnly}
          cursors={cursors}
        />
      </Upload>
    </div>
  );
}
