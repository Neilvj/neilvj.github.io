/* Reads the section list in js/projects.js (read only) and reads and writes the project lists
   in data/*.json, in the same layout Pages CMS uses, so both tools can edit the same files. */
(function (root) {
  "use strict";
  const MARK = "const PROJECT_SECTIONS =";
  /* Same fields, in the same order, as the forms in .pages.yml. "link" is extra: the site supports it, the forms do not list it. */
  const FIELD_ORDER = ["title", "text", "tags", "image", "gallery", "model", "video", "camera"];
  const LIST_FIELDS = ["tags", "gallery"];
  const FILE_RE = /^data\/[A-Za-z0-9_-]+\.json$/;

  /* A small reader for the JavaScript section list in projects.js (objects, lists, text, numbers, comments).
     It never runs the file as code, and it stops with a clear message if something unexpected is in there. */
  function parseLiteral(s) {
    let i = 0;
    const fail = (m) => { throw new Error(m + " (character " + i + " of the section list)"); };
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

  /** Reads PROJECT_SECTIONS from js/projects.js: { school: [{ group, file }], personal: [{ file }] }. */
  function parseSections(src) {
    const i = src.indexOf(MARK);
    if (i < 0) throw new Error("Could not find 'const PROJECT_SECTIONS =' in js/projects.js");
    const data = parseLiteral(src.slice(i + MARK.length));
    const out = {};
    ["school", "personal"].forEach((k) => {
      const sec = data && data[k];
      if (!Array.isArray(sec) || sec.length === 0) throw new Error("js/projects.js must list at least one file under '" + k + "'");
      out[k] = sec.map((g) => {
        if (!g || typeof g.file !== "string" || !FILE_RE.test(g.file)) throw new Error("js/projects.js: every list under '" + k + "' needs a file like data/name.json");
        return { group: typeof g.group === "string" ? g.group : "", file: g.file };
      });
      if (sec.length > 1 && out[k].some((g) => !g.group)) throw new Error("js/projects.js: when '" + k + "' has several lists, each one needs a group name");
    });
    return out;
  }

  /** Reads one data/*.json file. It must be a list of projects. */
  function parseList(text, file) {
    let list;
    try { list = JSON.parse(text.replace(/^﻿/, "")); }
    catch (e) { throw new Error(file + " is not valid JSON: " + e.message); }
    if (!Array.isArray(list)) throw new Error(file + " must contain a list of projects ([ ... ])");
    list.forEach((p, n) => {
      if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error(file + ": entry " + (n + 1) + " is not a project");
    });
    return list;
  }

  /** Writes a list the way Pages CMS does: two-space indent, one line break at the end. */
  function stringifyList(list) { return JSON.stringify(list, null, 2) + "\n"; }

  /** Builds a project with every form field present and in the usual order.
      "link" is written only when filled in. Fields this app does not know are kept as they are. */
  function cleanProject(p) {
    const out = {};
    FIELD_ORDER.forEach((k) => {
      let v = p[k];
      if (LIST_FIELDS.includes(k)) v = (Array.isArray(v) ? v : (v ? [v] : [])).map((x) => String(x).trim()).filter(Boolean);
      else v = v === undefined || v === null ? "" : String(v);
      out[k] = v;
    });
    if (typeof p.link === "string" && p.link.trim()) out.link = p.link.trim();
    Object.keys(p).forEach((k) => { if (!(k in out) && k !== "link" && k !== "__proto__") out[k] = p[k]; });
    return out;
  }

  const api = { parseSections, parseList, stringifyList, cleanProject, FIELD_ORDER };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ProjectsIO = api;
})(typeof window !== "undefined" ? window : globalThis);
