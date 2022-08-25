/* Shows an overview of all pages in the whiteboard */

import { Button, Popover } from "antd";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import useVirtuosoScrollHook from "@cocalc/frontend/components/virtuoso-scroll-hook";
import { useFrameContext } from "./hooks";
import { useEditorRedux } from "@cocalc/frontend/app-framework";
import { Loading } from "@cocalc/frontend/components";
import { Overview } from "./tools/navigation";
import { State, elementsList } from "./actions";
import { Icon } from "@cocalc/frontend/components/icon";
import useResizeObserver from "use-resize-observer";

const VMARGIN = 20;
const HMARGIN = 15;

export default function Pages() {
  const { actions, id: frameId, project_id, path, desc } = useFrameContext();
  const useEditor = useEditorRedux<State>({ project_id, path });
  const [height, setHeight] = useState<number>(200);
  const [width, setWidth] = useState<number>(200);

  const isLoaded = useEditor("is_loaded");
  //const readOnly = useEditor("read_only");
  const pagesMap = useEditor("pages");
  const elementsMap = useEditor("elements");
  const pages = pagesMap?.size ?? 1;

  const virtuosoScroll = useVirtuosoScrollHook({
    cacheId: `whiteboard-pages-${project_id}-${path}-${desc.get("id")}`,
  });

  const divRef = useRef<any>(null);
  const resize = useResizeObserver({ ref: divRef });
  useEffect(() => {
    const elt = divRef.current;
    if (elt == null) return;
    const w = elt.getBoundingClientRect().width;
    setWidth(w);
    setHeight(w);
  }, [resize]);

  useEffect(() => {
    // ensure we don't have viewport info left over from a split...
    if (desc.get("viewport") != null) {
      actions.saveViewport(frameId, null);
    }
    if (desc.get("pages") != null) {
      // do NOT want info about current page or pages to come
      // from desc.
      actions.setPages(frameId, null);
    }
  }, [desc]);

  if (!isLoaded) {
    return <Loading theme="medium" />;
  }

  const STYLE = {
    cursor: "pointer",
    width: `${width - 2 * HMARGIN}px`,
    margin: "0 auto",
    padding: `${VMARGIN}px 0`,
    position: "relative",
    overflow: "hidden",
  } as CSSProperties;

  return (
    <div className="smc-vfill" ref={divRef} style={{ background: "#eee" }}>
      <Virtuoso
        style={{
          width: "100%",
          height: "100%",
          marginBottom: "10px",
        }}
        totalCount={pages + 1}
        increaseViewportBy={1.5 * height}
        itemContent={(index) => {
          if (index == (pages ?? 1)) {
            // Add a new page
            return (
              <div style={{ ...STYLE, textAlign: "center" }}>
                <Popover
                  title={"Create a new page"}
                  content={
                    <div style={{ maxWidth: "400px" }}>
                      Each page is an independent infinite whiteboard canvas.
                      Click this button to create a new page. Easily jump
                      between pages by clicking on a page here.
                    </div>
                  }
                >
                  <Button
                    shape="round"
                    size="large"
                    onClick={() => {
                      const id =
                        actions.show_focused_frame_of_type("whiteboard");
                      actions.newPage(id);
                      setTimeout(() => {
                        // after the click
                        actions.show_focused_frame_of_type("whiteboard");
                      }, 0);
                    }}
                  >
                    <Icon name="plus-circle" /> New
                  </Button>
                </Popover>
              </div>
            );
          }
          const elementsOnPage = elementsList(pagesMap?.get(index + 1)) ?? [];
          if (elementsOnPage == null) {
            return <div style={{ height: "1px" }}></div>;
          }
          return (
            <div
              onClick={() => {
                const frameId =
                  actions.show_focused_frame_of_type("whiteboard");
                actions.setPage(frameId, index + 1);
              }}
              style={{ ...STYLE }}
            >
              <Overview
                margin={15}
                elements={elementsOnPage}
                elementsMap={elementsMap}
                width={width - 2 * HMARGIN}
                navMap={"map"}
                style={{
                  pointerEvents: "none",
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                }}
                maxScale={2}
              />
              <div
                style={{
                  textAlign: "center",
                  fontSize: "10pt",
                }}
              >
                {index + 1}
              </div>
            </div>
          );
        }}
        {...virtuosoScroll}
      />
    </div>
  );
}
