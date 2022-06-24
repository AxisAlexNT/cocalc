import { parseTableOfContents as parseMarkdownTOC } from "@cocalc/frontend/markdown";
import { TableOfContentsEntry as Entry } from "@cocalc/frontend/components";
import { ElementsMap } from "./types";
import sortedElements from "./sorted-elements";

export default function parseTableOfContents(
  elementsMap: ElementsMap
): Entry[] {
  const entries: Entry[] = [];
  const state: any = {};
  for (const element of sortedElements(elementsMap)) {
    if (element.str) {
      let n = 0;
      for (const entry of parseMarkdownTOC(element.str, state)) {
        n += 1;
        entry.id = `${n}-${element.id}`;
        entries.push(entry);
      }
    }
  }
  return entries;
}
