/* Builds the page from config.js and projects.js, plus menu and scroll effects. */

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---------- Hero ---------- */
const logoEl = $("#brand-logo");
logoEl.alt = SITE.name + " – back to top";   /* name is not shown next to the logo, but screen readers still get it */
if (SITE.logo) logoEl.src = "images/" + SITE.logo;
else logoEl.remove();
$("#hello").setAttribute("aria-label", SITE.hello);
$("#hello").innerHTML = [...SITE.hello].map((c, i) => `<span class="hl" aria-hidden="true" style="--i:${i}">${esc(c)}</span>`).join("");
$("#role").textContent = SITE.role + " – " + SITE.tagline;
$("#subtitle").textContent = SITE.subtitle;
$("#stats").innerHTML = SITE.stats
  .map((s) => `<div class="stat"><strong>${esc(s.number)}</strong><span>${esc(s.label)}</span></div>`)
  .join("");

/* Count-up: numbers in the hero count up once when they scroll into view (skipped for reduced motion) */
(function () {
  const nums = document.querySelectorAll(".stat strong");
  if (!nums.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const COUNT_MS = 1400;   // how long the count takes
  const watcher = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    watcher.unobserve(en.target);
    const el = en.target, end = parseInt(el.dataset.end, 10), t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / COUNT_MS);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));   // eases out
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  nums.forEach((el) => {
    const end = parseInt(el.textContent, 10);
    if (isNaN(end)) return;                       // only plain numbers, e.g. "7"
    el.dataset.end = end;
    el.setAttribute("aria-label", String(end));   // screen readers get the final number straight away
    el.textContent = "0";
    watcher.observe(el);
  });
})();

const heroImg = $("#hero-image");
if (SITE.heroImage) {
  heroImg.innerHTML = `<img src="images/${esc(SITE.heroImage)}" alt="${esc(SITE.heroImageAlt || "")}">`;
} else {
  heroImg.classList.add("empty");
  $(".hero-inner").classList.add("no-image");
}

/* ---------- Big background word: 3D outline on grid paper ----------
   Looks are set in css/theme.css (section 6), the word in config.js.
   The word starts under one letter of "Hello" and runs to the right edge of the content,
   so it is measured and redrawn whenever the window changes size. */
function drawBgWord() {
  const hero = $(".hero"), svg = $("#bgword"), grid = $("#hero-grid"), h1 = $("#hello");
  const word = (SITE.bgWord || "").trim();
  if (!word || !h1.firstChild) { svg.innerHTML = ""; grid.style.opacity = "0"; return; }

  const cs = getComputedStyle(hero);
  const num = (name, fb) => { const v = parseFloat(cs.getPropertyValue(name)); return isNaN(v) ? fb : v; };
  const opacity = num("--bgword-opacity", 0.06), fadeLeft = num("--bgword-fade-left", 0.3);
  const strokeMax = num("--bgword-stroke-width", 5), depthShare = num("--bgword-depth", 0.12);
  const gap = num("--bgword-gap", 14), weight = num("--bgword-weight", 500);
  const small = Math.max(2, num("--grid-small", 12)), large = Math.max(small, num("--grid-large", 60));
  const dimsOpacity = num("--dims-opacity", 0.5);

  /* Where the chosen letter of "Hello" starts, and the line the letters stand on */
  const hr = hero.getBoundingClientRect();
  const letters = h1.querySelectorAll(".hl");
  const idx = Math.max(0, Math.min(letters.length - 1, (SITE.bgWordStartLetter || 1) - 1));
  const x0 = letters[idx].getBoundingClientRect().left - hr.left;
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0";
  h1.appendChild(probe);
  const helloBase = probe.getBoundingClientRect().bottom - hr.top;
  probe.remove();
  const inner = $(".hero-inner");
  const x1 = inner.getBoundingClientRect().right - parseFloat(getComputedStyle(inner).paddingRight) - hr.left;
  const width = x1 - x0;
  if (width < 40) { svg.innerHTML = ""; grid.style.opacity = "0"; return; }

  /* Letter size that makes the word exactly fill that width */
  const family = getComputedStyle(svg).fontFamily;
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = weight + " 100px " + family;
  const fontSize = width / (ctx.measureText(word).width / 100);
  const capH = (ctx.measureText("H").actualBoundingBoxAscent / 100) * fontSize;
  const top = helloBase + gap, base = top + capH;
  const depth = depthShare * fontSize, steps = Math.max(1, Math.ceil(depth / 1.5));
  const stroke = Math.min(strokeMax, fontSize * 0.03);   /* thinner outline when the word is small (phones) */
  const f = (n) => n.toFixed(1);
  const w = esc(word);

  /* The same grid as the paper, used to fill the front of the letters */
  let pat = `<rect width="${large}" height="${large}" style="fill:var(--color-bg-soft)"/>`;
  for (let k = small; k < large; k += small) {
    pat += `<rect x="${k}" width="1" height="${large}" style="fill:var(--grid-line-small)"/><rect y="${k}" width="${large}" height="1" style="fill:var(--grid-line-small)"/>`;
  }
  pat += `<rect width="1" height="${large}" style="fill:var(--grid-line-large)"/><rect width="${large}" height="1" style="fill:var(--grid-line-large)"/>`;

  /* 3D look: outlines stacked down to the right, grey sides on top of them, then the front face */
  let outlines = "", sides = "";
  for (let i = steps; i >= 1; i--) {
    const x = f(x0 + (depth / 2) * (i / steps)), y = f(base + depth * (i / steps));
    outlines += `<text x="${x}" y="${y}" fill="none">${w}</text>`;
    sides += `<text x="${x}" y="${y}" stroke="none" style="fill:var(--bgword-side-color)">${w}</text>`;
  }
  const front = `<text x="${f(x0)}" y="${f(base)}" style="fill:url(#bgword-paper) transparent;paint-order:stroke fill">${w}</text>`;

  /* Dimension lines: width under the word, height to the right of it */
  let dims = "";
  const textBottom = $(".hero-text").getBoundingClientRect().bottom - hr.top;
  const dimY = Math.max(base + depth + 44, textBottom + 30), dimX = Math.min(x1 + depth / 2 + 24, hr.width - 14);
  if (dimsOpacity > 0 && dimY + 20 < hr.height) {
    const line = (xa, ya, xb, yb) => `<line x1="${f(xa)}" y1="${f(ya)}" x2="${f(xb)}" y2="${f(yb)}"/>`;
    const label = (x, y, text, turn) => {
      const box = turn ? `<rect x="${f(x - 10)}" y="${f(y - 20)}" width="20" height="40"/>` : `<rect x="${f(x - 32)}" y="${f(y - 10)}" width="64" height="20"/>`;
      const t = turn ? ` transform="rotate(-90 ${f(x)} ${f(y)})"` : "";
      return `<g class="dim-label" stroke="none">${box}<text x="${f(x)}" y="${f(y)}" dy=".35em" text-anchor="middle"${t}>${text}</text></g>`;
    };
    const mid = (x0 + x1) / 2, midY = (top + base) / 2;
    dims = `<g class="bgword-dims" opacity="${dimsOpacity}" style="stroke:var(--dims-color);stroke-width:1">` +
      line(x0, Math.max(base + depth + 14, textBottom + 8), x0, dimY + 10) + line(x1, base + depth + 14, x1, dimY + 10) + line(x0, dimY, x1, dimY) +
      `<polygon points="${f(x0)},${f(dimY)} ${f(x0 + 14)},${f(dimY - 4.5)} ${f(x0 + 14)},${f(dimY + 4.5)}" stroke="none" style="fill:var(--dims-color)"/>` +
      `<polygon points="${f(x1)},${f(dimY)} ${f(x1 - 14)},${f(dimY - 4.5)} ${f(x1 - 14)},${f(dimY + 4.5)}" stroke="none" style="fill:var(--dims-color)"/>` +
      label(mid, dimY, Math.round(width), false) +
      line(dimX, top, dimX, base) +
      `<polygon points="${f(dimX)},${f(top)} ${f(dimX - 4.5)},${f(top + 14)} ${f(dimX + 4.5)},${f(top + 14)}" stroke="none" style="fill:var(--dims-color)"/>` +
      `<polygon points="${f(dimX)},${f(base)} ${f(dimX - 4.5)},${f(base - 14)} ${f(dimX + 4.5)},${f(base - 14)}" stroke="none" style="fill:var(--dims-color)"/>` +
      label(dimX, midY, Math.round(capH), true) + `</g>`;
  }

  svg.innerHTML =
    `<defs><pattern id="bgword-paper" patternUnits="userSpaceOnUse" width="${large}" height="${large}">${pat}</pattern></defs>` +
    `<g opacity="${opacity}" font-size="${f(fontSize)}" stroke-linejoin="miter" stroke-miterlimit="3" style="stroke:var(--bgword-stroke-color);stroke-width:${stroke * 2}px">${outlines}${sides}${front}</g>` +
    dims;
  svg.querySelectorAll(".dim-label rect").forEach((r) => (r.style.fill = "var(--color-bg-soft)"));

  /* Word and dimension lines fade in from the left; the grid fades out around the word */
  const fade = `linear-gradient(to right, rgba(0,0,0,${fadeLeft}) ${f(x0)}px, #000 ${f(x0 + width * 0.85)}px)`;
  svg.style.webkitMaskImage = fade; svg.style.maskImage = fade;
  const gridFade = `radial-gradient(ellipse ${f(width * 0.6)}px ${f((capH + depth) * 1.4)}px at ${f((x0 + x1) / 2)}px ${f(top + (capH + depth) / 2)}px, #000 var(--grid-fade-start), transparent 100%)`;
  grid.style.webkitMaskImage = gridFade; grid.style.maskImage = gridFade;
  grid.style.opacity = "1";
}
drawBgWord();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawBgWord);   /* redraw once Inter Tight has loaded */
window.addEventListener("load", drawBgWord);
let bgWordTimer;
window.addEventListener("resize", () => { clearTimeout(bgWordTimer); bgWordTimer = setTimeout(drawBgWord, 100); });

/* ---------- About (English / Swedish) ---------- */
let aboutLang = "en";
function timeline(title, items, lang) {
  return `<div class="timeline"><h3>${esc(title)}</h3>${items
    .map((i, n) => {
      const t = (lang !== "en" && i[lang]) || {};
      return `<div class="t-item" style="--n:${n}"><div><strong>${esc(t.title || i.title)}</strong><span>${esc(i.place)}</span></div><span class="t-date">${esc(t.date || i.date)}</span></div>`;
    })
    .join("")}</div>`;
}
function renderAbout(lang) {
  aboutLang = lang;
  const t = SITE.aboutText[lang];
  $("#about-eyebrow").textContent = t.eyebrow;
  $("#about-title").textContent = t.heading;
  $("#about-text").innerHTML = t.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
  $("#timelines").innerHTML = timeline(t.experience, SITE.experience, lang) + timeline(t.education, SITE.education, lang);
  ["#about-eyebrow", "#about-title", "#about-text", "#timelines"].forEach((s) => $(s).setAttribute("lang", lang));
  document.querySelectorAll(".lang-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
}
/* ---------- Intern band (same language as About) ---------- */
function renderBand(lang) {
  const t = SITE.band[lang];
  $("#band-title").textContent = t.title;
  $("#band-lead").textContent = t.lead;
  $("#band-points").innerHTML = t.points.map((p) => `<li><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`).join("");
  $("#band-closing").textContent = t.closing;
  ["#band-title", "#band-lead", "#band-points", "#band-closing"].forEach((s) => $(s).setAttribute("lang", lang));
}

/* One language for About and the intern band; both SV / EN switches stay in step */
function setLanguage(lang) {
  renderAbout(lang);
  renderBand(lang);
}
document.querySelectorAll(".lang-btn").forEach((b) => b.addEventListener("click", () => setLanguage(b.dataset.lang)));
setLanguage("en");

const photo = $("#about-photo");
if (SITE.aboutPhoto) {
  photo.innerHTML = `<img src="images/${esc(SITE.aboutPhoto)}" alt="${esc(SITE.name)}">`;
} else {
  photo.classList.add("empty");
}

const banner = $("#about-banner");
if (SITE.aboutBanner) {
  banner.innerHTML = `<img src="images/${esc(SITE.aboutBanner)}" alt="">`;
} else {
  banner.classList.add("empty");
}

/* ---------- Projects (pages of cards with arrows) ---------- */
function cardHtml(p) {
  const img = p.image ? `<img src="images/${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : `<div class="ph"></div>`;
  const icon = p.link ? "↗" : p.video ? "▶" : p.image ? "+" : "";
  const arrow = icon ? `<span class="card-arrow">${icon}</span>` : "";
  const tags = (p.tags || []).map((t) => {
    const tip = (SITE.tagInfo || {})[t];
    return `<span class="tag"${tip ? ` data-tip="${esc(tip)}"` : ""}>${esc(t)}</span>`;
  }).join("");
  const inner = `<div class="card-img">${img}${arrow}</div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><div class="tags">${tags}</div>`;
  if (p.link) return `<a class="card reveal" href="${esc(p.link)}" target="_blank" rel="noopener">${inner}</a>`;
  if (p.image || p.video) {
    return `<button type="button" class="card card--open reveal" data-title="${esc(p.title)}" data-image="${esc(p.image || "")}" data-video="${esc(p.video || "")}">${inner}</button>`;
  }
  return `<div class="card reveal">${inner}</div>`;
}

const CHEVRON_L = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_R = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* Builds one project section: pages of N cards (N = --page-size in theme.css),
   side arrows + dots, swipe/scroll sideways. Rebuilds itself when N changes (e.g. phone). */
function buildPager(el, list, label) {
  el.classList.add("pager");
  let size = 0;
  let current = 0;

  function pageSize() {
    return parseInt(getComputedStyle(el).getPropertyValue("--page-size"), 10) || 6;
  }

  function render(keepFirstItem) {
    size = pageSize();
    if (!list.length) {
      el.innerHTML = `<div class="grid"><div class="coming-soon reveal visible"><h3>${esc(SITE.comingSoon)}</h3>${SITE.comingSoonText ? `<p>${esc(SITE.comingSoonText)}</p>` : ""}</div></div>`;
      return;
    }
    const pages = [];
    for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size));
    const multi = pages.length > 1;
    el.innerHTML =
      `<div class="pager-track" tabindex="0" role="region" aria-label="${esc(label)}">` +
      pages.map((pg) => `<div class="grid pager-page">${pg.map(cardHtml).join("")}</div>`).join("") +
      `</div>` +
      (multi
        ? `<div class="pager-controls">
             <button type="button" class="pager-btn pager-prev" aria-label="Previous projects">${CHEVRON_L}</button>
             <div class="pager-dots">${pages.map((_, i) => `<button type="button" class="pager-dot" aria-label="Page ${i + 1} of ${pages.length}"></button>`).join("")}</div>
             <button type="button" class="pager-btn pager-next" aria-label="Next projects">${CHEVRON_R}</button>
           </div>`
        : "");
    if (keepFirstItem !== undefined) el.querySelectorAll(".reveal").forEach((n) => n.classList.add("visible"));
    if (!multi) return;

    const track = el.querySelector(".pager-track");
    const pageEls = [...el.querySelectorAll(".pager-page")];
    const prev = el.querySelector(".pager-prev");
    const next = el.querySelector(".pager-next");
    const dots = [...el.querySelectorAll(".pager-dot")];
    const padLeft = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;

    function goTo(i, instant) {
      i = Math.max(0, Math.min(pageEls.length - 1, i));
      track.scrollTo({ left: pageEls[i].offsetLeft - padLeft(), behavior: instant ? "instant" : "smooth" });
    }
    function update() {
      let idx = 0, best = Infinity;
      pageEls.forEach((p, i) => {
        const d = Math.abs(p.offsetLeft - padLeft() - track.scrollLeft);
        if (d < best) { best = d; idx = i; }
      });
      current = idx;
      dots.forEach((d, i) => (i === idx ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
      const focused = document.activeElement;
      prev.disabled = idx === 0;
      next.disabled = idx === pageEls.length - 1;
      if ((focused === prev && prev.disabled) || (focused === next && next.disabled)) track.focus({ preventScroll: true });
    }
    let ticking = false;
    track.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    });
    prev.addEventListener("click", () => goTo(current - 1));
    next.addEventListener("click", () => goTo(current + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));
    if (keepFirstItem !== undefined) goTo(Math.floor(keepFirstItem / size), true);
    update();
  }

  render();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (pageSize() !== size) render(current * size);
    }, 150);
  });
}
buildPager($("#school-grid"), PROJECTS.school, "School projects");
buildPager($("#personal-grid"), PROJECTS.personal, "Personal projects");

/* ---------- Viewer (click a card to enlarge the image or play the video) ---------- */
const box = document.createElement("div");
box.className = "lightbox";
box.setAttribute("role", "dialog");
box.setAttribute("aria-modal", "true");
box.innerHTML = `<button type="button" class="lightbox-close" aria-label="Close">×</button><div class="lightbox-body"></div><div class="lightbox-caption"></div>`;
document.body.appendChild(box);
const boxBody = box.querySelector(".lightbox-body");
const boxCap = box.querySelector(".lightbox-caption");
let lastFocus = null;

function openViewer(card) {
  const { title, image, video } = card.dataset;
  boxBody.innerHTML = video
    ? `<video src="animation/${video}" ${image ? `poster="images/${image}"` : ""} controls autoplay loop playsinline></video>`
    : `<img src="images/${image}" alt="${title}">`;
  boxCap.textContent = title;
  lastFocus = card;
  box.classList.add("open");
  document.body.style.overflow = "hidden";
  box.querySelector(".lightbox-close").focus();
}
function closeViewer() {
  box.classList.remove("open");
  boxBody.innerHTML = "";          // also stops the video
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card--open");
  if (card) return openViewer(card);
  if (box.classList.contains("open") && (e.target === box || e.target.closest(".lightbox-close"))) closeViewer();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && box.classList.contains("open")) closeViewer();
});

/* ---------- Band and contact ---------- */
const hasMail = !!SITE.contact.email;
if (hasMail) $("#nav-cta").setAttribute("data-contact", "");   // opens the message popup

const links = [];
if (hasMail) links.push(`<button type="button" class="btn btn--dark btn--glow" data-contact><span>Send me a message</span></button>`);
if (SITE.contact.linkedin) links.push(`<a class="btn btn--line" href="${esc(SITE.contact.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`);
const dc = (SITE.contact.discord || "").trim();
if (dc) {
  links.push(/^https?:\/\//i.test(dc)
    ? `<a class="btn btn--line" href="${esc(dc)}" target="_blank" rel="noopener">Discord ↗</a>`
    : `<button type="button" class="btn btn--line" data-copy="${esc(dc)}">Discord: ${esc(dc)}</button>`);
}
if (SITE.cv) {
  links.push(`<a class="btn btn--line" href="documents/${encodeURI(SITE.cv)}" download>${esc(SITE.cvLabel || "Download CV")}</a>`);
}
$("#contact-list").innerHTML = links.join("");
/* Ripple on the other contact buttons */
$("#contact-list").addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".btn--line");
  if (!b) return;
  const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
  const dot = document.createElement("span");
  dot.className = "ripple";
  dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  b.appendChild(dot);
  dot.addEventListener("animationend", () => dot.remove());
});
/* Links wait a moment so the ripple can be seen before the new tab / download starts */
$("#contact-list").addEventListener("click", (e) => {
  const a = e.target.closest("a.btn--line");
  if (!a || a.dataset.go) return;
  e.preventDefault();
  if (!a.querySelector(".ripple")) {
    const r = a.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.cssText = `width:${size}px;height:${size}px;left:${r.width / 2 - size / 2}px;top:${r.height / 2 - size / 2}px`;
    a.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  }
  setTimeout(() => {
    if (a.target === "_blank") window.open(a.href, "_blank", "noopener");
    else { a.dataset.go = "1"; a.click(); delete a.dataset.go; }
  }, 450);
});
$("#footer-text").textContent = "© " + new Date().getFullYear() + " " + SITE.name;

/* ---------- Hamburger menu ---------- */
const toggle = $("#menu-toggle");
const nav = $("#nav");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", open);
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    nav.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", false);
  }
});

/* ---------- Timeline lines draw in when About scrolls into view ---------- */
(function () {
  const tl = $("#timelines");
  if (!tl || !("IntersectionObserver" in window)) { tl && tl.classList.add("drawn"); return; }
  const w = new IntersectionObserver((en) => { if (en[0].isIntersecting) { tl.classList.add("drawn"); w.disconnect(); } }, { threshold: 0.25 });
  w.observe(tl);
})();

/* ---------- Scroll reveal ---------- */
document.querySelectorAll(".section-head, .about-grid, .about-banner, .band .container, .contact-list").forEach((n) => n.classList.add("reveal"));
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); } }),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((n) => io.observe(n));

/* ---------- Message popup ---------- */
const MAIL = SITE.contact.email || "";
const modal = document.createElement("div");
modal.className = "contact-modal";
modal.setAttribute("role", "dialog");
modal.setAttribute("aria-modal", "true");
modal.setAttribute("aria-label", "Send a message");
modal.innerHTML = `
  <div class="contact-box">
    <button type="button" class="contact-close" aria-label="Close">×</button>
    <h3>Send me a message</h3>
    <form id="contact-form">
      <label>To<input type="text" id="cf-to" value="${esc(MAIL)}" readonly></label>
      <label>Your name<input type="text" id="cf-name" autocomplete="name" required></label>
      <label>Your email<input type="email" id="cf-email" autocomplete="email" required></label>
      <label>Message<textarea id="cf-message" rows="6" required></textarea></label>
      <input type="text" id="cf-bot" class="cf-bot" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" class="btn btn--dark" id="cf-send">Send</button>
      <p class="cf-status" id="cf-status" role="status"></p>
    </form>
  </div>`;
document.body.appendChild(modal);

const cForm = modal.querySelector("#contact-form");
const cStatus = modal.querySelector("#cf-status");
const cSend = modal.querySelector("#cf-send");
let cLastFocus = null;

const SUBJECT = "Message from your portfolio";
function openGmail(body) {
  const b = body ? "&body=" + encodeURIComponent(body) : "";
  const url = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(MAIL) + "&su=" + encodeURIComponent(SUBJECT) + b;
  const w = window.open(url, "composeMail", "popup=yes,width=760,height=720");
  if (!w) window.location.href = "mailto:" + MAIL + "?subject=" + encodeURIComponent(SUBJECT) + b;
}
// Always ONE popup: with a form key it is our own message form,
// without one it is a Gmail compose window with your address already filled in.
function startContact() {
  if (SITE.contact.formKey) openContact();
  else openGmail("");
}

function openContact() {
  cLastFocus = document.activeElement;
  cStatus.textContent = "";
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  modal.querySelector("#cf-name").focus();
}
function closeContact() {
  modal.classList.remove("open");
  document.body.style.overflow = "";
  if (cLastFocus && cLastFocus.focus) cLastFocus.focus();
}

document.addEventListener("click", (e) => {
  const opener = e.target.closest("[data-contact]");
  if (opener) { e.preventDefault(); return startContact(); }
  if (modal.classList.contains("open") && (e.target === modal || e.target.closest(".contact-close"))) closeContact();

  const copy = e.target.closest("[data-copy]");
  if (copy) {
    const text = copy.dataset.copy, old = copy.textContent;
    const done = () => { copy.textContent = "Copied: " + text; setTimeout(() => (copy.textContent = old), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {});
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeContact();
});

cForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (modal.querySelector("#cf-bot").value) return;            // spam trap
  const name = modal.querySelector("#cf-name").value.trim();
  const email = modal.querySelector("#cf-email").value.trim();
  const message = modal.querySelector("#cf-message").value.trim();
  const subject = "Message from your portfolio";

  if (SITE.contact.formKey) {
    // Sends straight to your inbox through web3forms.com
    cSend.disabled = true;
    cStatus.textContent = "Sending…";
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: SITE.contact.formKey, subject, from_name: name, name, email, message })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "failed");
      cStatus.textContent = "Thanks! Your message was sent.";
      cForm.reset();
      setTimeout(closeContact, 2200);
    } catch (err) {
      cStatus.textContent = "Could not send. Please try again or email " + MAIL + ".";
    }
    cSend.disabled = false;
  } else {
    openGmail(message + "\n\n— " + name + " (" + email + ")");
    closeContact();
  }
});


/* ---------- Keep keyboard focus inside an open popup ---------- */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const open = document.querySelector(".contact-modal.open, .lightbox.open");
  if (!open) return;
  const items = [...open.querySelectorAll("button, input, textarea, video[controls], a[href]")]
    .filter((el) => !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (!open.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
