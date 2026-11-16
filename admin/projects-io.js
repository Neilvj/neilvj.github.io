/* All reading and writing of the site's files, with no screen code:
   - js/projects.js  which pages (lists) exist, and their button names
   - data/*.json     the project lists, in the same layout Pages CMS uses
   - .pages.yml      the Pages CMS forms (one per list)
   - js/config.js    the site text (read only) and data/site.js (the changes made in this app) */
(function (root) {
  "use strict";
  const MARK = "const PROJECT_SECTIONS =";
  const SITE_MARK = "const SITE =";
  const EDITS_MARK = "const SITE_EDITS =";
  const SECTION_LABELS = { school: "School projects", personal: "Personal projects" };
  /* Same fields, in the same order, as the forms in .pages.yml. "link" is extra: the site supports it, the forms do not list it. */
  const FIELD_ORDER = ["title", "text", "tags", "image", "gallery", "model", "video", "camera"];
  const LIST_FIELDS = ["tags", "gallery"];
  const FILE_RE = /^data\/[A-Za-z0-9_-]+\.json$/;

  /* A small reader for the JavaScript in projects.js, config.js and site.js (objects, lists, text, numbers, comments).
     It never runs the file as code, and it stops with a clear message if something unexpected is in there. */
  function parseLiteral(s, what) {
    let i = 0;
    const fail = (m) => { throw new Error(m + " (character " + i + " of " + what + ")"); };
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
    const data = parseLiteral(src.slice(i + MARK.length), "the page list in js/projects.js");
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

  /** Everything in js/projects.js above the page list (the explanation at the top), kept as it is. */
  function sectionsHeader(src) { return src.slice(0, src.indexOf(MARK)); }

  /** Writes the page list back into js/projects.js. sections = { school: [{ group, file }], personal: [...] } */
  function stringifySections(header, sections) {
    const block = (k) => {
      const sec = sections[k];
      const w = Math.max.apply(null, sec.map((g) => (g.group ? JSON.stringify(g.group).length : 0)));
      const rows = sec.map((g) => {
        if (!g.group) return "    { file: " + JSON.stringify(g.file) + " }" + (sec.length === 1 ? "       /* no group name = plain list without buttons */" : "");
        const name = JSON.stringify(g.group) + ",";
        return "    { group: " + name + " ".repeat(w + 1 - name.length) + " file: " + JSON.stringify(g.file) + " }";
      });
      /* the comma goes after the closing brace, before any comment */
      return "  " + k + ": [\n" + rows.map((r, n) => (n < rows.length - 1 ? r.replace(/ \}/, " },") : r)).join("\n") + "\n  ]";
    };
    return header + MARK + " {\n" + ["school", "personal"].map(block).join(",\n") + "\n};\n";
  }

  const sectionLabel = (key, group) => SECTION_LABELS[key] + (group ? " - " + group : "");

  /* ---------- .pages.yml (Pages CMS forms) ----------
     Works on the text line by line so comments and layout stay as they are.
     upserts: [{ file, name, label }] - make sure this list has a form with this label (copied from the first form).
     removes: [file] - take away the form of a deleted list.
     Returns the new text, or null when the file does not have the expected layout (then it is left alone). */
  function ymlSync(text, upserts, removes) {
    const nl = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    const ci = lines.findIndex((l) => /^content:\s*$/.test(l));
    if (ci < 0) return null;
    const q = (v) => (/^[\p{L}\p{N}][\p{L}\p{N} _()&+.\/-]*$/u.test(v) && !/\s-\s*$/.test(v) && v.trim() === v && !/ #/.test(v) ? v : JSON.stringify(v));
    function scan() {
      let end = lines.length;
      for (let i = ci + 1; i < lines.length; i++) { if (/^[^\s#]/.test(lines[i])) { end = i; break; } }
      while (end > ci + 1 && lines[end - 1].trim() === "") end--;
      const starts = [];
      let indent = null;
      for (let i = ci + 1; i < end; i++) {
        const m = /^(\s*)- name:\s*\S/.exec(lines[i]);
        if (m && (indent === null || m[1].length === indent)) { indent = m[1].length; starts.push(i); }
      }
      const blocks = starts.map((st, n) => {
        const en = n + 1 < starts.length ? starts[n + 1] : end;
        let path = "";
        for (let i = st; i < en; i++) { const pm = /^\s+path:\s*["']?([^"'\s]+)["']?\s*$/.exec(lines[i]); if (pm) { path = pm[1].replace(/^\//, ""); break; } }
        return { start: st, end: en, path: path };
      });
      return { end: end, indent: indent, blocks: blocks };
    }
    const setLine = (b, indent, key, value) => {
      const re = new RegExp("^" + " ".repeat(indent) + (key === "name" ? "- name" : "  " + key) + ":");
      for (let i = b.start; i < b.end; i++) { if (re.test(lines[i])) { lines[i] = lines[i].replace(/:.*$/, ": " + value); return true; } }
      return false;
    };
    for (const file of removes || []) {
      const sc = scan();
      const b = sc.blocks.find((x) => x.path === file);
      if (b && sc.blocks.length > 1) lines.splice(b.start, b.end - b.start);
    }
    for (const u of upserts || []) {
      let sc = scan();
      if (sc.indent === null || !sc.blocks.length) return null;
      let b = sc.blocks.find((x) => x.path === u.file);
      if (!b) {
        const t = sc.blocks[0];
        const copy = lines.slice(t.start, t.end);
        while (copy.length && copy[copy.length - 1].trim() === "") copy.pop();
        lines.splice(sc.end, 0, ...copy);
        b = { start: sc.end, end: sc.end + copy.length };
        if (!setLine(b, sc.indent, "name", u.name) || !setLine(b, sc.indent, "path", u.file)) return null;
      }
      if (!setLine(b, sc.indent, "label", q(u.label))) return null;
    }
    return lines.join(nl);
  }

  /* ---------- site text: js/config.js (read only) + data/site.js (this app's changes) ---------- */
  function parseSite(src) {
    const i = src.indexOf(SITE_MARK);
    if (i < 0) throw new Error("Could not find 'const SITE =' in js/config.js");
    const v = parseLiteral(src.slice(i + SITE_MARK.length), "js/config.js");
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("js/config.js: SITE must be a list of settings ({ ... })");
    return v;
  }
  function parseEdits(src) {
    const i = src.indexOf(EDITS_MARK);
    if (i < 0) throw new Error("Could not find 'const SITE_EDITS =' in data/site.js");
    const v = parseLiteral(src.slice(i + EDITS_MARK.length), "data/site.js");
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("data/site.js: SITE_EDITS must be { ... }");
    return v;
  }
  const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  /** Lays the changes over the settings the same way js/main.js does on the site. */
  function overlay(base, edits) {
    const out = clone(base);
    (function go(to, from) {
      Object.keys(from || {}).forEach((k) => {
        if (k === "__proto__") return;
        if (isObj(from[k]) && isObj(to[k])) go(to[k], from[k]); else to[k] = clone(from[k]);
      });
    })(out, edits);
    return out;
  }
  /* The settings this app edits. Each one: [name in the app, where it sits in SITE]. */
  const SITE_FIELDS = [
    ["hello", ["hello"]], ["role", ["role"]], ["tagline", ["tagline"]], ["subtitle", ["subtitle"]], ["stats", ["stats"]],
    ["aboutPhoto", ["aboutPhoto"]], ["aboutEn", ["aboutText", "en", "paragraphs"]], ["aboutSv", ["aboutText", "sv", "paragraphs"]],
    ["logo", ["logo"]], ["cv", ["cv"]], ["cvLabel", ["cvLabel"]],
    ["linkedin", ["contact", "linkedin"]], ["discord", ["contact", "discord"]], ["links", ["contact", "links"]]
  ];
  const LIST_SITE_FIELDS = ["stats", "aboutEn", "aboutSv", "links"];
  const dig = (o, path) => path.reduce((x, k) => (isObj(x) ? x[k] : undefined), o);
  /** Picks the settings this app edits out of SITE, as one flat list of fields. */
  function pickSite(site) {
    const out = {};
    SITE_FIELDS.forEach(([name, path]) => {
      const v = dig(site, path);
      if (LIST_SITE_FIELDS.includes(name)) out[name] = Array.isArray(v) ? clone(v) : [];
      else out[name] = v === undefined || v === null ? "" : String(v);
    });
    out.stats = out.stats.filter(isObj).map((s) => ({ number: String(s.number === undefined ? "" : s.number), label: String(s.label || "") }));
    out.links = out.links.filter(isObj).map((l) => ({ label: String(l.label || ""), url: String(l.url || "") }));
    out.aboutEn = out.aboutEn.map(String); out.aboutSv = out.aboutSv.map(String);
    return out;
  }
  /** Builds what goes into data/site.js: only settings that differ from js/config.js.
      Anything else already in data/site.js is kept. */
  function toEdits(fields, defaults, existing) {
    const out = clone(existing || {});
    SITE_FIELDS.forEach(([name, path]) => {
      const same = JSON.stringify(fields[name]) === JSON.stringify(defaults[name]);
      let o = out;
      if (same) {
        const chain = [out];
        for (let i = 0; i < path.length - 1; i++) { o = isObj(o) ? o[path[i]] : undefined; chain.push(o); }
        if (isObj(o)) delete o[path[path.length - 1]];
        for (let i = path.length - 2; i >= 0; i--) { if (isObj(chain[i + 1]) && Object.keys(chain[i + 1]).length === 0) delete chain[i][path[i]]; }
        return;
      }
      for (let i = 0; i < path.length - 1; i++) { if (!isObj(o[path[i]])) o[path[i]] = {}; o = o[path[i]]; }
      o[path[path.length - 1]] = clone(fields[name]);
    });
    return out;
  }
  function stringifyEdits(edits) {
    return '/* Text and pictures changed in the admin app (neilvj.github.io/admin, "Site" tab).\n' +
      "   Written by the app: change these settings there, not here.\n" +
      "   A setting listed here wins over the same setting in js/config.js. */\n" +
      EDITS_MARK + " " + JSON.stringify(edits, null, 2) + ";\n";
  }

  const api = { parseSections, sectionsHeader, stringifySections, sectionLabel, parseList, stringifyList, cleanProject, FIELD_ORDER,
    ymlSync, parseSite, parseEdits, overlay, pickSite, toEdits, stringifyEdits };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ProjectsIO = api;
})(typeof window !== "undefined" ? window : globalThis);
