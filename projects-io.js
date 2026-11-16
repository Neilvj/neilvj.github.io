/* Reads and writes js/projects.js. Keeps the long comment block at the top exactly as it is
   and writes the list back in the same style you would type by hand. */
(function (root) {
  "use strict";
  const MARK = "const PROJECTS =";
  const FIELD_ORDER = ["title", "text", "tags", "image", "video", "model", "camera", "gallery", "link"];

  /* A small reader for the JavaScript list in projects.js (objects, lists, text, numbers, comments).
     It never runs the file as code, and it stops with a clear message if something unexpected is in there. */
  function parseLiteral(s) {
    let i = 0;
    const fail = (m) => { throw new Error(m + " (character " + i + " of the project list)"); };
    function ws() {
      for (;;) {
        while (i < s.length && /\s/.test(s[i])) i++;
        if (s.startsWith("//", i)) { while (i < s.length && s[i] !== "\n") i++; }
        else if (s.startsWith("/*", i)) { const e = s.indexOf("*/", i + 2); if (e < 0) fail("Unclosed comment"); i = e + 2; }
        else return;
      }
    }
    function str() {
      const q = s[i++]; let out = "";
      while (i < s.length && s[i] !== q) {
        if (s[i] === "\\") {
          i++; const c = s[i++];
          const simple = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", "0": "\0" };
          if (c === "u") { const h = s.slice(i, i + 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) fail("Bad \\u escape"); out += String.fromCharCode(parseInt(h, 16)); i += 4; }
          else out += simple[c] !== undefined ? simple[c] : c;
        } else out += s[i++];
      }
      if (i >= s.length) fail("Unclosed text");
      i++; return out;
    }
    function key() {
      ws();
      if (s[i] === '"' || s[i] === "'") return str();
      const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(s.slice(i));
      if (!m) fail("Expected a name");
      i += m[0].length; return m[0];
    }
    function obj() {
      i++; const o = {};
      for (;;) {
        ws(); if (s[i] === "}") { i++; return o; }
        const k = key(); if (k === "__proto__") fail("Name not allowed");
        ws(); if (s[i] !== ":") fail("Expected ':'"); i++;
        o[k] = val(); ws();
        if (s[i] === ",") { i++; continue; }
        if (s[i] === "}") { i++; return o; }
        fail("Expected ',' or '}'");
      }
    }
    function arr() {
      i++; const a = [];
      for (;;) {
        ws(); if (s[i] === "]") { i++; return a; }
        a.push(val()); ws();
        if (s[i] === ",") { i++; continue; }
        if (s[i] === "]") { i++; return a; }
        fail("Expected ',' or ']'");
      }
    }
    function val() {
      ws(); const c = s[i];
      if (c === "{") return obj();
      if (c === "[") return arr();
      if (c === '"' || c === "'") return str();
      const n = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
      if (n) { i += n[0].length; return Number(n[0]); }
      const w = /^(true|false|null)\b/.exec(s.slice(i));
      if (w) { i += w[0].length; return w[1] === "true" ? true : w[1] === "false" ? false : null; }
      return fail("Unexpected '" + (c || "end of file") + "'");
    }
    const v = val(); ws();
    if (s[i] === ";") { i++; ws(); }
    if (i < s.length) fail("Unexpected text after the list");
    return v;
  }

  function parse(src) {
    const i = src.indexOf(MARK);
    if (i < 0) throw new Error("Could not find 'const PROJECTS =' in js/projects.js");
    const data = parseLiteral(src.slice(i + MARK.length));
    if (!data || typeof data !== "object" || !Array.isArray(data.school) || !Array.isArray(data.personal)) {
      throw new Error("projects.js must contain a school list and a personal list");
    }
    return { header: src.slice(0, i), data };
  }

  const isIdent = (k) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);
  const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
  const pad = (n) => "  ".repeat(n);

  function ser(v, depth) {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "number" || typeof v === "boolean" || v === null) return String(v);
    if (Array.isArray(v)) {
      if (v.length === 0) return "[]";
      if (isStringArray(v)) return "[" + v.map((s) => JSON.stringify(s)).join(", ") + "]";
      return "[\n" + v.map((x) => pad(depth + 1) + ser(x, depth + 1)).join(",\n") + "\n" + pad(depth) + "]";
    }
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (keys.length === 0) return "{}";
    return "{\n" + keys.map((k) => pad(depth + 1) + (isIdent(k) ? k : JSON.stringify(k)) + ": " + ser(v[k], depth + 1)).join(",\n") + "\n" + pad(depth) + "}";
  }

  function stringify(header, data) {
    const keys = Object.keys(data);
    const parts = keys.map((k) => pad(1) + k + ": " + ser(data[k], 1));
    return header + MARK + " {\n\n" + parts.join(",\n\n") + "\n};\n";
  }

  /** Builds a project object with fields in the usual order and empty optional fields left out. */
  function cleanProject(p) {
    const out = {};
    FIELD_ORDER.forEach((k) => {
      let v = p[k];
      if (k === "tags") v = (v || []).filter(Boolean);
      if (k === "gallery") v = (v || []).filter(Boolean);
      const optional = ["video", "model", "camera", "gallery", "link"].includes(k);
      if (optional && (v === undefined || v === "" || (Array.isArray(v) && v.length === 0))) return;
      if (v === undefined) v = k === "tags" || k === "gallery" ? [] : "";
      out[k] = v;
    });
    return out;
  }

  const api = { parse, stringify, cleanProject, FIELD_ORDER };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ProjectsIO = api;
})(typeof window !== "undefined" ? window : globalThis);
