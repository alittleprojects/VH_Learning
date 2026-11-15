(() => {
  "use strict";

  const STORAGE_KEY = "vape_academy_catalog_v6";
  const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/ilushka28/VH_Learning/main/";

  const $ = (id) => document.getElementById(id);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
  const money = (n) => {
    const v = Number(n || 0);
    return v ? `${v.toLocaleString("ru-RU")} ₽` : "цена не указана";
  };
  const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  const itemUrl = (kind, id) => `item.html?type=${kind}&id=${encodeURIComponent(id)}`;

  function toFullUrl(src) {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("images/")) return GITHUB_RAW_BASE + src;
    return src;
  }

  function normalize(data) {
    data = data || {};
    data.meta = data.meta || {};
    data.coils = Array.isArray(data.coils) ? data.coils : [];
    data.devices = Array.isArray(data.devices) ? data.devices : [];
    data.coils.forEach((c) => {
      c.id ||= uid("coil");
      c.brand ||= ""; c.name ||= ""; c.resistance ||= "";
      c.type ||= "картридж"; c.price = Number(c.price || 0);
      c.image ||= ""; c.description ||= "";
    });
    data.devices.forEach((d) => {
      d.id ||= uid("dev");
      d.brand ||= ""; d.model ||= ""; d.type ||= "POD";
      d.price = Number(d.price || 0); d.image ||= "";
      d.popular = Boolean(d.popular);
      d.coils = Array.isArray(d.coils) ? d.coils : [];
      d.description ||= "";
    });
    return data;
  }

  function loadDb() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalize(JSON.parse(saved));
    } catch (e) { console.warn(e); }
    return normalize(clone(window.CATALOG_DATA || { devices: [], coils: [] }));
  }

  const db = loadDb();
  const coilById = (id) => db.coils.find((c) => c.id === id);
  const deviceById = (id) => db.devices.find((d) => d.id === id);
  const coilLabel = (c) => c ? `${c.brand} ${c.name} ${c.resistance || ""}`.trim() : "Картридж";
  const deviceLabel = (d) => d ? `${d.brand} ${d.model}`.trim() : "Устройство";
  const compatibleCoils = (d) => (d.coils || []).map(coilById).filter(Boolean);
  const compatibleDevices = (c) => db.devices.filter((d) => (d.coils || []).includes(c.id));

  /* ---------- Поиск товара по URL ---------- */
  const params = new URLSearchParams(location.search);
  let kind = params.get("type");
  const id = params.get("id");

  let item = null;
  if (kind === "device") item = deviceById(id);
  else if (kind === "coil") item = coilById(id);
  else {
    item = deviceById(id) || coilById(id);
    kind = deviceById(id) ? "device" : (coilById(id) ? "coil" : null);
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(message) {
    let node = $("vaToast");
    if (!node) {
      node = document.createElement("div");
      node.id = "vaToast";
      node.className = "toast";
      document.body.appendChild(node);
    }
    node.innerHTML = `<span>${esc(message)}</span>`;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2400);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
    toast("Ссылка скопирована");
  }

  /* ---------- Lightbox ---------- */
  function openLightbox(src) {
    const lb = $("lightbox");
    const img = $("lightboxImg");
    if (!lb || !img) return;
    img.src = src;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    const lb = $("lightbox");
    if (!lb) return;
    lb.hidden = true;
    document.body.style.overflow = "";
  }
  $("lightboxClose")?.addEventListener("click", closeLightbox);
  $("lightbox")?.addEventListener("click", (e) => { if (e.target === $("lightbox")) closeLightbox(); });

  /* ---------- Рендер ---------- */
  const root = $("itemRoot");
  const crumbs = $("crumbs");

  function render() {
    if (!root) return;
    if (!item || !kind) return renderNotFound();

    const isDevice = kind === "device";
    const title = isDevice ? item.model : `${item.name} ${item.resistance || ""}`.trim();
    const fullTitle = `${item.brand} ${title}`.trim();
    const related = isDevice ? compatibleCoils(item) : compatibleDevices(item);
    const relatedKind = isDevice ? "coil" : "device";
    const imageSrc = item.image ? toFullUrl(item.image) : "";

    document.title = `${fullTitle} — V&amp;H`;

    if (crumbs) {
      crumbs.innerHTML = `
        <a href="index.html">Каталог</a><span>/</span>
        <span>${isDevice ? "Устройства" : "Испарители / картриджи"}</span><span>/</span>
        <b>${esc(fullTitle)}</b>`;
    }

    const specs = isDevice ? [
      ["Бренд", item.brand],
      ["Тип", item.type || "POD"],
      ["Совместимо", `${related.length} картриджей`],
      ["Цена", money(item.price)]
    ] : [
      ["Бренд", item.brand],
      ["Сопротивление", item.resistance || "—"],
      ["Тип", item.type || "картридж"],
      ["Подходит к", `${related.length} устройствам`]
    ];

    root.innerHTML = `
      <section class="item-hero">
        <div class="stage reveal">
          ${isDevice && item.popular ? `<span class="stage-badge">ХИТ продаж</span>` : ""}
          ${imageSrc
            ? `<img id="stageImg" src="${esc(imageSrc)}" alt="${esc(fullTitle)}" />`
            : `<div class="stage-empty"><b>${esc(title)}</b><span>Фото не добавлено</span></div>`}
          ${imageSrc ? `<button id="zoomBtn" class="zoom-hint" type="button">🔍 Увеличить</button>` : ""}
        </div>

        <aside class="info-panel reveal d1">
          <div class="eyebrow">${esc(item.brand)}</div>
          <h1 class="item-title">${esc(title)}</h1>
          <div class="tag-row">
            <span class="tag">${esc(isDevice ? (item.type || "POD") : (item.type || "картридж"))}</span>
            ${!isDevice && item.resistance ? `<span class="tag">${esc(item.resistance)}</span>` : ""}
            <span class="tag tag-id">ID: ${esc(item.id)}</span>
          </div>
          <div class="price-big">${money(item.price)}</div>
          <p class="item-desc ${item.description ? "" : "muted"}">${esc(item.description || "Описание пока не заполнено.")}</p>

          <div class="spec-grid">
            ${specs.map(([k, v]) => `<div class="spec"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}
          </div>

          <div class="action-row">
            <button id="copyLink" class="primary-btn" type="button">🔗 Скопировать ссылку</button>
            <a class="ghost-btn" href="admin.html#${kind}=${encodeURIComponent(item.id)}">✏️ Редактировать</a>
            <a class="ghost-btn" href="index.html">← Каталог</a>
          </div>
        </aside>
      </section>

      <section class="compat-block reveal d2">
        <div class="section-head">
          <h2>${isDevice ? "Совместимые картриджи и испарители" : "Подходит к устройствам"}</h2>
          <span class="count-pill">${related.length}</span>
        </div>
        ${related.length
          ? `<div class="compat-grid">${related.map((r) => miniCard(relatedKind, r)).join("")}</div>`
          : `<div class="empty-panel">Совместимость не заполнена. Добавь её в админке.</div>`}
      </section>

      ${pagerHTML(kind, item)}
      ${brandStripHTML(kind, item)}
    `;

    $("copyLink")?.addEventListener("click", () => copyText(location.href));
    $("stageImg")?.addEventListener("click", () => openLightbox(imageSrc));
    $("zoomBtn")?.addEventListener("click", () => openLightbox(imageSrc));
  }

  function miniCard(k, obj) {
    const isDev = k === "device";
    const title = isDev ? obj.model : `${obj.name} ${obj.resistance || ""}`.trim();
    const sub = isDev ? (obj.type || "POD") : `${obj.type || "картридж"} · ${obj.resistance || "—"}`;
    const src = obj.image ? toFullUrl(obj.image) : "";
    return `
      <a class="mini-card" href="${itemUrl(k, obj.id)}">
        <div class="mini-photo ${src ? "has" : ""}">
          ${src ? `<img src="${esc(src)}" alt="${esc(title)}" loading="lazy"
            onerror="this.closest('.mini-photo').classList.remove('has');this.remove();">` : ""}
          <b>${esc(title)}</b>
        </div>
        <div class="mini-body">
          <span class="mini-brand">${esc(obj.brand)}</span>
          <b class="mini-title">${esc(title)}</b>
          <span class="mini-sub">${esc(sub)}</span>
          <span class="mini-price">${money(obj.price)}</span>
        </div>
      </a>`;
  }

  function sortedList(k) {
    if (k === "device") {
      return [...db.devices].sort((a, b) =>
        Number(b.popular) - Number(a.popular) ||
        `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`)
      );
    }
    return [...db.coils].sort((a, b) =>
      `${a.brand} ${a.name} ${a.resistance}`.localeCompare(`${b.brand} ${b.name} ${b.resistance}`)
    );
  }

  function pagerHTML(k, current) {
    const list = sortedList(k);
    if (list.length < 2) return "";
    const i = list.findIndex((x) => x.id === current.id);
    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];
    const name = (o) => k === "device" ? deviceLabel(o) : coilLabel(o);
    return `
      <nav class="pager reveal d3" aria-label="Другие товары">
        <a class="pager-link prev" href="${itemUrl(k, prev.id)}">
          <span class="pager-dir">← Предыдущий</span>
          <span class="pager-name">${esc(name(prev))}</span>
        </a>
        <a class="pager-link next" href="${itemUrl(k, next.id)}">
          <span class="pager-dir">Следующий →</span>
          <span class="pager-name">${esc(name(next))}</span>
        </a>
      </nav>`;
  }

  function brandStripHTML(k, current) {
    const list = (k === "device" ? db.devices : db.coils)
      .filter((x) => x.brand === current.brand && x.id !== current.id)
      .slice(0, 8);
    if (!list.length) return "";
    return `
      <section class="brand-block reveal d3">
        <div class="section-head">
          <h2>Ещё от ${esc(current.brand)}</h2>
          <span class="count-pill">${list.length}</span>
        </div>
        <div class="strip">${list.map((x) => miniCard(k, x)).join("")}</div>
      </section>`;
  }

  function renderNotFound() {
    document.title = "Товар не найден — V&amp;H";
    if (crumbs) crumbs.innerHTML = `<a href="index.html">Каталог</a><span>/</span><b>Не найдено</b>`;
    root.innerHTML = `
      <div class="not-found reveal">
        <div class="nf-icon">🔎</div>
        <h1>Карточка не найдена</h1>
        <p>Возможно, товар был удалён или ссылка устарела. Если товар только что добавлен на другом устройстве — экспортируй <code>catalog.js</code> из админки и загрузи его на GitHub.</p>
        <a class="primary-btn" href="index.html">Вернуться в каталог</a>
      </div>`;
  }

  /* ---------- Клавиатура ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
    if ($("lightbox") && !$("lightbox").hidden) return;
    if (e.key === "ArrowLeft") document.querySelector(".pager-link.prev")?.click();
    if (e.key === "ArrowRight") document.querySelector(".pager-link.next")?.click();
  });

  render();
})();
