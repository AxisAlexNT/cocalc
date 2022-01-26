/*
The background grid.
*/

import { CSSProperties } from "react";

const BIG_COLOR = "#f0f0f0";
const SMALL_COLOR = "#f9f9f9";

const GRID = {
  backgroundPosition: "-1.5px -1.5px, -1.5px -1.5px, -1px -1px, -1px -1px",
  backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
  backgroundImage: `linear-gradient(${BIG_COLOR} 1.5px, transparent 1.5px), linear-gradient(90deg, ${BIG_COLOR} 1.5px, transparent 1.5px), linear-gradient(${SMALL_COLOR} 1px, transparent 1px), linear-gradient(90deg, ${SMALL_COLOR} 1px, transparent 1px)`,
} as CSSProperties;

export default function Grid({ transforms, divRef }) {
  return (
    <div
      ref={divRef}
      style={{
        width: `${transforms.width / transforms.scale}px`,
        height: `${transforms.height / transforms.scale}px`,
        ...GRID,
      }}
    ></div>
  );
}
