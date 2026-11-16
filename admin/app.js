/* Portfolio admin. Edits js/projects.js and uploads photos, videos and 3D models to the repo.
   Runs only in your browser; the GitHub token never leaves your phone except to talk to api.github.com. */
(function () {
  "use strict";
  const IO = window.ProjectsIO, GH = window.GH, CFG = window.GH_CONFIG;
  const TOKEN_KEY = "portfolio_admin_token";
  const PROJECTS_PATH = "js/projects.js";
  const MAX_FILE_MB = 90;
  const SLICERS = ["OrcaSlicer", "Creality Print", "Bambu Studio", "PreForm", "GrabCAD Print"];   // always offered as tap-to-add tags

  const app = document.getElementById("app");
  const S = { gh: null, header: "", data: null, loadedSha: "", files: new Set(), pending: new Map(), changes: [], tab: "school", group: 0, reformat: false };

  /* ---------- tiny helpers ---------- */
  function h(tag, props) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el) el[k] = v;
      else el.setAttribute(k, v);
    }
    for (const kid of Array.prototype.slice.call(arguments, 2).flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
  }
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } };
  const setToken = (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) { /* private mode */ } };
  const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } };
  const fmtBytes = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const slug = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const grouped = (arr) => arr.length > 0 && Array.isArray(arr[0].projects);
  const dirty = () => S.changes.length > 0;

  function overlay(content, center) {
    const ov = h("div", { class: "overlay" + (center ? " center" : "") }, content);
    document.body.append(ov);
    return ov;
  }
  function askText(title, value, okLabel) {
    return new Promise((resolve) => {
      const input = h("input", { type: "text", value: value || "" });
      const close = (v) => { ov.remove(); resolve(v); };
      const ov = overlay(h("div", { class: "sheet dialog" },
        h("h2", { text: title }), input,
        h("div", { class: "actions" },
          h("button", { class: "btn ghost", text: "Cancel", onclick: () => close(null) }),
          h("button", { class: "btn grow", text: okLabel || "OK", onclick: () => close(input.value.trim()) }))), true);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") close(input.value.trim()); });
      input.focus();
    });
  }
  function confirmBox(title, message, okLabel, danger) {
    return new Promise((resolve) => {
      const close = (v) => { ov.remove(); resolve(v); };
      const ov = overlay(h("div", { class: "sheet dialog" },
        h("h2", { text: title }), h("p", { class: "note", text: message }),
        h("div", { class: "actions" },
          h("button", { class: "btn ghost", text: "Cancel", onclick: () => close(false) }),
          h("button", { class: "btn grow" + (danger ? " danger" : ""), text: okLabel || "OK", onclick: () => close(true) }))), true);
    });
  }

  /* ---------- data helpers ---------- */
  function eachProject(fn) {
    ["school", "personal"].forEach((k) => {
      const sec = S.data[k];
      if (grouped(sec)) sec.forEach((g) => g.projects.forEach(fn)); else sec.forEach(fn);
    });
  }
  function curList() {
    const sec = S.data[S.tab];
    if (grouped(sec)) { if (S.group >= sec.length) S.group = 0; return sec[S.group].projects; }
    return sec;
  }
  function referencedPaths() {
    const set = new Set();
    eachProject((p) => {
      if (p.image) set.add("images/" + p.image);
      (p.gallery || []).forEach((g) => set.add("images/" + g));
      if (p.video) set.add("animation/" + p.video);
      if (p.model) set.add("models/" + p.model);
    });
    return set;
  }
  function allTags() {
    const set = new Set();
    eachProject((p) => (p.tags || []).forEach((t) => set.add(t)));
    return [...set];
  }
  function filesIn(dir) { return [...S.files].filter((p) => p.startsWith(dir + "/")).map((p) => p.slice(dir.length + 1)).filter((n) => !n.includes("/")).sort(); }
  function imgSrc(name) {
    const p = S.pending.get("images/" + name);
    return p ? p.url : "../images/" + encodeURIComponent(name);
  }
  function uniqueName(dir, base, ext) {
    let n = 1, name;
    do { name = base + (n > 1 ? "-" + n : "") + "." + ext; n++; } while (S.files.has(dir + "/" + name) || S.pending.has(dir + "/" + name));
    return name;
  }
  function log(msg) { if (!S.changes.includes(msg)) S.changes.push(msg); }

  async function resizeImage(file, maxW, quality) {
    if (!/^image\//.test(file.type)) throw new Error("That file is not a picture.");
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, (maxW || 1600) / bmp.width);
    const w = Math.round(bmp.width * scale), hgt = Math.round(bmp.height * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = hgt;
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, hgt); ctx.drawImage(bmp, 0, 0, w, hgt);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not convert the picture."))), "image/jpeg", quality || 0.85));
  }

  /* ---------- start, login, load ---------- */
  function start() {
    const t = getToken();
    if (!t) return renderLogin();
    S.gh = new GH(t);
    load();
  }
  function renderLogin(err) {
    const input = h("input", { type: "password", autocomplete: "off", placeholder: "github_pat_…", autocapitalize: "off", spellcheck: false });
    const go = async () => {
      const t = input.value.trim();
      if (!t) return;
      btn.disabled = true; btn.textContent = "Checking…";
      const gh = new GH(t);
      try { await gh.checkAccess(); setToken(t); S.gh = gh; load(); }
      catch (e) { renderLogin(e.message); }
    };
    const btn = h("button", { class: "btn", text: "Log in", onclick: go });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    app.replaceChildren(h("div", { class: "login" },
      h("h1", { text: "Portfolio admin" }),
      h("p", { text: "Paste your GitHub token for " + CFG.REPO + ". It is saved only in this browser." }),
      err ? h("div", { class: "error", text: err }) : null,
      h("label", { text: "GitHub token" }), input,
      h("div", { class: "actions" }, btn)));
    input.focus();
  }
  async function load() {
    app.replaceChildren(h("p", { class: "boot", text: "Loading your projects…" }));
    try {
      await S.gh.checkAccess();
      const [f, files] = await Promise.all([S.gh.getText(PROJECTS_PATH), S.gh.listFiles()]);
      const parsed = IO.parse(f.text);
      S.header = parsed.header; S.data = parsed.data; S.loadedSha = f.sha;
      S.files = new Set(files); S.pending = new Map(); S.changes = [];
      S.reformat = IO.stringify(parsed.header, parsed.data) !== f.text;
      S.tab = "school"; S.group = 0;
      render();
    } catch (e) {
      app.replaceChildren(h("div", { class: "login" },
        h("h1", { text: "Could not load" }),
        h("div", { class: "error", text: e.message }),
        h("div", { class: "actions" },
          h("button", { class: "btn", text: "Try again", onclick: load }),
          h("button", { class: "btn ghost", text: "Log out", onclick: () => { clearToken(); S.gh = null; renderLogin(); } }))));
    }
  }
  async function logout() {
    if (dirty() && !(await confirmBox("Log out?", "You have unpublished changes. They will be lost.", "Log out", true))) return;
    S.changes = []; clearToken(); S.gh = null; renderLogin();
  }

  /* ---------- main screen ---------- */
  function render() {
    const sec = S.data[S.tab];
    const isGrouped = grouped(sec);
    const list = curList();

    const tabs = h("div", { class: "tabs", role: "tablist" },
      [["school", "School projects"], ["personal", "Personal projects"]].map(([k, label]) =>
        h("button", { class: "tab", role: "tab", "aria-selected": String(S.tab === k), text: label, onclick: () => { S.tab = k; S.group = 0; render(); } })));

    let chips = null;
    if (isGrouped) {
      chips = h("div", { class: "chips" },
        sec.map((g, i) => h("button", { class: "chip", "aria-selected": String(i === S.group), text: g.group + " (" + g.projects.length + ")", onclick: () => { S.group = i; render(); } })),
        h("button", { class: "chip add", text: "+ Group", onclick: addGroup }));
    }
    const groupTools = isGrouped ? h("div", { class: "chips" },
      h("button", { class: "link", text: "Rename group", onclick: renameGroup }),
      h("button", { class: "link", text: "Delete group", onclick: deleteGroup })) : null;

    const rows = list.length ? list.map((p, i) => row(p, i, list)) : [h("p", { class: "empty", text: "No projects here yet." })];

    app.replaceChildren(h("div", {},
      h("div", { class: "bar" },
        h("h1", { text: "Portfolio admin" }),
        h("a", { class: "link", href: CFG.SITE, target: "_blank", rel: "noopener", text: "View site" }),
        h("button", { class: "link", text: "Log out", onclick: logout })),
      h("div", { class: "wrap" },
        S.reformat ? h("p", { class: "note warn", text: "js/projects.js is formatted a little differently from what this app writes. The first publish will tidy the layout; the content stays the same." }) : null,
        tabs, chips, groupTools,
        h("button", { class: "btn newbtn", text: "+ New project", onclick: () => openEditor(null) }), rows),
      h("div", { class: "publish" },
        h("span", { class: "count", text: dirty() ? S.changes.length + " unpublished change" + (S.changes.length > 1 ? "s" : "") : "Everything is published" }),
        h("button", { class: "btn", text: "Publish", disabled: !dirty(), onclick: publishFlow }))));
  }
  function row(p, i, list) {
    const thumb = h("div", { class: "thumb" }, p.image ? h("img", { src: imgSrc(p.image), alt: "", loading: "lazy" }) : (p.model ? "3D" : "No image"));
    return h("div", { class: "row" }, thumb,
      h("div", { class: "meta" }, h("strong", { text: p.title }), h("span", { text: (p.tags || []).join(" · ") })),
      h("div", { class: "acts" },
        h("button", { class: "icon", "aria-label": "Move up", text: "▲", disabled: i === 0, onclick: () => move(list, i, -1) }),
        h("button", { class: "icon", "aria-label": "Move down", text: "▼", disabled: i === list.length - 1, onclick: () => move(list, i, 1) }),
        h("button", { class: "btn small", text: "Edit", onclick: () => openEditor(i) })));
  }
  function move(list, i, d) {
    const t = list[i]; list[i] = list[i + d]; list[i + d] = t;
    log("Reordered: " + t.title); render();
  }
  async function addGroup() {
    const name = await askText("New group", "", "Add");
    if (!name) return;
    S.data.school.push({ group: name, projects: [] });
    S.group = S.data.school.length - 1; log("Added group: " + name); render();
  }
  async function renameGroup() {
    const g = S.data[S.tab][S.group];
    const name = await askText("Rename group", g.group, "Save");
    if (!name || name === g.group) return;
    log("Renamed group: " + g.group + " → " + name); g.group = name; render();
  }
  async function deleteGroup() {
    const g = S.data[S.tab][S.group];
    if (g.projects.length) { toast("Move or delete the projects in this group first."); return; }
    if (!(await confirmBox("Delete group?", "Delete the empty group “" + g.group + "”?", "Delete", true))) return;
    S.data[S.tab].splice(S.group, 1); S.group = 0; log("Deleted group: " + g.group); render();
  }

  /* ---------- editor ---------- */
  function openEditor(idx) {
    const sec = S.data[S.tab];
    const isGrouped = grouped(sec);
    const list = curList();
    const existing = idx !== null ? list[idx] : null;
    const d = existing ? JSON.parse(JSON.stringify(existing)) : { title: "", text: "", tags: [], image: "" };
    d.tags = d.tags || []; d.gallery = d.gallery || [];
    let groupIdx = S.group;
    const added = [];
    let ov;

    const errBox = h("div", { class: "error" }); errBox.hidden = true;
    const showErr = (m) => { errBox.textContent = m; errBox.hidden = !m; };

    const title = h("input", { type: "text", value: d.title, oninput: () => { d.title = title.value; } });
    const text = h("textarea", { value: d.text, oninput: () => { d.text = text.value; } });
    const tagInput = h("input", { type: "text", value: d.tags.join(", "), placeholder: "Fusion, Render", autocapitalize: "off", oninput: () => { d.tags = tagInput.value.split(",").map((t) => t.trim()).filter(Boolean); drawPills(); } });
    const pills = h("div", {});
    function drawPills() {
      const pill = (t) => h("button", { type: "button", class: "pill" + (d.tags.includes(t) ? " on" : ""), text: t, onclick: () => {
        d.tags = d.tags.includes(t) ? d.tags.filter((x) => x !== t) : d.tags.concat(t);
        tagInput.value = d.tags.join(", "); drawPills();
      } });
      const known = allTags();
      const others = known.concat(d.tags.filter((t) => !known.includes(t))).filter((t) => !SLICERS.includes(t));
      pills.replaceChildren(
        h("div", { class: "note taglabel", text: "Slicer" }), h("div", { class: "tagpills" }, SLICERS.map(pill)),
        h("div", { class: "note taglabel", text: "Other tags" }), h("div", { class: "tagpills" }, others.map(pill)));
    }

    const photos = [d.image].concat(d.gallery).filter(Boolean);   // first photo = thumbnail on the card
    const photosArea = h("div", {});
    function drawPhotos() {
      const status = h("div", { class: "progress" });
      const add = h("input", { type: "file", accept: "image/*", multiple: true, onchange: async () => {
        const fs = Array.from(add.files); if (!fs.length) return;
        showErr("");
        for (let i = 0; i < fs.length; i++) {
          status.textContent = "Preparing photo " + (i + 1) + " of " + fs.length + "…";
          try { photos.push(await addPhoto(fs[i], slug(d.title) || "project")); } catch (e) { showErr(fs[i].name + ": " + e.message); }
        }
        drawPhotos();
      } });
      const known = filesIn("images").filter((n) => !photos.includes(n));
      const pick = h("select", { onchange: () => { if (pick.value) { photos.push(pick.value); drawPhotos(); } } },
        h("option", { value: "", text: "Add a photo already on the site…" }), known.map((n) => h("option", { value: n, text: n })));
      const swap = (i, j) => { const t = photos[i]; photos[i] = photos[j]; photos[j] = t; drawPhotos(); };
      const tiles = photos.map((n, i) => h("div", { class: "ptile" + (i === 0 ? " first" : "") },
        h("img", { src: imgSrc(n), alt: "" }),
        i === 0 ? h("span", { class: "badge", text: "Thumbnail" }) : null,
        h("div", { class: "pacts" },
          i > 0 ? h("button", { type: "button", class: "icon sm star", title: "Use as thumbnail", "aria-label": "Use as thumbnail", text: "★", onclick: () => { photos.splice(i, 1); photos.unshift(n); drawPhotos(); } }) : null,
          h("button", { type: "button", class: "icon sm", "aria-label": "Move earlier", text: "◀", disabled: i === 0, onclick: () => swap(i, i - 1) }),
          h("button", { type: "button", class: "icon sm", "aria-label": "Move later", text: "▶", disabled: i === photos.length - 1, onclick: () => swap(i, i + 1) }),
          h("button", { type: "button", class: "icon sm", "aria-label": "Remove photo", text: "×", onclick: () => { photos.splice(i, 1); drawPhotos(); } }))));
      photosArea.replaceChildren(
        photos.length ? h("div", { class: "photos" }, tiles) : h("p", { class: "note", text: "No photos yet." }),
        h("div", { class: "pickrow" }, h("label", { class: "btn ghost small filebtn", text: "Add photos" }, add)),
        h("div", {}, pick), status);
      photosArea.querySelectorAll("label.filebtn").forEach((l) => { l.style.margin = "0"; });
    }
    async function addPhoto(file, base) {
      const blob = await resizeImage(file);
      const name = uniqueName("images", base, "jpg");
      S.pending.set("images/" + name, { blob: blob, url: URL.createObjectURL(blob) });
      added.push("images/" + name);
      return name;
    }
    async function addRaw(file, dir, allowed) {
      const m = /\.([A-Za-z0-9]+)$/.exec(file.name);
      const ext = m ? m[1].toLowerCase() : "";
      if (!allowed.includes(ext)) throw new Error("That file type is not supported here (use " + allowed.join(", ") + ").");
      if (file.size > MAX_FILE_MB * 1048576) throw new Error("That file is " + fmtBytes(file.size) + ". The limit here is " + MAX_FILE_MB + " MB.");
      const name = uniqueName(dir, slug(file.name.replace(/\.[^.]+$/, "")) || "file", ext);
      S.pending.set(dir + "/" + name, { blob: file, url: "" });
      added.push(dir + "/" + name);
      return name;
    }

    const mediaArea = h("div", {});
    function drawMedia() {
      const vid = h("input", { type: "file", accept: "video/mp4,.mp4", onchange: async () => {
        const f = vid.files[0]; if (!f) return; showErr("");
        try { d.video = await addRaw(f, "animation", ["mp4"]); } catch (e) { showErr(e.message); } drawMedia();
      } });
      const mod = h("input", { type: "file", accept: ".glb", onchange: async () => {
        const f = mod.files[0]; if (!f) return; showErr("");
        try { d.model = await addRaw(f, "models", ["glb"]); } catch (e) { showErr(e.message); } drawMedia();
      } });
      mediaArea.replaceChildren(
        h("label", { text: "Video (mp4)" }),
        d.video ? h("div", { class: "note", text: d.video }) : null,
        h("div", { class: "pickrow" },
          h("label", { class: "btn ghost small filebtn", text: d.video ? "Replace video" : "Choose video" }, vid),
          d.video ? h("button", { type: "button", class: "btn ghost small", text: "Remove", onclick: () => { d.video = ""; drawMedia(); } }) : null),
        h("label", { text: "3D model (.glb)" }),
        d.model ? h("div", { class: "note", text: d.model }) : null,
        h("div", { class: "pickrow" },
          h("label", { class: "btn ghost small filebtn", text: d.model ? "Replace model" : "Choose model" }, mod),
          d.model ? h("button", { type: "button", class: "btn ghost small", text: "Remove", onclick: () => { d.model = ""; drawMedia(); } }) : null),
        null);
      mediaArea.querySelectorAll("label.filebtn").forEach((l) => { l.style.margin = "0"; });
    }

    const camera = h("input", { type: "text", value: d.camera || "", oninput: () => { d.camera = camera.value; } });
    const link = h("input", { type: "text", value: d.link || "", placeholder: "https://… or a PDF", oninput: () => { d.link = link.value; } });
    const groupSel = isGrouped ? h("select", { onchange: () => { groupIdx = Number(groupSel.value); } },
      sec.map((g, i) => h("option", { value: String(i), text: g.group, selected: i === groupIdx }))) : null;

    const hasOptional = !!(d.video || d.model || d.camera || d.link);
    const sheet = h("div", { class: "sheet" },
      h("h2", { text: existing ? "Edit project" : "New project" }),
      errBox,
      h("label", { text: "Title" }), title,
      isGrouped ? [h("label", { text: "Group" }), groupSel] : null,
      h("label", {}, "Description ", h("span", { class: "hint", text: "(1–2 sentences)" })), text,
      h("label", {}, "Tags ", h("span", { class: "hint", text: "(separate with commas, or tap below)" })), tagInput, pills,
      h("label", {}, "Photos ", h("span", { class: "hint", text: "(the first one is the thumbnail on the card; tap ★ to choose another)" })), photosArea,
      h("details", { open: hasOptional },
        h("summary", { text: "More: video, 3D model, camera, link" }),
        mediaArea,
        h("label", { text: "Camera (for scans)" }), camera,
        h("label", { text: "Link (opens instead of the viewer)" }), link),
      h("div", { class: "actions" },
        h("button", { class: "btn ghost", text: "Cancel", onclick: () => close(false) }),
        existing ? h("button", { class: "btn danger", text: "Delete", onclick: del }) : null,
        h("button", { class: "btn grow", text: "Save", onclick: save })));

    function close(keep) {
      if (!keep) added.forEach((p) => { const x = S.pending.get(p); if (x && x.url) URL.revokeObjectURL(x.url); S.pending.delete(p); });
      ov.remove();
    }
    async function del() {
      if (!(await confirmBox("Delete project?", "“" + existing.title + "” is removed from the site when you publish. Its picture files stay in the repo.", "Delete", true))) return;
      list.splice(idx, 1); log("Deleted: " + existing.title); close(false); render();
    }
    function save() {
      if (!d.title.trim()) { showErr("Give the project a title."); title.focus(); return; }
      d.title = d.title.trim();
      d.image = photos[0] || ""; d.gallery = photos.slice(1);
      const clean = IO.cleanProject(d);
      const target = isGrouped ? sec[groupIdx].projects : sec;
      if (!existing) { target.push(clean); log("Added: " + clean.title); }
      else {
        const same = JSON.stringify(clean) === JSON.stringify(IO.cleanProject(existing));
        const moved = isGrouped && groupIdx !== S.group;
        if (moved) { list.splice(idx, 1); target.push(clean); }
        else list[idx] = clean;
        if (moved) log("Moved: " + clean.title); else if (!same) log("Edited: " + clean.title);
      }
      if (isGrouped) S.group = groupIdx;
      close(true); render();
    }

    drawPills(); drawPhotos(); drawMedia();
    ov = overlay(sheet);
    if (!existing) title.focus();
  }

  /* ---------- publish ---------- */
  function publishFlow() {
    const refs = referencedPaths();
    const upload = [...S.pending.entries()].filter(([p]) => refs.has(p) && !S.files.has(p));
    const missing = [...refs].filter((p) => !S.files.has(p) && !S.pending.has(p));
    const total = upload.reduce((n, [, v]) => n + v.blob.size, 0);
    const msg = S.changes.length <= 3 ? "Admin: " + S.changes.join("; ") : "Admin: update projects (" + S.changes.length + " changes)";
    const body = h("div", {});
    const sheet = h("div", { class: "sheet dialog" }, body);
    const ov = overlay(sheet, true);

    function summary() {
      body.replaceChildren(
        h("h2", { text: "Publish to the site?" }),
        h("ul", { class: "changes" }, S.changes.map((c) => h("li", { text: c }))),
        h("p", { class: "note", text: upload.length ? upload.length + " new file" + (upload.length > 1 ? "s" : "") + " to upload (" + fmtBytes(total) + ")." : "No new files to upload." }),
        missing.length ? h("div", { class: "error", text: "These files are used by a project but are not on the site or in this upload:\n" + missing.join("\n") + "\nEdit the project and choose the file again." }) : null,
        h("div", { class: "actions" },
          h("button", { class: "btn ghost", text: "Cancel", onclick: () => ov.remove() }),
          h("button", { class: "btn grow", text: "Publish now", disabled: missing.length > 0, onclick: run })));
    }
    async function run() {
      const progress = h("p", { class: "progress", text: "Starting…" });
      body.replaceChildren(h("h2", { text: "Publishing…" }), progress);
      try {
        const sha = await S.gh.fileSha(PROJECTS_PATH);
        if (sha !== S.loadedSha) throw Object.assign(new Error("js/projects.js was changed on GitHub after you opened this page (maybe from your computer). To avoid overwriting that, nothing was saved. Reload to get the latest version; your unpublished changes here will be lost."), { stale: true });
        const text = IO.stringify(S.header, S.data);
        const files = [{ path: PROJECTS_PATH, blob: new Blob([text], { type: "text/javascript" }) }]
          .concat(upload.map(([p, v]) => ({ path: p, blob: v.blob })));
        await S.gh.commit(files, msg, (m) => { progress.textContent = m; });
        S.loadedSha = await S.gh.fileSha(PROJECTS_PATH);
        upload.forEach(([p]) => S.files.add(p));
        S.changes = []; S.reformat = false;
        body.replaceChildren(
          h("h2", { class: "ok", text: "Published" }),
          h("p", { class: "note", text: "GitHub is updating the site. New content usually shows up within 1–2 minutes (refresh the page if you don't see it yet)." }),
          h("div", { class: "actions" },
            h("a", { class: "btn ghost", href: CFG.SITE, target: "_blank", rel: "noopener", text: "Open the site" }),
            h("button", { class: "btn grow", text: "Done", onclick: () => { ov.remove(); render(); } })));
      } catch (e) {
        body.replaceChildren(
          h("h2", { text: "Not published" }),
          h("div", { class: "error", text: e.message }),
          h("div", { class: "actions" },
            h("button", { class: "btn ghost", text: "Close", onclick: () => ov.remove() }),
            e.stale ? h("button", { class: "btn grow", text: "Reload", onclick: () => { ov.remove(); S.changes = []; load(); } })
                    : h("button", { class: "btn grow", text: "Try again", onclick: summary })));
      }
    }
    summary();
  }

  window.addEventListener("beforeunload", (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  start();
})();
