/* Builds the page from config.js and projects.js, plus menu and scroll effects. */

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---------- Hero ---------- */
$("#brand-name").textContent = SITE.name;
const logoEl = $("#brand-logo");
if (SITE.logo) logoEl.src = "images/" + SITE.logo;
else logoEl.remove();
$("#bgword").textContent = SITE.bgWord;
$("#hello").textContent = SITE.hello;
$("#role").textContent = SITE.role + " – " + SITE.tagline;
$("#subtitle").textContent = SITE.subtitle;
$("#stats").innerHTML = SITE.stats
  .map((s) => `<div class="stat"><strong>${esc(s.number)}</strong><span>${esc(s.label)}</span></div>`)
  .join("");

const heroImg = $("#hero-image");
if (SITE.heroImage) {
  heroImg.innerHTML = `<img src="images/${esc(SITE.heroImage)}" alt="${esc(SITE.name)}">`;
} else {
  heroImg.classList.add("empty");
  $(".hero-inner").classList.add("no-image");
}

/* ---------- About ---------- */
$("#about-text").innerHTML = SITE.about.map((p) => `<p>${esc(p)}</p>`).join("");

function timeline(title, items) {
  return `<div class="timeline"><h3>${title}</h3>${items
    .map((i) => `<div class="t-item"><div><strong>${esc(i.title)}</strong><span>${esc(i.place)}</span></div><span class="t-date">${esc(i.date)}</span></div>`)
    .join("")}</div>`;
}
$("#timelines").innerHTML = timeline("Experience", SITE.experience) + timeline("Education", SITE.education);

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

/* ---------- Projects ---------- */
function cards(list) {
  if (!list.length) {
    return `<div class="coming-soon reveal"><h3>${esc(SITE.comingSoon)}</h3>${SITE.comingSoonText ? `<p>${esc(SITE.comingSoonText)}</p>` : ""}</div>`;
  }
  return list
    .map((p) => {
      const img = p.image ? `<img src="images/${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : `<div class="ph"></div>`;
      const icon = p.link ? "↗" : p.video ? "▶" : p.image ? "+" : "";
      const arrow = icon ? `<span class="card-arrow">${icon}</span>` : "";
      const badge = p.video ? `<span class="card-badge">Animation</span>` : "";
      const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
      const inner = `<div class="card-img">${img}${badge}${arrow}</div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><div class="tags">${tags}</div>`;
      if (p.link) return `<a class="card reveal" href="${esc(p.link)}" target="_blank" rel="noopener">${inner}</a>`;
      if (p.image || p.video) {
        return `<button type="button" class="card card--open reveal" data-title="${esc(p.title)}" data-image="${esc(p.image || "")}" data-video="${esc(p.video || "")}">${inner}</button>`;
      }
      return `<div class="card reveal">${inner}</div>`;
    })
    .join("");
}
$("#school-grid").innerHTML = cards(PROJECTS.school);
$("#personal-grid").innerHTML = cards(PROJECTS.personal);

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
$("#band-title").textContent = SITE.band.title;
$("#band-text").textContent = SITE.band.text;
const hasMail = !!SITE.contact.email;
$("#band-btn").textContent = SITE.band.button;
if (hasMail) {
  $("#band-btn").setAttribute("data-contact", "");   // opens the message popup
  $("#nav-cta").setAttribute("data-contact", "");
}

const links = [];
if (hasMail) links.push(`<button type="button" class="btn btn--dark" data-contact>Send me a message</button>`);
if (SITE.contact.linkedin) links.push(`<a class="btn btn--line" href="${esc(SITE.contact.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`);
const dc = (SITE.contact.discord || "").trim();
if (dc) {
  links.push(/^https?:\/\//i.test(dc)
    ? `<a class="btn btn--line" href="${esc(dc)}" target="_blank" rel="noopener">Discord ↗</a>`
    : `<button type="button" class="btn btn--line" data-copy="${esc(dc)}">Discord: ${esc(dc)}</button>`);
}
if (SITE.cv) {
  const cvLink = `<a class="btn btn--line" href="documents/${encodeURI(SITE.cv)}" download>${esc(SITE.cvLabel || "Download CV")}</a>`;
  links.push(cvLink);
  $("#hero-actions").insertAdjacentHTML("beforeend", cvLink);
}
$("#contact-list").innerHTML = links.join("");
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
