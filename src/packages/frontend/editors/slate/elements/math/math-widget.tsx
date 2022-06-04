/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// Katex support -- NOTE: this import of katex is pretty LARGE.
import "katex/dist/katex.min.css";

// Everything else.
import {
  React,
  useEffect,
  useFrameContext,
  useState,
} from "@cocalc/frontend/app-framework";
import { startswith } from "@cocalc/util/misc";
import { SlateCodeMirror } from "../codemirror";
import { useFocused, useSelected } from "../../slate-react";
import { useCollapsed } from "../hooks";
import { FOCUSED_COLOR } from "../../util";
import { StaticElement } from "./index";

interface Props {
  value: string;
  isInline: boolean;
  onChange?: (string) => void;
  isLaTeX: boolean;
}

export const SlateMath: React.FC<Props> = React.memo(
  ({ value, onChange, isInline, isLaTeX }) => {
    const [editMode, setEditMode] = useState<boolean>(false);
    const frameContext = useFrameContext();

    const focused = useFocused();
    const selected = useSelected();
    const collapsed = useCollapsed();

    useEffect(() => {
      if (focused && selected && collapsed) {
        setEditMode(true);
      }
    }, [selected, focused, collapsed]);

    function renderEditMode() {
      if (!editMode) return;
      return (
        <SlateCodeMirror
          value={value}
          onChange={(value) => {
            onChange?.(value.trim().replace(/^\s*[\r\n]/gm, ""));
          }}
          onBlur={() => setEditMode(false)}
          info="tex"
          options={{
            lineWrapping: true,
            autofocus: true,
          }}
          isInline={true}
        />
      );
    }

    function renderLaTeX() {
      return (
        <span
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            // switch to edit mode when you click on it.
            setEditMode?.(true);
            frameContext.actions.set_active_id(frameContext.id);
          }}
        >
          {/* any below since we are abusing the StaticElement component a bit */}
          <StaticElement
            element={
              {
                value,
                type: isInline ? "math_inline" : "math_block",
                isLaTeX,
              } as any
            }
            children={undefined}
            attributes={{} as any}
          />
        </span>
      );
    }

    return (
      <span
        contentEditable={false}
        style={
          editMode
            ? {
                display: "block",
                padding: "10px",
                cursor: "pointer",
                border: "1px solid lightgrey",
                boxShadow: "8px 8px 4px #888",
                borderRadius: "5px",
                margin: "5px 10%",
              }
            : {
                display: startswith(value, "$$") ? "block" : "inline",
                cursor: "pointer",
                border:
                  focused && selected
                    ? `1px solid ${FOCUSED_COLOR}`
                    : undefined,
              }
        }
      >
        {renderLaTeX()}
        {renderEditMode()}
      </span>
    );
  }
);
