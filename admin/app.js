/* Portfolio admin.
   - Projects: edits the lists in data/*.json (the same files Pages CMS edits) and uploads photos, videos and 3D models.
   - Pages: the text buttons above the cards (CAD, Scanning). Adding, renaming or deleting one updates js/projects.js,
     its data file and its Pages CMS form in .pages.yml.
   - Site: hero text, About photo and text, logo, CV and contact buttons. Saved in data/site.js, which the site lays over js/config.js.
   Runs only in your browser; the GitHub token never leaves your phone except to talk to api.github.com. */
(function () {
  "use strict";
  const IO = window.ProjectsIO, GH = window.GH, CFG = window.GH_CONFIG;
  const TOKEN_KEY = "portfolio_admin_token";
  const SECTIONS_PATH = "js/projects.js", CONFIG_PATH = "js/config.js", SITE_PATH = "data/site.js", YML_PATH = ".pages.yml";
  const MAX_FILE_MB = 90;
  const MAX_NAME = 30;

  const app = document.getElementById("app");
  /* S.data = { school: [list, ...], personal: [list] }, each list = { group, file, sha, loaded, projects, isNew, ymlDirty }
     S.site = the Site tab's fields (see SITE_FIELDS in projects-io.js); S.siteDefaults = the same fields as js/config.js has them */
  const S = { gh: null, data: null, files: new Set(), pending: new Map(), changes: [], tab: "school", group: 0,
    sectionsSha: "", sectionsHeader: "", sectionsLoaded: "", deleted: [],
    site: null, siteDefaults: null, siteLoaded: "", siteEdits: {}, siteSha: null, siteError: "", siteOpen: new Set(["hero"]) };

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
  const grouped = (sec) => sec.length > 1 || !!sec[0].group;
  const allLists = () => S.data.school.concat(S.data.personal);
  const shape = () => JSON.stringify({ school: S.data.school.map((l) => [l.group, l.file]), personal: S.data.personal.map((l) => [l.group, l.file]) });
  const isHttp = (u) => /^https?:\/\/\S+$/i.test(String(u || "").trim());

  /* What the Site tab changed, in plain words (worked out by comparing with what was loaded) */
  const SITE_WORDS = { hello: "hero text", role: "hero text", tagline: "hero text", subtitle: "hero text", stats: "hero numbers",
    aboutPhoto: "About photo", aboutEn: "About text (English)", aboutSv: "About text (Swedish)", logo: "logo", cv: "CV", cvLabel: "CV button text",
    linkedin: "contact buttons", discord: "contact buttons", links: "contact buttons" };
  function siteChanges() {
    if (!S.site) return [];
    const was = JSON.parse(S.siteLoaded), out = [];
    Object.keys(SITE_WORDS).forEach((k) => {
      if (JSON.stringify(S.site[k]) !== JSON.stringify(was[k]) && !out.includes("Site: " + SITE_WORDS[k])) out.push("Site: " + SITE_WORDS[k]);
    });
    return out;
  }
  const allChanges = () => S.changes.concat(siteChanges());
  const dirty = () => allChanges().length > 0;

  function overlay(content, center) {
    const ov = h("div", { class: "overlay" + (center ? " center" : "") }, content);
    document.body.append(ov);
    return ov;
  }
  function askText(title, value, okLabel, note) {
    return new Promise((resolve) => {
      const input = h("input", { type: "text", value: value || "", maxLength: MAX_NAME });
      const close = (v) => { ov.remove(); resolve(v); };
      const ov = overlay(h("div", { class: "sheet dialog" },
        h("h2", { text: title }), note ? h("p", { class: "note", text: note }) : null, input,
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
  function eachProject(fn) { allLists().forEach((l) => l.projects.forEach(fn)); }
  function curList() {
    const sec = S.data[S.tab];
    if (S.group >= sec.length) S.group = 0;
    return sec[S.group].projects;
  }
  function referencedPaths() {
    const set = new Set();
    eachProject((p) => {
      if (p.image) set.add("images/" + p.image);
      (p.gallery || []).forEach((g) => set.add("images/" + g));
      if (p.video) set.add("animation/" + p.video);
      if (p.model) set.add("models/" + p.model);
    });
    if (S.site) {
      if (S.site.logo) set.add("images/" + S.site.logo);
      if (S.site.aboutPhoto) set.add("images/" + S.site.aboutPhoto);
      if (S.site.cv) set.add("documents/" + S.site.cv);
    }
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
    const taken = (p) => S.files.has(p) || S.pending.has(p) || (S.data && allLists().some((l) => l.file === p));
    do { name = base + (n > 1 ? "-" + n : "") + "." + ext; n++; } while (taken(dir + "/" + name));
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
  /* A file waits in S.pending until Publish. Only files that something still points to are uploaded. */
  async function stagePhoto(file, base, maxW) {
    const blob = await resizeImage(file, maxW);
    const name = uniqueName("images", base, "jpg");
    S.pending.set("images/" + name, { blob: blob, url: URL.createObjectURL(blob) });
    return name;
  }
  function stageRaw(file, dir, allowed, keepName) {
    const m = /\.([A-Za-z0-9]+)$/.exec(file.name);
    const ext = m ? m[1].toLowerCase() : "";
    if (!allowed.includes(ext)) throw new Error("That file type is not supported here (use " + allowed.join(", ") + ").");
    if (file.size > MAX_FILE_MB * 1048576) throw new Error("That file is " + fmtBytes(file.size) + ". The limit here is " + MAX_FILE_MB + " MB.");
    const stem = file.name.replace(/\.[^.]+$/, "");
    let name;
    if (keepName) {
      /* keeps the file name people will download (e.g. Neil-Ramnarine-CV.pdf) and replaces a file with the same name */
      name = (stem.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file") + "." + ext;
    } else name = uniqueName(dir, slug(stem) || "file", ext);
    const isImg = /^(png|jpe?g|webp|svg)$/.test(ext);
    S.pending.set(dir + "/" + name, { blob: file, url: isImg ? URL.createObjectURL(file) : "", overwrite: !!keepName });
    return name;
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
    app.replaceChildren(h("p", { class: "boot", text: "Loading your site…" }));
    try {
      await S.gh.checkAccess();
      const [f, files] = await Promise.all([S.gh.getText(SECTIONS_PATH), S.gh.listFiles()]);
      const data = IO.parseSections(f.text);
      await Promise.all(data.school.concat(data.personal).map(async (l) => {
        if (!files.includes(l.file)) throw new Error("js/projects.js points to " + l.file + ", but that file is not in the repo.");
        const t = await S.gh.getText(l.file);
        l.projects = IO.parseList(t.text, l.file);
        l.sha = t.sha; l.loaded = JSON.stringify(l.projects);
      }));
      S.data = data; S.sectionsSha = f.sha; S.sectionsHeader = IO.sectionsHeader(f.text); S.sectionsLoaded = shape(); S.deleted = [];
      S.files = new Set(files); S.pending = new Map(); S.changes = [];
      /* Site text. If it cannot be read, the project tabs still work and the Site tab says why. */
      S.site = null; S.siteError = ""; S.siteEdits = {}; S.siteSha = null;
      try {
        const defaults = IO.parseSite((await S.gh.getText(CONFIG_PATH)).text);
        if (files.includes(SITE_PATH)) { const t = await S.gh.getText(SITE_PATH); S.siteEdits = IO.parseEdits(t.text); S.siteSha = t.sha; }
        S.siteDefaults = IO.pickSite(defaults);
        S.site = IO.pickSite(IO.overlay(defaults, S.siteEdits));
        S.siteLoaded = JSON.stringify(S.site);
      } catch (e) { S.siteError = e.message; }
      if (S.tab !== "site") S.tab = "school";
      S.group = 0;
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
    S.changes = []; S.site = null; clearToken(); S.gh = null; renderLogin();
  }

  /* ---------- main screen ---------- */
  function publishBar() {
    const n = allChanges().length;
    return h("div", { class: "publish" },
      h("span", { class: "count", text: n ? n + " unpublished change" + (n > 1 ? "s" : "") : "Everything is published" }),
      h("button", { class: "btn", text: "Publish", disabled: !n, onclick: publishFlow }));
  }
  function refreshBar() { const old = app.querySelector(".publish"); if (old) old.replaceWith(publishBar()); }

  function render() {
    const tabs = h("div", { class: "tabs three", role: "tablist" },
      [["school", "School projects"], ["personal", "Personal projects"], ["site", "Site"]].map(([k, label]) =>
        h("button", { class: "tab", role: "tab", "aria-selected": String(S.tab === k), text: label, onclick: () => { S.tab = k; S.group = 0; render(); } })));
    app.replaceChildren(h("div", {},
      h("div", { class: "bar" },
        h("h1", { text: "Portfolio admin" }),
        h("a", { class: "link", href: CFG.SITE, target: "_blank", rel: "noopener", text: "View site" }),
        h("button", { class: "link", text: "Log out", onclick: logout })),
      h("div", { class: "wrap" }, tabs, S.tab === "site" ? siteBody() : projectsBody()),
      publishBar()));
  }

  function projectsBody() {
    const sec = S.data[S.tab];
    const isGrouped = grouped(sec);
    const list = curList();
    const chips = h("div", { class: "chips" },
      isGrouped ? sec.map((g, i) => h("button", { class: "chip", "aria-selected": String(i === S.group), text: g.group + " (" + g.projects.length + ")", onclick: () => { S.group = i; render(); } })) : null,
      h("button", { class: "chip add", text: "+ Page", onclick: addPage }));
    const pageTools = isGrouped ? h("div", { class: "linkrow" },
      h("button", { class: "link", text: "Rename page", onclick: renamePage }),
      h("button", { class: "link", text: "Delete page", onclick: deletePage })) : null;
    const rows = list.length ? list.map((p, i) => row(p, i, list)) : [h("p", { class: "empty", text: "No projects here yet. The site shows “Coming soon” for an empty page." })];
    return [chips, pageTools, h("button", { class: "btn newbtn", text: "+ New project", onclick: () => openEditor(null) }), rows];
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

  /* ---------- pages (the text buttons above the cards) ---------- */
  function checkPageName(name, sec, except) {
    if (!name) return "";
    if (sec.some((g) => g !== except && g.group.toLowerCase() === name.toLowerCase())) { toast("There is already a page called “" + name + "” here."); return ""; }
    return name;
  }
  async function addPage() {
    const sec = S.data[S.tab];
    let firstName = "";
    if (!grouped(sec)) {
      firstName = checkPageName(await askText("Name the current list", "", "Next",
        "This section is one plain list today. With a second page, buttons appear above the cards, so the projects you already have need a button name too."), sec);
      if (!firstName) return;
    }
    const name = await askText("New page", "", "Add", "The name on the new button, for example “Printing”.");
    if (!name || name.toLowerCase() === firstName.toLowerCase() || !checkPageName(name, sec)) { if (name) toast("Pick a different name for the new page."); return; }
    if (firstName) { sec[0].group = firstName; sec[0].ymlDirty = true; }
    const file = "data/" + uniqueName("data", slug(name) || "page", "json");
    sec.push({ group: name, file: file, sha: null, loaded: "[]", projects: [], isNew: true, ymlDirty: true });
    S.group = sec.length - 1; log("Added page: " + name); render();
  }
  async function renamePage() {
    const sec = S.data[S.tab], g = sec[S.group];
    const name = checkPageName(await askText("Rename page", g.group, "Save"), sec, g);
    if (!name || name === g.group) return;
    log("Renamed page: " + g.group + " → " + name); g.group = name; g.ymlDirty = true; render();
  }
  async function deletePage() {
    const sec = S.data[S.tab], g = sec[S.group];
    if (g.projects.length) { toast("Move or delete the " + g.projects.length + " project" + (g.projects.length > 1 ? "s" : "") + " on this page first."); return; }
    const last = sec.length === 2;
    if (!(await confirmBox("Delete page?", "Delete the empty page “" + g.group + "”?" + (last ? " One page is left after that, so the site shows it as a plain list without buttons." : ""), "Delete", true))) return;
    sec.splice(S.group, 1);
    if (!g.isNew) S.deleted.push(g.file);
    if (sec.length === 1) { sec[0].group = ""; sec[0].ymlDirty = true; }
    S.group = 0; log("Deleted page: " + g.group); render();
  }

  /* ---------- project editor ---------- */
  function openEditor(idx) {
    const sec = S.data[S.tab];
    const isGrouped = grouped(sec);
    const list = curList();
    const existing = idx !== null ? list[idx] : null;
    const d = existing ? JSON.parse(JSON.stringify(existing)) : { title: "", text: "", tags: [], image: "" };
    const asList = (v) => (Array.isArray(v) ? v : (v ? [v] : [])).map(String);
    d.title = String(d.title || ""); d.text = String(d.text || ""); d.tags = asList(d.tags); d.gallery = asList(d.gallery);
    let groupIdx = S.group;
    const added = [];
    let ov;

    const errBox = h("div", { class: "error" }); errBox.hidden = true;
    const showErr = (m) => { errBox.textContent = m; errBox.hidden = !m; };

    const title = h("input", { type: "text", value: d.title, oninput: () => { d.title = title.value; } });
    const text = h("textarea", { value: d.text, oninput: () => { d.text = text.value; } });
    const tagInput = h("input", { type: "text", value: d.tags.join(", "), placeholder: "Fusion, Render", autocapitalize: "off", oninput: () => { d.tags = tagInput.value.split(",").map((t) => t.trim()).filter(Boolean); drawPills(); } });
    const pills = h("div", { class: "tagpills" });
    function drawPills() {
      pills.replaceChildren(...allTags().concat(d.tags.filter((t) => !allTags().includes(t))).map((t) =>
        h("button", { type: "button", class: "pill" + (d.tags.includes(t) ? " on" : ""), text: t, onclick: () => {
          d.tags = d.tags.includes(t) ? d.tags.filter((x) => x !== t) : d.tags.concat(t);
          tagInput.value = d.tags.join(", "); drawPills();
        } })));
    }

    const imgArea = h("div", {});
    function drawImage() {
      const photo = h("input", { type: "file", accept: "image/*", onchange: async () => {
        const f = photo.files[0]; if (!f) return;
        showErr(""); status.textContent = "Preparing photo…";
        try { d.image = await addPhoto(f, slug(d.title) || "project"); } catch (e) { showErr(e.message); }
        status.textContent = ""; drawImage();
      } });
      const known = filesIn("images");
      const pick = h("select", { onchange: () => { if (pick.value) { d.image = pick.value; drawImage(); } } },
        h("option", { value: "", text: "Use a photo already on the site…" }), known.map((n) => h("option", { value: n, text: n })));
      const status = h("div", { class: "progress" });
      imgArea.replaceChildren(
        d.image ? h("img", { class: "preview", src: imgSrc(d.image), alt: "" }) : null,
        h("div", { class: "pickrow" },
          h("label", { class: "btn ghost small filebtn", text: d.image ? "Replace photo" : "Choose photo" }, photo),
          d.image ? h("button", { type: "button", class: "btn ghost small", text: "Remove", onclick: () => { d.image = ""; drawImage(); } }) : null),
        d.image ? h("div", { class: "hint note", text: d.image }) : null,
        h("div", {}, pick), status);
      imgArea.querySelectorAll("label.filebtn").forEach((l) => { l.style.margin = "0"; });
    }
    async function addPhoto(file, base) {
      const name = await stagePhoto(file, base);
      added.push("images/" + name);
      return name;
    }
    function addRaw(file, dir, allowed) {
      const name = stageRaw(file, dir, allowed);
      added.push(dir + "/" + name);
      return name;
    }

    const mediaArea = h("div", {});
    function drawMedia() {
      const vid = h("input", { type: "file", accept: "video/mp4,.mp4", onchange: () => {
        const f = vid.files[0]; if (!f) return; showErr("");
        try { d.video = addRaw(f, "animation", ["mp4"]); } catch (e) { showErr(e.message); } drawMedia();
      } });
      const mod = h("input", { type: "file", accept: ".glb", onchange: () => {
        const f = mod.files[0]; if (!f) return; showErr("");
        try { d.model = addRaw(f, "models", ["glb"]); } catch (e) { showErr(e.message); } drawMedia();
      } });
      const gal = h("input", { type: "file", accept: "image/*", multiple: true, onchange: async () => {
        showErr("");
        try { for (const f of Array.from(gal.files)) d.gallery.push(await addPhoto(f, (slug(d.title) || "project") + "-extra")); } catch (e) { showErr(e.message); }
        drawMedia();
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
        h("label", { text: "Extra photos (opened in the popup)" }),
        h("div", { class: "gal" }, d.gallery.map((n, i) => h("div", {}, h("img", { src: imgSrc(n), alt: "" }),
          h("button", { type: "button", "aria-label": "Remove photo", text: "×", onclick: () => { d.gallery.splice(i, 1); drawMedia(); } })))),
        h("label", { class: "btn ghost small filebtn", text: "Add photos" }, gal));
      mediaArea.querySelectorAll("label.filebtn").forEach((l) => { l.style.margin = "0"; });
    }

    const camera = h("input", { type: "text", value: d.camera || "", oninput: () => { d.camera = camera.value; } });
    const link = h("input", { type: "text", value: d.link || "", placeholder: "https://… or a PDF", oninput: () => { d.link = link.value; } });
    const groupSel = isGrouped ? h("select", { onchange: () => { groupIdx = Number(groupSel.value); } },
      sec.map((g, i) => h("option", { value: String(i), text: g.group, selected: i === groupIdx }))) : null;

    const hasOptional = !!(d.video || d.model || d.camera || d.link || d.gallery.length);
    const sheet = h("div", { class: "sheet" },
      h("h2", { text: existing ? "Edit project" : "New project" }),
      errBox,
      h("label", { text: "Title" }), title,
      isGrouped ? [h("label", { text: "Page" }), groupSel] : null,
      h("label", {}, "Description ", h("span", { class: "hint", text: "(1–2 sentences)" })), text,
      h("label", {}, "Tags ", h("span", { class: "hint", text: "(separate with commas, or tap below)" })), tagInput, pills,
      h("label", { text: "Main photo" }), imgArea,
      h("details", { open: hasOptional },
        h("summary", { text: "More: video, 3D model, extra photos, camera, link" }),
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
      const clean = IO.cleanProject(d);
      const target = sec[isGrouped ? groupIdx : 0].projects;
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

    drawPills(); drawImage(); drawMedia();
    ov = overlay(sheet);
    if (!existing) title.focus();
  }

  /* ---------- Site tab ---------- */
  function siteBody() {
    if (!S.site) return [h("div", { class: "error", text: "The site text could not be read, so this tab is switched off. The project tabs still work.\n" + S.siteError })];
    const s = S.site;
    /* remember which blocks are open, so they stay open when the screen is redrawn */
    app.querySelectorAll("details.sec").forEach((d) => { if (d.open) S.siteOpen.add(d.dataset.id); else S.siteOpen.delete(d.dataset.id); });
    const waiting = (p) => { const v = S.pending.get(p); return !!v && (v.overwrite || !S.files.has(p)); };
    const errBox = h("div", { class: "error" }); errBox.hidden = true;
    const showErr = (m) => { errBox.textContent = m; errBox.hidden = !m; if (m) errBox.scrollIntoView({ block: "center" }); };
    const input = (obj, key, props) => { const el = h("input", Object.assign({ type: "text", value: obj[key], oninput: () => { obj[key] = el.value; refreshBar(); } }, props || {})); return el; };
    const area = (arr, i) => { const el = h("textarea", { value: arr[i], oninput: () => { arr[i] = el.value; refreshBar(); } }); return el; };
    const field = (label, hint, el) => [h("label", {}, label, hint ? [" ", h("span", { class: "hint", text: hint })] : null), el];
    const removeBtn = (label, fn) => h("button", { type: "button", class: "icon", "aria-label": label, text: "×", onclick: () => { fn(); render(); } });
    const section = (id, title, ...kids) => {
      const el = h("details", { class: "sec", open: S.siteOpen.has(id) }, h("summary", { text: title }), kids);
      el.dataset.id = id;
      return el;
    };
    const fileBtn = (label, accept, onFile) => {
      const inp = h("input", { type: "file", accept: accept, onchange: async () => {
        const f = inp.files[0]; if (!f) return;
        showErr("");
        try { await onFile(f); } catch (e) { showErr(e.message); return; }
        render();
      } });
      const l = h("label", { class: "btn ghost small filebtn", text: label }, inp); l.style.margin = "0";
      return l;
    };
    const paragraphs = (title, arr, lang) => [
      h("div", { class: "sub", text: title }),
      arr.map((p, i) => { const t = area(arr, i); t.lang = lang; return h("div", { class: "pair" }, t, arr.length > 1 ? removeBtn("Remove paragraph", () => arr.splice(i, 1)) : null); }),
      h("button", { type: "button", class: "btn ghost small", text: "+ Paragraph", onclick: () => { arr.push(""); render(); } })];

    return [
      h("p", { class: "note", text: "Changes here show on the site after you press Publish." }), errBox,

      section("hero", "Hero text",
        field("Greeting", "(the big word)", input(s, "hello")),
        field("Role", "", input(s, "role")),
        field("Tagline", "(shown after the role)", input(s, "tagline")),
        field("Line under it", "", input(s, "subtitle")),
        h("div", { class: "sub", text: "Numbers" }),
        s.stats.map((st, i) => h("div", { class: "pair" },
          input(st, "number", { class: "narrow", "aria-label": "Number", inputMode: "numeric" }), input(st, "label", { "aria-label": "What the number means" }),
          removeBtn("Remove number", () => s.stats.splice(i, 1)))),
        s.stats.length < 4 ? h("button", { type: "button", class: "btn ghost small", text: "+ Number", onclick: () => { s.stats.push({ number: "", label: "" }); render(); } }) : null),

      section("about", "About me",
        h("div", { class: "sub", text: "Photo" }),
        s.aboutPhoto ? h("img", { class: "preview small", src: imgSrc(s.aboutPhoto), alt: "" }) : h("p", { class: "note", text: "No photo." }),
        h("div", { class: "pickrow" },
          fileBtn(s.aboutPhoto ? "Replace photo" : "Choose photo", "image/*", async (f) => { s.aboutPhoto = await stagePhoto(f, "neil-portrait", 1200); }),
          s.aboutPhoto ? h("button", { type: "button", class: "btn ghost small", text: "Remove", onclick: () => { s.aboutPhoto = ""; render(); } }) : null),
        h("p", { class: "note", text: "The site shows it in black and white." }),
        paragraphs("Text in English", s.aboutEn, "en"),
        paragraphs("Text in Swedish", s.aboutSv, "sv")),

      section("files", "Logo and CV",
        h("div", { class: "sub", text: "Logo (top left of the site)" }),
        s.logo ? h("img", { class: "preview logo", src: imgSrc(s.logo), alt: "" }) : h("p", { class: "note", text: "No logo." }),
        h("div", { class: "pickrow" }, fileBtn(s.logo ? "Replace logo" : "Choose logo", ".png,.svg,.webp,.jpg,.jpeg", (f) => { s.logo = stageRaw(f, "images", ["png", "svg", "webp", "jpg", "jpeg"]); })),
        h("div", { class: "sub", text: "CV (PDF)" }),
        h("p", { class: "note", text: s.cv ? "Now: " + s.cv + (waiting("documents/" + s.cv) ? " (new file, not published yet)" : "") : "No CV. The download button is hidden." }),
        h("div", { class: "pickrow" },
          fileBtn(s.cv ? "Replace CV" : "Choose CV", ".pdf,application/pdf", (f) => { s.cv = stageRaw(f, "documents", ["pdf"], true); }),
          s.cv ? h("button", { type: "button", class: "btn ghost small", text: "Remove", onclick: () => { s.cv = ""; render(); } }) : null),
        h("p", { class: "note", text: "Visitors download the file with the name it has when you choose it." }),
        field("Text on the download button", "", input(s, "cvLabel", { placeholder: "Download CV" }))),

      section("contact", "Contact buttons",
        h("p", { class: "note", text: "The buttons in the Contact section. “Send me a message” and the CV button are always there." }),
        field("LinkedIn address", "(empty = no button)", input(s, "linkedin", { placeholder: "https://www.linkedin.com/in/…", autocapitalize: "off", inputMode: "url" })),
        field("Discord", "(a link, or just your username)", input(s, "discord", { autocapitalize: "off" })),
        h("div", { class: "sub", text: "More buttons" }),
        s.links.length ? null : h("p", { class: "note", text: "None yet. For example Printables, MakerWorld or GitHub." }),
        s.links.map((l, i) => h("div", { class: "pair stack" },
          input(l, "label", { placeholder: "Text on the button", "aria-label": "Text on the button" }),
          input(l, "url", { class: "grow", placeholder: "https://…", "aria-label": "Web address", autocapitalize: "off", inputMode: "url" }),
          h("button", { type: "button", class: "icon", "aria-label": "Move up", text: "▲", disabled: i === 0, onclick: () => { s.links.splice(i - 1, 0, s.links.splice(i, 1)[0]); render(); } }),
          removeBtn("Remove button", () => s.links.splice(i, 1)))),
        s.links.length < 6 ? h("button", { type: "button", class: "btn ghost small", text: "+ Button", onclick: () => { s.links.push({ label: "", url: "" }); render(); } }) : null)
    ];
  }
  /* Tidies the Site fields before publishing and returns what still has to be fixed. */
  function siteProblems() {
    const s = S.site, out = [];
    if (!s || !siteChanges().length) return out;
    ["hello", "role", "tagline", "subtitle", "cvLabel", "linkedin", "discord"].forEach((k) => { s[k] = s[k].trim(); });
    s.stats = s.stats.map((x) => ({ number: x.number.trim(), label: x.label.trim() })).filter((x) => x.number || x.label);
    s.links = s.links.map((x) => ({ label: x.label.trim(), url: x.url.trim() })).filter((x) => x.label || x.url);
    s.aboutEn = s.aboutEn.map((p) => p.trim()).filter(Boolean); s.aboutSv = s.aboutSv.map((p) => p.trim()).filter(Boolean);
    if (!s.hello) out.push("Hero text: the greeting is empty.");
    if (s.stats.some((x) => !x.number || !x.label)) out.push("Hero text: every number needs both a number and a text.");
    if (!s.aboutEn.length || !s.aboutSv.length) out.push("About me: the text needs at least one paragraph in each language.");
    if (s.linkedin && !isHttp(s.linkedin)) out.push("Contact buttons: the LinkedIn address must start with https://");
    s.links.forEach((l) => {
      if (!l.label) out.push("Contact buttons: a button has no text.");
      else if (!isHttp(l.url)) out.push("Contact buttons: the address for “" + l.label + "” must start with https://");
    });
    return out;
  }

  /* ---------- publish ---------- */
  function publishFlow() {
    const problems = siteProblems();
    const changes = allChanges();
    if (!changes.length) { render(); return; }
    const refs = referencedPaths();
    const upload = [...S.pending.entries()].filter(([p, v]) => refs.has(p) && (v.overwrite || !S.files.has(p)));
    const missing = [...refs].filter((p) => !S.files.has(p) && !S.pending.has(p));
    const total = upload.reduce((n, [, v]) => n + v.blob.size, 0);
    const msg = changes.length <= 3 ? "Admin: " + changes.join("; ") : "Admin: update site (" + changes.length + " changes)";
    const body = h("div", {});
    const sheet = h("div", { class: "sheet dialog" }, body);
    const ov = overlay(sheet, true);
    const done = () => { ov.remove(); render(); };

    function summary() {
      body.replaceChildren(
        h("h2", { text: "Publish to the site?" }),
        h("ul", { class: "changes" }, changes.map((c) => h("li", { text: c }))),
        h("p", { class: "note", text: upload.length ? upload.length + " file" + (upload.length > 1 ? "s" : "") + " to upload (" + fmtBytes(total) + ")." : "No new files to upload." }),
        problems.length ? h("div", { class: "error", text: "Fix this on the Site tab first:\n" + problems.join("\n") }) : null,
        missing.length ? h("div", { class: "error", text: "These files are used but are not on the site or in this upload:\n" + missing.join("\n") + "\nChoose the file again." }) : null,
        h("div", { class: "actions" },
          h("button", { class: "btn ghost", text: "Cancel", onclick: done }),
          h("button", { class: "btn grow", text: "Publish now", disabled: missing.length > 0 || problems.length > 0, onclick: run })));
    }
    async function run() {
      const progress = h("p", { class: "progress", text: "Starting…" });
      body.replaceChildren(h("h2", { text: "Publishing…" }), progress);
      const stale = (what) => Object.assign(new Error(what + " was changed on GitHub after you opened this page (maybe in Pages CMS or from your computer). To avoid overwriting that, nothing was saved. Reload to get the latest version; your unpublished changes here will be lost."), { stale: true });
      try {
        progress.textContent = "Checking for other changes…";
        const files = [];
        /* project lists */
        const changed = allLists().filter((l) => l.isNew || JSON.stringify(l.projects) !== l.loaded);
        for (const l of changed) {
          if (!l.isNew && (await S.gh.fileSha(l.file)) !== l.sha) throw stale(l.file);
          files.push({ path: l.file, blob: new Blob([IO.stringifyList(l.projects)], { type: "application/json" }) });
        }
        /* pages: js/projects.js, deleted lists, Pages CMS forms */
        const structure = shape() !== S.sectionsLoaded;
        const deletes = S.deleted.filter((p) => S.files.has(p));
        let ymlNote = "";
        if (structure) {
          if ((await S.gh.fileSha(SECTIONS_PATH)) !== S.sectionsSha) throw stale(SECTIONS_PATH);
          files.push({ path: SECTIONS_PATH, blob: new Blob([IO.stringifySections(S.sectionsHeader, S.data)], { type: "text/javascript" }) });
          if (S.files.has(YML_PATH)) {
            const y = await S.gh.getText(YML_PATH);
            const upserts = [];
            ["school", "personal"].forEach((k) => S.data[k].forEach((l) => {
              if (l.ymlDirty) upserts.push({ file: l.file, name: l.file.replace(/^data\//, "").replace(/\.json$/, ""), label: IO.sectionLabel(k, l.group) });
            }));
            const out = IO.ymlSync(y.text, upserts, deletes);
            if (out === null) ymlNote = "The Pages CMS forms (.pages.yml) could not be updated automatically. The site itself is fine.";
            else if (out !== y.text) files.push({ path: YML_PATH, blob: new Blob([out], { type: "text/yaml" }) });
          }
        }
        /* site text */
        const siteChanged = S.site && JSON.stringify(S.site) !== S.siteLoaded;
        let newEdits = null;
        if (siteChanged) {
          if (S.siteSha && (await S.gh.fileSha(SITE_PATH)) !== S.siteSha) throw stale(SITE_PATH);
          newEdits = IO.toEdits(S.site, S.siteDefaults, S.siteEdits);
          files.push({ path: SITE_PATH, blob: new Blob([IO.stringifyEdits(newEdits)], { type: "text/javascript" }) });
        }
        upload.forEach(([p, v]) => files.push({ path: p, blob: v.blob }));

        if (files.length || deletes.length) {
          await S.gh.commit(files, msg, (m) => { progress.textContent = m; }, deletes);
          progress.textContent = "Finishing…";
          for (const l of changed) { l.sha = await S.gh.fileSha(l.file); l.loaded = JSON.stringify(l.projects); l.isNew = false; S.files.add(l.file); }
          if (structure) { S.sectionsSha = await S.gh.fileSha(SECTIONS_PATH); S.sectionsLoaded = shape(); allLists().forEach((l) => { l.ymlDirty = false; }); }
          deletes.forEach((p) => S.files.delete(p));
          if (siteChanged) { S.siteSha = await S.gh.fileSha(SITE_PATH); S.siteEdits = newEdits; S.siteLoaded = JSON.stringify(S.site); S.files.add(SITE_PATH); }
          upload.forEach(([p, v]) => { S.files.add(p); v.overwrite = false; });
        } else if (S.site) S.siteLoaded = JSON.stringify(S.site);
        S.deleted = []; S.changes = [];
        body.replaceChildren(
          h("h2", { class: "ok", text: "Published" }),
          h("p", { class: "note", text: "GitHub is updating the site. New content usually shows up within 1–2 minutes (refresh the page if you don't see it yet)." }),
          ymlNote ? h("p", { class: "note warn", text: ymlNote }) : null,
          h("div", { class: "actions" },
            h("a", { class: "btn ghost", href: CFG.SITE, target: "_blank", rel: "noopener", text: "Open the site" }),
            h("button", { class: "btn grow", text: "Done", onclick: done })));
      } catch (e) {
        body.replaceChildren(
          h("h2", { text: "Not published" }),
          h("div", { class: "error", text: e.message }),
          h("div", { class: "actions" },
            h("button", { class: "btn ghost", text: "Close", onclick: done }),
            e.stale ? h("button", { class: "btn grow", text: "Reload", onclick: () => { ov.remove(); S.changes = []; load(); } })
                    : h("button", { class: "btn grow", text: "Try again", onclick: summary })));
      }
    }
    summary();
  }

  window.addEventListener("beforeunload", (e) => { if (S.data && dirty()) { e.preventDefault(); e.returnValue = ""; } });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  start();
})();
