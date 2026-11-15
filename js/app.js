(() => {
  "use strict";

  /* ================= КОНФИГ ================= */
  const STORAGE_KEY = "vape_academy_catalog_v6";
  const MISTAKES_KEY = "vape_academy_mistakes_v6";
  const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/ilushka28/VH_Learning/main/";

  /* ================= УТИЛИТЫ ================= */
  const $ = (id) => document.getElementById(id);
  const on = (id, event, handler) => {
    const node = $(id);
    if (node) node.addEventListener(event, handler);
    return node;
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
  const money = (n) => {
    const v = Number(n || 0);
    return v ? `${v.toLocaleString("ru-RU")} ₽` : "цена не указана";
  };
  const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
      return true;
    }
  }

  /* ================= СОСТОЯНИЕ ================= */
  let db = loadDb();
  let view = "devices";
  let currentBrand = "Все";
  let compatSelection = new Set();
  let quiz = { questions: [], index: 0, score: 0, answered: false };

  /* ================= БАЗА ================= */
  function normalize(data) {
    data = data || {};
    data.meta = data.meta || {};
    data.coils = Array.isArray(data.coils) ? data.coils : [];
    data.devices = Array.isArray(data.devices) ? data.devices : [];

    data.coils.forEach((c) => {
      c.id ||= uid("coil");
      c.brand ||= ""; c.name ||= ""; c.resistance ||= "";
      c.type ||= "картридж";
      c.price = Number(c.price || 0);
      c.image ||= "";
      c.description ||= "";
    });

    data.devices.forEach((d) => {
      d.id ||= uid("dev");
      d.brand ||= ""; d.model ||= ""; d.type ||= "POD";
      d.price = Number(d.price || 0);
      d.image ||= "";
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

  function saveDb() {
    try {
      db.meta.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      toast("Не удалось сохранить: хранилище браузера переполнено.");
      console.error(e);
    }
  }

  /* ================= ХЕЛПЕРЫ ================= */
  const coilById = (id) => db.coils.find((c) => c.id === id);
  const deviceById = (id) => db.devices.find((d) => d.id === id);
  const coilLabel = (c) => c ? `${c.brand} ${c.name} ${c.resistance || ""}`.trim() : "Неизвестный картридж";
  const deviceLabel = (d) => d ? `${d.brand} ${d.model}`.trim() : "Неизвестное устройство";
  const compatibleCoils = (d) => (d.coils || []).map(coilById).filter(Boolean);
  const compatibleDevices = (c) => db.devices.filter((d) => (d.coils || []).includes(c.id));
  const itemUrl = (kind, id) => `item.html?type=${kind}&id=${encodeURIComponent(id)}`;

  function toFullUrl(src) {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("images/")) return GITHUB_RAW_BASE + src;
    return src;
  }

  function imageBox(item, label) {
    const src = item.image ? toFullUrl(item.image) : "";
    return `
      <div class="photo ${src ? "has" : ""}">
        ${src ? `<img src="${esc(src)}" alt="${esc(label)}" loading="lazy" decoding="async"
          onerror="this.closest('.photo').classList.remove('has');this.remove();">` : ""}
        <b>${esc(label)}</b>
      </div>`;
  }

  function setPreview(img, src) {
    if (!img) return;
    if (!src) { img.removeAttribute("src"); img.hidden = true; return; }
    img.hidden = false;
    img.onerror = () => { img.hidden = true; };
    img.src = toFullUrl(src);
  }

  /* ================= TOAST ================= */
  let toastTimer = null;
  function toast(message, action) {
    let node = $("vaToast");
    if (!node) {
      node = document.createElement("div");
      node.id = "vaToast";
      node.className = "toast";
      document.body.appendChild(node);
    }
    node.innerHTML = `<span>${esc(message)}</span>` +
      (action ? `<button class="toast-btn" type="button">${esc(action.label)}</button>` : "");
    if (action) {
      node.querySelector("button").addEventListener("click", () => { action.fn(); hideToast(); });
    }
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 7000 : 2600);
  }
  function hideToast() {
    const n = $("vaToast");
    if (n) n.classList.remove("show");
  }

  /* ================= ДОП. СТИЛИ ДЛЯ ССЫЛОК ================= */
  function injectLinkStyles() {
    if ($("vaLinkStyles")) return;
    const style = document.createElement("style");
    style.id = "vaLinkStyles";
    style.textContent = `
      .card-link { display: block; color: inherit; text-decoration: none; }
      .card-cta {
        display: flex; justify-content: space-between; align-items: center;
        margin-top: 12px; padding-top: 10px;
        border-top: 1px dashed var(--border);
        color: var(--accent2); font-size: 13px; font-weight: 700;
        opacity: .7; transition: .2s;
      }
      .card-link:hover .card-cta { opacity: 1; }
      .card-cta b { transition: .2s; }
      .card-link:hover .card-cta b { transform: translateX(5px); }
      .page-link-bar {
        display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        margin: 0 0 14px; padding: 10px 12px;
        border: 1px solid rgba(124,92,255,.4); border-radius: 12px;
        background: rgba(124,92,255,.08);
      }
      .plb-label {
        font-size: 11px; color: var(--muted); font-weight: 800;
        text-transform: uppercase; letter-spacing: .06em;
      }
      .plb-link { font-size: 13px; color: var(--accent2); word-break: break-all; flex: 1; min-width: 160px; }
      .plb-link.disabled { color: var(--muted); pointer-events: none; }
      .plb-copy { padding: 6px 10px; font-size: 12px; }
    `;
    document.head.appendChild(style);
  }

  /* ================= ВКЛАДКИ ================= */
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".page").forEach((p) => { p.classList.remove("active"); p.hidden = true; });
      btn.classList.add("active");
      const page = $(btn.dataset.tab);
      if (page) { page.hidden = false; page.classList.add("active"); }
    });
  });

  /* ================= КАТАЛОГ ================= */
  const searchInput = $("searchInput");
  const brandFilter = $("brandFilter");
  const catalogGrid = $("catalogGrid");
  const catalogStats = $("catalogStats");

  on("searchInput", "input", renderCatalog);
  on("brandFilter", "change", () => { currentBrand = brandFilter.value; renderCatalog(); });
  on("viewDevices", "click", () => {
    view = "devices";
    $("viewDevices")?.classList.add("active");
    $("viewCoils")?.classList.remove("active");
    renderCatalog();
  });
  on("viewCoils", "click", () => {
    view = "coils";
    $("viewCoils")?.classList.add("active");
    $("viewDevices")?.classList.remove("active");
    renderCatalog();
  });

  function renderBrandFilter() {
    if (!brandFilter) return;
    const brands = ["Все", ...new Set([
      ...db.devices.map((d) => d.brand),
      ...db.coils.map((c) => c.brand)
    ].filter(Boolean))].sort((a, b) => {
      if (a === "Все") return -1;
      if (b === "Все") return 1;
      return a.localeCompare(b);
    });
    brandFilter.innerHTML = brands.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
    brandFilter.value = brands.includes(currentBrand) ? currentBrand : "Все";
    currentBrand = brandFilter.value;
  }

  function renderCatalog() {
    if (!catalogGrid) return;
    const q = (searchInput?.value || "").trim().toLowerCase();

    if (view === "devices") {
      const list = db.devices.filter((d) => {
        const text = `${d.brand} ${d.model} ${d.type} ${d.price} ${d.description} ${compatibleCoils(d).map(coilLabel).join(" ")}`.toLowerCase();
        return (currentBrand === "Все" || d.brand === currentBrand) && (!q || text.includes(q));
      }).sort((a, b) => Number(b.popular) - Number(a.popular));

      if (catalogStats) catalogStats.textContent = `Устройств: ${list.length} из ${db.devices.length}`;
      catalogGrid.innerHTML = list.map(deviceCard).join("") || `<div class="empty">Ничего не найдено</div>`;
    } else {
      const list = db.coils.filter((c) => {
        const text = `${c.brand} ${c.name} ${c.resistance} ${c.type} ${c.price} ${c.description} ${compatibleDevices(c).map(deviceLabel).join(" ")}`.toLowerCase();
        return (currentBrand === "Все" || c.brand === currentBrand) && (!q || text.includes(q));
      });

      if (catalogStats) catalogStats.textContent = `Испарителей / картриджей: ${list.length} из ${db.coils.length}`;
      catalogGrid.innerHTML = list.map(coilCard).join("") || `<div class="empty">Ничего не найдено</div>`;
    }
  }

  function deviceCard(d) {
    const coils = compatibleCoils(d);
    return `
      <a class="card card-link" href="${itemUrl("device", d.id)}" title="Открыть ${esc(deviceLabel(d))}">
        ${d.popular ? `<div class="badge">ХИТ</div>` : ""}
        ${imageBox(d, d.model)}
        <div class="card-body">
          <div class="brand">${esc(d.brand)}</div>
          <div class="title">${esc(d.model)}</div>
          <div class="meta">
            <span class="pill">${esc(d.type || "POD")}</span>
            <span class="pill price">${money(d.price)}</span>
          </div>
          ${d.description ? `<div class="description">${esc(d.description)}</div>` : ""}
          <div class="compat">
            <h4>Подходящие картриджи / испарители:</h4>
            <div class="chips">
              ${coils.length
                ? coils.map((c) => `<span class="chip">${esc(coilLabel(c))} · ${money(c.price)}</span>`).join("")
                : `<span class="chip">Совместимость не заполнена</span>`}
            </div>
          </div>
          <div class="card-cta"><span>Открыть карточку</span><b>→</b></div>
        </div>
      </a>`;
  }

  function coilCard(c) {
    const devices = compatibleDevices(c);
    return `
      <a class="card card-link" href="${itemUrl("coil", c.id)}" title="Открыть ${esc(coilLabel(c))}">
        ${imageBox(c, `${c.name} ${c.resistance || ""}`)}
        <div class="card-body">
          <div class="brand">${esc(c.brand)}</div>
          <div class="title">${esc(c.name)} ${esc(c.resistance || "")}</div>
          <div class="meta">
            <span class="pill">${esc(c.type || "картридж")}</span>
            <span class="pill price">${money(c.price)}</span>
          </div>
          ${c.description ? `<div class="description">${esc(c.description)}</div>` : ""}
          <div class="compat">
            <h4>Подходит к устройствам:</h4>
            <div class="chips">
              ${devices.length
                ? devices.map((d) => `<span class="chip">${esc(deviceLabel(d))}</span>`).join("")
                : `<span class="chip">Нет привязанных устройств</span>`}
            </div>
          </div>
          <div class="card-cta"><span>Открыть карточку</span><b>→</b></div>
        </div>
      </a>`;
  }

  /* ================= АДМИНКА ================= */
  const deviceSelect = $("deviceSelect");
  const coilSelect = $("coilSelect");
  const coilSearch = $("coilSearch");
  const compatChecks = $("compatChecks");
  const isAdminPage = Boolean(deviceSelect || coilSelect);

  function renderAdmin() {
    if (!isAdminPage) return;

    const stats = $("adminStats");
    if (stats) {
      stats.textContent =
        `В базе: ${db.devices.length} устройств, ${db.coils.length} испарителей. ` +
        `Обновлено: ${db.meta.updatedAt ? new Date(db.meta.updatedAt).toLocaleString("ru-RU") : "не указано"}`;
    }

    if (deviceSelect) {
      deviceSelect.innerHTML = `<option value="">— новое устройство —</option>` +
        db.devices.map((d) => `<option value="${esc(d.id)}">${esc(deviceLabel(d))}</option>`).join("");
    }
    if (coilSelect) {
      coilSelect.innerHTML = `<option value="">— новый испаритель / картридж —</option>` +
        db.coils.map((c) => `<option value="${esc(c.id)}">${esc(coilLabel(c))}</option>`).join("");
    }

    clearDeviceForm(false);
    clearCoilForm(false);
  }

  function renderCompatChecks(filter = "") {
    if (!compatChecks) return;
    const f = filter.toLowerCase();
    const list = db.coils.filter((c) =>
      !f || `${c.brand} ${c.name} ${c.resistance}`.toLowerCase().includes(f)
    );

    compatChecks.innerHTML = list.length
      ? list.map((c) => `
          <label>
            <input type="checkbox" value="${esc(c.id)}" ${compatSelection.has(c.id) ? "checked" : ""}>
            <span>${esc(c.name)} ${esc(c.resistance || "")}</span>
            <span class="coil-brand">${esc(c.brand)}</span>
          </label>`).join("")
      : `<div class="muted">Картриджи не найдены. ${db.coils.length ? "Попробуй другой запрос." : "Сначала добавь картриджи."}</div>`;
  }

  if (compatChecks) {
    compatChecks.addEventListener("change", (e) => {
      const input = e.target.closest('input[type="checkbox"]');
      if (!input) return;
      if (input.checked) compatSelection.add(input.value);
      else compatSelection.delete(input.value);
    });
  }

  if (coilSearch) {
    coilSearch.addEventListener("input", () => renderCompatChecks(coilSearch.value));
  }

  /* --- Панель ссылки на страницу товара --- */
  function ensurePageBar(formId) {
    const form = $(formId);
    if (!form) return null;
    let bar = form.querySelector(".page-link-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "page-link-bar";
      bar.innerHTML = `
        <span class="plb-label">Страница товара</span>
        <a class="plb-link disabled" target="_blank" rel="noopener">появится после сохранения</a>
        <button type="button" class="small-btn plb-copy">Копировать</button>`;
      const actions = form.querySelector(".form-actions");
      if (actions) form.insertBefore(bar, actions);
      else form.appendChild(bar);

      bar.querySelector(".plb-copy").addEventListener("click", async () => {
        const a = bar.querySelector(".plb-link");
        if (!a.href || a.classList.contains("disabled")) return toast("Сначала сохрани товар.");
        await copyText(a.href);
        toast("Ссылка на страницу скопирована");
      });
    }
    return bar;
  }

  function updatePageBar(kind, id) {
    const bar = ensurePageBar(kind === "device" ? "deviceForm" : "coilForm");
    if (!bar) return;
    const a = bar.querySelector(".plb-link");
    if (id) {
      a.href = itemUrl(kind, id);
      a.textContent = itemUrl(kind, id);
      a.classList.remove("disabled");
    } else {
      a.removeAttribute("href");
      a.textContent = "появится после сохранения";
      a.classList.add("disabled");
    }
  }

  /* --- Форма устройства --- */
  if (deviceSelect) {
    deviceSelect.addEventListener("change", () => {
      const id = deviceSelect.value;
      if (!id) return clearDeviceForm(false);
      const d = deviceById(id);
      if (!d) return;

      $("dBrand").value = d.brand;
      $("dModel").value = d.model;
      $("dType").value = d.type;
      $("dPrice").value = d.price || "";
      $("dDescription").value = d.description || "";
      $("dPopular").checked = Boolean(d.popular);
      $("dImagePath").value = d.image || "";
      setPreview($("dPreview"), d.image);
      compatSelection = new Set(d.coils || []);
      if (coilSearch) coilSearch.value = "";
      renderCompatChecks();
      updatePageBar("device", id);
    });
  }

  on("dImagePath", "input", () => setPreview($("dPreview"), $("dImagePath").value.trim()));

  on("deviceForm", "submit", (e) => {
    e.preventDefault();
    const id = deviceSelect?.value || uid("dev");

    const item = {
      id,
      brand: $("dBrand").value.trim(),
      model: $("dModel").value.trim(),
      type: $("dType").value.trim() || "POD",
      price: Number($("dPrice").value || 0),
      description: $("dDescription").value.trim(),
      popular: $("dPopular").checked,
      image: $("dImagePath").value.trim(),
      coils: [...compatSelection]
    };

    const idx = db.devices.findIndex((d) => d.id === id);
    if (idx >= 0) db.devices[idx] = item; else db.devices.push(item);

    saveDb();
    renderAll();
    if (deviceSelect) {
      deviceSelect.value = id;
      deviceSelect.dispatchEvent(new Event("change"));
    }
    toast("Устройство сохранено — страница создана", {
      label: "Открыть",
      fn: () => { window.location.href = itemUrl("device", id); }
    });
  });

  on("newDevice", "click", () => clearDeviceForm(true));

  on("deleteDevice", "click", () => {
    const id = deviceSelect?.value;
    if (!id) return toast("Выбери устройство для удаления.");
    const snapshot = clone(db);
    db.devices = db.devices.filter((d) => d.id !== id);
    saveDb();
    renderAll();
    toast("Устройство удалено", {
      label: "Отменить",
      fn: () => { db = normalize(snapshot); saveDb(); renderAll(); }
    });
  });

  function clearDeviceForm(resetSelect = true) {
    if (resetSelect && deviceSelect) deviceSelect.value = "";
    $("deviceForm")?.reset();
    const p = $("dPreview"); if (p) p.hidden = true;
    compatSelection = new Set();
    if (coilSearch) coilSearch.value = "";
    renderCompatChecks();
    updatePageBar("device", null);
  }

  /* --- Форма испарителя --- */
  if (coilSelect) {
    coilSelect.addEventListener("change", () => {
      const id = coilSelect.value;
      if (!id) return clearCoilForm(false);
      const c = coilById(id);
      if (!c) return;

      $("cBrand").value = c.brand;
      $("cName").value = c.name;
      $("cResistance").value = c.resistance;
      $("cType").value = c.type;
      $("cPrice").value = c.price || "";
      $("cDescription").value = c.description || "";
      $("cImagePath").value = c.image || "";
      setPreview($("cPreview"), c.image);
      updatePageBar("coil", id);
    });
  }

  on("cImagePath", "input", () => setPreview($("cPreview"), $("cImagePath").value.trim()));

  on("coilForm", "submit", (e) => {
    e.preventDefault();
    const id = coilSelect?.value || uid("coil");

    const item = {
      id,
      brand: $("cBrand").value.trim(),
      name: $("cName").value.trim(),
      resistance: $("cResistance").value.trim(),
      type: $("cType").value.trim() || "картридж",
      price: Number($("cPrice").value || 0),
      description: $("cDescription").value.trim(),
      image: $("cImagePath").value.trim()
    };

    const idx = db.coils.findIndex((c) => c.id === id);
    if (idx >= 0) db.coils[idx] = item; else db.coils.push(item);

    saveDb();
    renderAll();
    if (coilSelect) {
      coilSelect.value = id;
      coilSelect.dispatchEvent(new Event("change"));
    }
    toast("Испаритель сохранён — страница создана", {
      label: "Открыть",
      fn: () => { window.location.href = itemUrl("coil", id); }
    });
  });

  on("newCoil", "click", () => clearCoilForm(true));

  on("deleteCoil", "click", () => {
    const id = coilSelect?.value;
    if (!id) return toast("Выбери испаритель для удаления.");
    const snapshot = clone(db);
    db.coils = db.coils.filter((c) => c.id !== id);
    db.devices.forEach((d) => { d.coils = (d.coils || []).filter((cid) => cid !== id); });
    saveDb();
    renderAll();
    toast("Испаритель удалён", {
      label: "Отменить",
      fn: () => { db = normalize(snapshot); saveDb(); renderAll(); }
    });
  });

  function clearCoilForm(resetSelect = true) {
    if (resetSelect && coilSelect) coilSelect.value = "";
    $("coilForm")?.reset();
    const p = $("cPreview"); if (p) p.hidden = true;
    updatePageBar("coil", null);
  }

  /* --- Экспорт / Импорт / Сброс --- */
  on("exportBtn", "click", () => {
    db.meta.updatedAt = new Date().toISOString();
    const content = `window.CATALOG_DATA = ${JSON.stringify(db, null, 2)};\n`;
    const blob = new Blob([content], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalog.js";
    a.click();
    URL.revokeObjectURL(url);
    toast("catalog.js экспортирован — загрузи его в папку data/ на GitHub");
  });

  on("importFile", "change", async () => {
    const file = $("importFile").files[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const start = text.indexOf("=");
        const end = text.lastIndexOf(";");
        if (start === -1) throw new Error("Не найден объект базы");
        parsed = JSON.parse(text.slice(start + 1, end === -1 ? undefined : end));
      }
      db = normalize(parsed);
      saveDb();
      renderAll();
      toast("База импортирована");
    } catch (e) {
      toast("Не удалось импортировать файл. Проверь формат.");
      console.error(e);
    }
  });

  on("resetBtn", "click", () => {
    if (!confirm("Сбросить локальные изменения и вернуть демо-базу?")) return;
    localStorage.removeItem(STORAGE_KEY);
    db = normalize(clone(window.CATALOG_DATA || { devices: [], coils: [] }));
    compatSelection = new Set();
    renderAll();
    toast("База сброшена к демо-версии");
  });

  /* ================= ТРЕНАЖЁР ================= */
  const trainMode = $("trainMode");
  if (trainMode) {
    trainMode.querySelector('option[value="price"]')?.remove();
    const desc = trainMode.closest(".panel")?.querySelector("p.muted");
    if (desc) desc.textContent = "Проверка знаний: устройство → картридж и картридж → устройство.";
  }

  on("startQuiz", "click", startQuiz);
  on("clearMistakes", "click", () => {
    localStorage.removeItem(MISTAKES_KEY);
    renderMistakes();
    toast("История ошибок очищена");
  });

  function startQuiz() {
    const mode = trainMode?.value || "mix";
    const count = Number($("trainCount")?.value || 10);
    const questions = [];
    for (let i = 0; i < count; i++) {
      const q = makeQuestion(mode);
      if (q) questions.push(q);
    }
    if (!questions.length) return toast("Недостаточно данных для теста. Добавь устройства и картриджи.");
    quiz = { questions, index: 0, score: 0, answered: false };
    renderQuestion();
  }

  function makeQuestion(mode) {
    const modes = ["device-coil", "coil-device"];
    const realMode = mode === "mix" ? pick(modes) : mode;
    if (realMode === "device-coil") return questionDeviceCoil();
    if (realMode === "coil-device") return questionCoilDevice();
    return null;
  }

  function questionDeviceCoil() {
    const devices = db.devices.filter((d) => compatibleCoils(d).length);
    if (!devices.length || db.coils.length < 2) return null;
    const d = pick(devices);
    const correct = pick(compatibleCoils(d));
    const wrong = sample(db.coils.filter((c) => !(d.coils || []).includes(c.id)), 3);
    return {
      text: `Какой картридж подходит к ${deviceLabel(d)}?`,
      image: d.image,
      options: shuffle([correct, ...wrong]).map((c) => ({ id: c.id, label: `${coilLabel(c)} · ${money(c.price)}` })),
      correct: correct.id,
      explain: `Для ${deviceLabel(d)} подходят: ${compatibleCoils(d).map(coilLabel).join(", ")}.`
    };
  }

  function questionCoilDevice() {
    const coils = db.coils.filter((c) => compatibleDevices(c).length);
    if (!coils.length || db.devices.length < 2) return null;
    const c = pick(coils);
    const good = compatibleDevices(c);
    const correct = pick(good);
    const wrong = sample(db.devices.filter((d) => !(d.coils || []).includes(c.id)), 3);
    return {
      text: `К какому устройству подходит ${coilLabel(c)}?`,
      image: c.image,
      options: shuffle([correct, ...wrong]).map((d) => ({ id: d.id, label: deviceLabel(d) })),
      correct: correct.id,
      explain: `${coilLabel(c)} подходит к: ${good.map(deviceLabel).join(", ")}.`
    };
  }

  function renderQuestion() {
    const box = $("quizBox");
    if (!box) return;

    if (!quiz.questions.length) {
      box.innerHTML = `<div class="question">Нажми «Начать тест», чтобы проверить знания.</div>`;
      return;
    }

    if (quiz.index >= quiz.questions.length) {
      const p = Math.round((quiz.score / quiz.questions.length) * 100);
      box.innerHTML = `
        <div class="question">
          <h3>Тест завершён</h3>
          <p>Результат: <b>${quiz.score}</b> из <b>${quiz.questions.length}</b> (${p}%)</p>
          <p>${p >= 80 ? "✅ Отлично. Можно допускать к консультации." : "❌ Нужно повторить материал."}</p>
          <button id="retryQuiz" class="primary-btn" type="button">Пройти ещё раз</button>
        </div>`;
      $("retryQuiz")?.addEventListener("click", startQuiz);
      return;
    }

    const q = quiz.questions[quiz.index];
    const progress = Math.round((quiz.index / quiz.questions.length) * 100);
    box.innerHTML = `
      <div class="question">
        <div class="quiz-top">
          <span class="muted">Вопрос ${quiz.index + 1} из ${quiz.questions.length}</span>
          <span class="pill">Счёт: ${quiz.score}</span>
        </div>
        <div class="quiz-bar"><i style="width:${progress}%"></i></div>
        ${q.image ? `<div class="quiz-media"><img src="${esc(toFullUrl(q.image))}" alt=""
          onerror="this.parentNode.remove();"></div>` : ""}
        <h3>${esc(q.text)}</h3>
        <div class="answers">
          ${q.options.map((o) => `<button class="answer" type="button" data-id="${esc(o.id)}">${esc(o.label)}</button>`).join("")}
        </div>
        <div id="answerInfo"></div>
      </div>`;
    box.querySelectorAll(".answer").forEach((btn) => {
      btn.addEventListener("click", () => answerQuestion(btn.dataset.id));
    });
  }

  function answerQuestion(selectedId) {
    if (quiz.answered) return;
    quiz.answered = true;
    const q = quiz.questions[quiz.index];
    const ok = selectedId === q.correct;
    if (ok) quiz.score++; else addMistake(q);

    document.querySelectorAll(".answer").forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.id === q.correct) btn.classList.add("right");
      if (btn.dataset.id === selectedId && !ok) btn.classList.add("wrong");
    });

    const info = $("answerInfo");
    if (info) {
      info.innerHTML = `
        <div class="explain"><b>${ok ? "Верно." : "Ошибка."}</b> ${esc(q.explain)}</div>
        <br><button id="nextQuestion" class="primary-btn" type="button">Дальше</button>`;
      $("nextQuestion")?.addEventListener("click", () => {
        quiz.index++;
        quiz.answered = false;
        renderQuestion();
      });
    }
    renderMistakes();
  }

  function getMistakes() {
    try { return JSON.parse(localStorage.getItem(MISTAKES_KEY) || "[]"); }
    catch { return []; }
  }

  function addMistake(q) {
    const mistakes = getMistakes();
    mistakes.unshift({ text: q.text, explain: q.explain, date: new Date().toLocaleString("ru-RU") });
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes.slice(0, 30)));
  }

  function renderMistakes() {
    const box = $("mistakesBox");
    if (!box) return;
    const mistakes = getMistakes();
    box.innerHTML = mistakes.length
      ? mistakes.map((m) => `
          <div class="mistake">
            <b>${esc(m.text)}</b>
            <p>${esc(m.explain)}</p>
            <small class="muted">${esc(m.date)}</small>
          </div>`).join("")
      : `<p class="muted">Ошибок пока нет.</p>`;
  }

  /* ================= DEEP LINK ИЗ АДМИНКИ ================= */
  function applyHash() {
    if (!isAdminPage) return;
    const m = location.hash.match(/^#(device|coil)=(.+)$/);
    if (!m) return;
    const kind = m[1];
    const id = decodeURIComponent(m[2]);
    const sel = kind === "device" ? deviceSelect : coilSelect;
    if (sel && [...sel.options].some((o) => o.value === id)) {
      document.querySelector('.tab[data-tab="admin"]')?.click();
      sel.value = id;
      sel.dispatchEvent(new Event("change"));
      sel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  window.addEventListener("hashchange", applyHash);

  /* ================= ЗАПУСК ================= */
  function renderAll() {
    renderBrandFilter();
    renderCatalog();
    renderAdmin();
    renderMistakes();
  }

  injectLinkStyles();
  renderAll();
  applyHash();
})();
