/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// This file is **derived from mathjax**.  Original header below.
// https://github.com/mathjax/MathJax/blob/master/unpacked/extensions/tex2jax.js

// WHY?  We pulled this out and rewrite it some mainly because this is needed
// for the backend share server.

/*************************************************************
 *
 *  MathJax/extensions/tex2jax.js
 *
 *  Implements the TeX to Jax preprocessor that locates TeX code
 *  within the text of a document and replaces it with SCRIPT tags
 *  for processing by MathJax.
 *
 *  ---------------------------------------------------------------------
 *
 *  Copyright (c) 2009-2018 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

exports.tex2jax = {
  config: {
    inlineMath: [
      // The start/stop pairs for in-line math
      ["$", "$"], //  (comment out any you don't want, or add your own, but
      ["\\(", "\\)"], //  be sure that you don't have an extra comma at the end)
    ],

    displayMath: [
      // The start/stop pairs for display math
      ["$$", "$$"], //  (comment out any you don't want, or add your own, but
      ["\\[", "\\]"], //  be sure that you don't have an extra comma at the end)
    ],

    skipTags: [
      "script",
      "noscript",
      "style",
      "textarea",
      "pre",
      "code",
      "annotation",
      "annotation-xml",
    ],

    // The names of the tags whose contents will not be
    // scanned for math delimiters

    ignoreClass: "tex2jax_ignore", // the class name of elements whose contents should
    // NOT be processed by tex2jax.  Note that this
    // is a regular expression, so be sure to quote any
    // regexp special characters

    processClass: "tex2jax_process", // the class name of elements whose contents SHOULD
    // be processed when they appear inside ones that
    // are ignored.  Note that this is a regular expression,
    // so be sure to quote any regexp special characters

    processEscapes: true, // set to true to allow \$ to produce a dollar without
    //   starting in-line math mode

    processEnvironments: true, // set to true to process \begin{xxx}...\end{xxx} outside
    //   of math mode, false to prevent that

    processRefs: true, // set to true to process \ref{...} outside of math mode

    preview: "none", // set to "none" to not insert MathJax_Preview spans
    //   or set to an array specifying an HTML snippet
    //   to use the same preview for every equation.
  },

  //
  //  Tags to ignore when searching for TeX in the page
  //
  ignoreTags: {
    wbr: "",
    "#comment": "",
  },

  PreProcess: function (element) {
    this.config.preview = "none";
    if (this.createPatterns()) {
      this.scanElement(element, element.nextSibling);
    }
  },

  createPatterns: function () {
    let starts = [],
      parts = [],
      i,
      m,
      config = this.config;
    this.match = {};
    for (i = 0, m = config.inlineMath.length; i < m; i++) {
      starts.push(this.patternQuote(config.inlineMath[i][0]));
      this.match[config.inlineMath[i][0]] = {
        mode: "",
        end: config.inlineMath[i][1],
        pattern: this.endPattern(config.inlineMath[i][1]),
      };
    }
    for (i = 0, m = config.displayMath.length; i < m; i++) {
      starts.push(this.patternQuote(config.displayMath[i][0]));
      this.match[config.displayMath[i][0]] = {
        mode: "; mode=display",
        end: config.displayMath[i][1],
        pattern: this.endPattern(config.displayMath[i][1]),
      };
    }
    if (starts.length) {
      parts.push(starts.sort(this.sortLength).join("|"));
    }
    if (config.processEnvironments) {
      parts.push("\\\\begin\\{([^}]*)\\}");
    }
    if (config.processEscapes) {
      parts.push("\\\\*\\\\\\$");
    }
    if (config.processRefs) {
      parts.push("\\\\(eq)?ref\\{[^}]*\\}");
    }
    this.start = new RegExp(parts.join("|"), "g");
    this.skipTags = new RegExp("^(" + config.skipTags.join("|") + ")$", "i");
    const ignore = [];
    if (config.ignoreClass) {
      ignore.push(config.ignoreClass);
    }
    this.ignoreClass = ignore.length
      ? new RegExp("(^| )(" + ignore.join("|") + ")( |$)")
      : /^$/;
    this.processClass = new RegExp("(^| )(" + config.processClass + ")( |$)");
    return parts.length > 0;
  },

  patternQuote: function (s) {
    return s.replace(/([\^$(){}+*?\-|\[\]\:\\])/g, "\\$1");
  },

  endPattern: function (end) {
    return new RegExp(this.patternQuote(end) + "|\\\\.|[{}]", "g");
  },

  sortLength: function (a, b) {
    if (a.length !== b.length) {
      return b.length - a.length;
    }
    return a == b ? 0 : a < b ? -1 : 1;
  },

  scanElement: function (element, stop, ignore) {
    let cname, tname, ignoreChild, process;
    while (element && element != stop) {
      if (element.nodeName.toLowerCase() === "#text") {
        if (!ignore) {
          element = this.scanText(element);
        }
      } else {
        cname =
          typeof element.className === "undefined" ? "" : element.className;
        tname = typeof element?.tagName === "undefined" ? "" : element?.tagName;
        if (typeof cname !== "string") {
          cname = String(cname);
        } // jsxgraph uses non-string class names!
        process = this.processClass.exec(cname);
        if (
          element.firstChild &&
          !cname.match(/(^| )MathJax/) &&
          (process || !this.skipTags.exec(tname))
        ) {
          ignoreChild = (ignore || this.ignoreClass.exec(cname)) && !process;
          this.scanElement(element.firstChild, stop, ignoreChild);
        }
      }
      if (element) {
        element = element.nextSibling;
      }
    }
  },

  scanText: function (element) {
    if (element.nodeValue.replace(/\s+/, "") == "") {
      return element;
    }
    let match,
      prev,
      pos = 0,
      rescan;
    this.search = { start: true };
    this.pattern = this.start;
    while (element) {
      rescan = null;
      this.pattern.lastIndex = pos;
      pos = 0;
      while (
        element &&
        element.nodeName.toLowerCase() === "#text" &&
        (match = this.pattern.exec(element.nodeValue))
      ) {
        if (this.search.start) {
          element = this.startMatch(match, element);
        } else {
          element = this.endMatch(match, element);
        }
      }
      if (this.search.matched) element = this.encloseMath();
      else if (!this.search.start) rescan = this.search;
      if (element) {
        do {
          prev = element;
          element = element.nextSibling;
        } while (
          element &&
          this.ignoreTags[element.nodeName.toLowerCase()] != null
        );
        if (!element || element.nodeName !== "#text") {
          if (!rescan) return this.search.close ? this.prevEndMatch() : prev;
          element = rescan.open;
          pos = rescan.opos + rescan.olen + (rescan.blen || 0);
          this.search = { start: true };
          this.pattern = this.start;
        }
      }
    }
    return element;
  },

  startMatch: function (match, element) {
    const delim = this.match[match[0]];
    if (delim != null) {
      // a start delimiter
      this.search = {
        end: delim.end,
        mode: delim.mode,
        pcount: 0,
        open: element,
        olen: match[0].length,
        opos: this.pattern.lastIndex - match[0].length,
      };
      this.switchPattern(delim.pattern);
    } else if (match[0].substr(0, 6) === "\\begin") {
      // \begin{...}
      this.search = {
        end: "\\end{" + match[1] + "}",
        mode: "; mode=display",
        pcount: 0,
        open: element,
        olen: 0,
        opos: this.pattern.lastIndex - match[0].length,
        blen: match[1].length + 3,
        isBeginEnd: true,
      };
      this.switchPattern(this.endPattern(this.search.end));
    } else if (
      match[0].substr(0, 4) === "\\ref" ||
      match[0].substr(0, 6) === "\\eqref"
    ) {
      this.search = {
        mode: "",
        end: "",
        open: element,
        pcount: 0,
        olen: 0,
        opos: this.pattern.lastIndex - match[0].length,
      };
      return this.endMatch([""], element);
    } else {
      // put $ in a span so it doesn't get processed again
      // split off backslashes so they don't get removed later
      let slashes = match[0].substr(0, match[0].length - 1),
        n,
        span;
      if (slashes.length % 2 === 0) {
        span = [slashes.replace(/\\\\/g, "\\")];
        n = 1;
      } else {
        span = [slashes.substr(1).replace(/\\\\/g, "\\"), "$"];
        n = 0;
      }
      span = $("<span>").text(span.join(""))[0];
      const text = document.createTextNode(
        element.nodeValue.substr(0, match.index)
      );
      element.nodeValue = element.nodeValue.substr(
        match.index + match[0].length - n
      );
      element.parentNode.insertBefore(span, element);
      element.parentNode.insertBefore(text, span);
      this.pattern.lastIndex = n;
    }
    return element;
  },

  endMatch: function (match, element) {
    const search = this.search;
    if (match[0] == search.end) {
      if (!search.close || search.pcount === 0) {
        search.close = element;
        search.cpos = this.pattern.lastIndex;
        search.clen = search.isBeginEnd ? 0 : match[0].length;
      }
      if (search.pcount === 0) {
        search.matched = true;
        element = this.encloseMath();
        this.switchPattern(this.start);
      }
    } else if (match[0] === "{") {
      search.pcount++;
    } else if (match[0] === "}" && search.pcount) {
      search.pcount--;
    }
    return element;
  },
  prevEndMatch: function () {
    this.search.matched = true;
    const element = this.encloseMath();
    this.switchPattern(this.start);
    return element;
  },

  switchPattern: function (pattern) {
    pattern.lastIndex = this.pattern.lastIndex;
    this.pattern = pattern;
    this.search.start = pattern === this.start;
  },

  encloseMath: function () {
    let search = this.search,
      close = search.close,
      CLOSE,
      math,
      next;
    if (search.cpos === close.length) {
      close = close.nextSibling;
    } else {
      close = close.splitText(search.cpos);
    }
    if (!close) {
      CLOSE = close = search.close.parentNode.appendChild(
        document.createTextNode("")
      );
    }
    search.close = close;
    math = search.opos ? search.open.splitText(search.opos) : search.open;
    while ((next = math.nextSibling) && next !== close) {
      if (next.nodeValue !== null) {
        if (next.nodeName === "#comment") {
          math.nodeValue += next.nodeValue.replace(
            /^\[CDATA\[((.|\n|\r)*)\]\]$/,
            "$1"
          );
        } else {
          math.nodeValue += next.nodeValue;
        }
      } else {
        const ignore = this.ignoreTags[next.nodeName.toLowerCase()];
        math.nodeValue += ignore == null ? " " : ignore;
      }
      math.parentNode.removeChild(next);
    }
    const TeX = math.nodeValue.substr(
      search.olen,
      math.nodeValue.length - search.olen - search.clen
    );
    math.parentNode.removeChild(math);
    math = this.createMathTag(search.mode, TeX);
    this.search = {};
    this.pattern.lastIndex = 0;
    if (CLOSE) {
      CLOSE.parentNode.removeChild(CLOSE);
    }
    return math;
  },

  insertNode: function (node) {
    const search = this.search;
    search.close.parentNode.insertBefore(node, search.close);
  },

  createMathTag: function (mode, tex) {
    const script = $("<script>");
    script.attr("type", "math/tex" + mode);
    script.text(tex);
    this.insertNode(script[0]);
    return script[0];
  },

  filterPreview: function (tex) {
    return tex;
  },
};
