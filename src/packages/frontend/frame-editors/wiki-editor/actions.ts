/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
Media wiki Editor Actions
*/

import { reuseInFlight } from "async-await-utils/hof";
import { Actions as MarkdownActions } from "../markdown-editor/actions";
import { convert } from "./wiki2html";
import { FrameTree } from "../frame-tree/types";
import { print_html } from "../frame-tree/print";
import { aux_file } from "@cocalc/util/misc";
import { raw_url } from "../frame-tree/util";

export class Actions extends MarkdownActions {
  private run_wiki2html: Function;
  private _last_wiki_hash: string = "";

  _init2(): void {
    if (!this.is_public) {
      // one extra thing after base class init...
      this._init_wiki2html();
    }
  }

  _init_wiki2html(): void {
    this.run_wiki2html = reuseInFlight(this._run_wiki2html.bind(this));
    this._syncstring.on(
      "save-to-disk",
      reuseInFlight(async () => {
        if (this._syncstring == null) return;
        const hash = this._syncstring.hash_of_saved_version();
        if (this._last_wiki_hash != hash) {
          this._last_wiki_hash = hash;
          await this.run_wiki2html();
        }
      })
    );

    this._syncstring.once("ready", this.run_wiki2html.bind(this));
  }

  async _run_wiki2html(time?: number): Promise<void> {
    this.set_status("Converting wiki to html (using pandoc)...");
    try {
      await convert(this.project_id, this.path, time);
      this.set_reload("html");
    } catch (err) {
      this.set_error(err);
    } finally {
      this.set_status("");
    }
  }

  _raw_default_frame_tree(): FrameTree {
    if (this.is_public) {
      return { type: "cm" };
    } else {
      return {
        direction: "col",
        type: "node",
        first: {
          type: "cm",
        },
        second: {
          type: "html",
        },
      };
    }
  }

  print(id: string): void {
    const node = this._get_frame_node(id);
    if (!node) return;
    const type = node.get("type");
    if (type == "cm") {
      super.print(id);
      return;
    }
    if (type != "html") {
      // no other types support printing
      this.set_error("printing of #{type} not implemented");
      return;
    }
    try {
      print_html({
        src: raw_url(this.project_id, aux_file(this.path, "html")),
      });
    } catch (err) {
      this.set_error(err);
    }
  }
}
