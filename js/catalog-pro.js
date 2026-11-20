(() => {
  "use strict";

  const host = document.getElementById("catalog");
  if (!host || document.getElementById("cpRoot")) return;

  const DB_KEY = "vape_academy_catalog_v6";
  const PREF_KEY = "vh_cat_pref_v1";
  const VIEW_KEY = "vh_cat_views_v1";
  const PAGE = 40;

  /* ================= УТИЛИТЫ ================= */
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
  const money = (n) => { const v = Number(n || 0); return v ? `${v.toLocaleString("ru-RU")} ₽` : "—"; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const resNum = (c) => { const m = String(c.resistance || "").match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 999; };
  const fmtRes = (r) => { const s = String(r || "").trim(); if (!s) return ""; if (/Ω/.test(s)) return s; const m = s.match(/\d+(?:\.\d+)?/); if (!m) return s; const n = parseFloat(m[0]); return s.replace(m[0], Number.isInteger(n) ? n.toFixed(1) : String(parseFloat(n.toFixed(2)))) + "Ω"; };
  const freshness = (i) => { const m = String(i.id || "").match(/-(\d{13})-/); return m ? Number(m[1]) : 0; };
  const titleOf = (i, k) => k === "devices" ? String(i.model || "") : `${i.name || ""} ${fmtRes(i.resistance)}`.trim();
  const labelOf = (i, k) => `${i.brand || ""} ${titleOf(i, k)}`.trim();
  const seriesOf = (i, k) => k === "devices" ? (String(i.model || "").trim().split(/[\s/]+/)[0] || "—") : (String(i.name || "").trim() || "—");
  const itemUrl = (k, id) => `item.html?type=${k === "devices" ? "device" : "coil"}&id=${encodeURIComponent(id)}`;
  const adminUrl = (k, id) => `admin.html#${k === "devices" ? "device" : "coil"}=${encodeURIComponent(id)}`;

  function imgUrl(src) {
    if (!src) return "";
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    try { return new URL(src, document.baseURI).href; } catch { return src; }
  }

  function hi(text, q) {
    const t = String(text || "");
    if (!q) return esc(t);
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    let out = esc(t);
    tokens.forEach((tk) => {
      if (tk.length < 2) return;
      const low = out.toLowerCase();
      const at = low.indexOf(tk);
      if (at < 0) return;
      out = out.slice(0, at) + "<mark>" + out.slice(at, at + tk.length) + "</mark>" + out.slice(at + tk.length);
    });
    return out;
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove(); return true;
    }
  }

  /* ================= ДАННЫЕ ================= */
  function normalize(d) {
    d = d || {};
    d.devices = Array.isArray(d.devices) ? d.devices : [];
    d.coils = Array.isArray(d.coils) ? d.coils : [];
    d.devices.forEach((x) => { x.coils = Array.isArray(x.coils) ? x.coils : []; x.price = Number(x.price || 0); x.type ||= "POD"; });
    d.coils.forEach((x) => { x.price = Number(x.price || 0); x.type ||= "картридж"; });
    return d;
  }
  function readDb() {
    try { const r = localStorage.getItem(DB_KEY); if (r) return normalize(JSON.parse(r)); } catch {}
    return normalize(JSON.parse(JSON.stringify(window.CATALOG_DATA || { devices: [], coils: [] })));
  }
  let db = readDb();

  const byId = (k, id) => (k === "devices" ? db.devices : db.coils).find((x) => x.id === id);
  const coilsOf = (d) => (d.coils || []).map((id) => db.coils.find((c) => c.id === id)).filter(Boolean);
  const devicesOf = (c) => db.devices.filter((d) => (d.coils || []).includes(c.id));

  /* ================= СОСТОЯНИЕ ================= */
  const DEF = { q: "", kind: "devices", brand: "all", series: "all", types: [], min: null, max: null, hit: false, photo: false, linked: false, sort: "az", view: "grid", group: true, compat: null };
  let S = Object.assign({}, DEF);
  let limit = PAGE;
  let sel = new Set();
  let collapsed = new Set();
  let activeIdx = -1;
  let views = [];
  let bounds = { min: 0, max: 0 };

  try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); ["kind", "sort", "view", "group"].forEach((k) => { if (p[k] !== undefined) S[k] = p[k]; }); } catch {}
  try { views = JSON.parse(localStorage.getItem(VIEW_KEY) || "[]"); if (!Array.isArray(views)) views = []; } catch { views = []; }

  const savePref = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ kind: S.kind, sort: S.sort, view: S.view, group: S.group })); } catch {} };
  const saveViews = () => { try { localStorage.setItem(VIEW_KEY, JSON.stringify(views)); } catch {} };

  function pool() { return S.kind === "devices" ? db.devices : db.coils; }

  function boundsOf() {
    const p = pool().map((x) => Number(x.price || 0)).filter((v) => v > 0);
    if (!p.length) return { min: 0, max: 0 };
    return { min: Math.min(...p), max: Math.max(...p) };
  }
  function syncBounds(reset) {
    bounds = boundsOf();
    if (reset || S.min === null || S.max === null) { S.min = bounds.min; S.max = bounds.max; }
    S.min = clamp(S.min, bounds.min, bounds.max);
    S.max = clamp(S.max, bounds.min, bounds.max);
    if (S.min > S.max) S.min = S.max;
  }

  function compatIds() {
    if (!S.compat) return null;
    if (S.compat.kind === "devices") {
      const d = byId("devices", S.compat.id);
      return new Set(d ? d.coils || [] : []);
    }
    return new Set(devicesOf({ id: S.compat.id }).map((d) => d.id));
  }

  function haystack(x, k) {
    const rel = k === "devices" ? coilsOf(x).map((c) => labelOf(c, "coils")).join(" ") : devicesOf(x).map((d) => labelOf(d, "devices")).join(" ");
    return norm([x.brand, titleOf(x, k), seriesOf(x, k), x.type, x.resistance, x.price, x.description, rel].join(" "));
  }

  function compute() {
    const k = S.kind;
    const cset = compatIds();
    const tokens = norm(S.q).split(/\s+/).filter(Boolean);
    const typeSet = new Set(S.types);

    const base = pool().filter((x) => {
      if (cset && !cset.has(x.id)) return false;
      if (typeSet.size && !typeSet.has(x.type)) return false;
      const p = Number(x.price || 0);
      if (bounds.max > bounds.min) { if (p && (p < S.min || p > S.max)) return false; if (!p && (S.min > bounds.min || S.max < bounds.max)) return false; }
      if (S.hit && !(k === "devices" && x.popular)) return false;
      if (S.photo && !x.image) return false;
      if (S.linked && !(k === "devices" ? coilsOf(x).length : devicesOf(x).length)) return false;
      if (tokens.length) { const h = haystack(x, k); if (!tokens.every((t) => h.includes(t))) return false; }
      return true;
    });

    const brandCounts = new Map();
    base.forEach((x) => brandCounts.set(x.brand, (brandCounts.get(x.brand) || 0) + 1));

    const byBrand = S.brand === "all" ? base : base.filter((x) => x.brand === S.brand);
    const seriesCounts = new Map();
    byBrand.forEach((x) => { const s = seriesOf(x, k); seriesCounts.set(s, (seriesCounts.get(s) || 0) + 1); });

    const list = S.series === "all" ? byBrand : byBrand.filter((x) => seriesOf(x, k) === S.series);

    const cmp = {
      az: (a, b) => labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      za: (a, b) => labelOf(b, k).localeCompare(labelOf(a, k), "ru"),
      cheap: (a, b) => (a.price || 0) - (b.price || 0) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      rich: (a, b) => (b.price || 0) - (a.price || 0) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      hot: (a, b) => Number(!!b.popular) - Number(!!a.popular) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      fresh: (a, b) => freshness(b) - freshness(a) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      ohm: (a, b) => resNum(a) - resNum(b) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      links: (a, b) => (k === "devices" ? coilsOf(b).length - coilsOf(a).length : devicesOf(b).length - devicesOf(a).length)
    };
    const sorted = [...list].sort(cmp[S.sort] || cmp.az);

    const typeCounts = new Map();
    pool().forEach((x) => typeCounts.set(x.type, (typeCounts.get(x.type) || 0) + 1));

    return { base, sorted, brandCounts, seriesCounts, typeCounts };
  }

  /* ================= КАРКАС ================= */
  [...host.children].forEach((n) => { n.hidden = true; n.dataset.cpLegacy = "1"; });

  const root = document.createElement("div");
  root.id = "cpRoot";
  root.className = "cp-root";
  root.innerHTML = `
    <div class="cp-bar" id="cpBar">
      <div class="cp-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>
        <input id="cpQ" type="search" placeholder="Поиск: XROS, PnP, 0.6Ω, Pod-Mod…" autocomplete="off" spellcheck="false">
        <kbd>/</kbd>
        <button class="cp-clear" id="cpQClear" type="button" title="Очистить поиск" hidden>✕</button>
      </div>
      <div class="cp-seg" id="cpKind" role="tablist">
        <button type="button" data-k="devices">Устройства</button>
        <button type="button" data-k="coils">Картриджи</button>
      </div>
      <div class="cp-seg cp-seg--icon" id="cpView">
        <button type="button" data-v="grid" title="Плитка">▦</button>
        <button type="button" data-v="list" title="Список">☰</button>
        <button type="button" data-v="table" title="Таблица">▤</button>
      </div>
      <select class="cp-select" id="cpSort" title="Сортировка"></select>
      <button class="cp-iconbtn" id="cpGroup" type="button" title="Группировать по сериям">Серии</button>
      <button class="cp-iconbtn cp-fbtn" id="cpFilters" type="button">Фильтры</button>
      <button class="cp-iconbtn" id="cpReset" type="button" title="Сбросить всё">Сброс</button>
      <span class="cp-count" id="cpCount"></span>
    </div>

    <div class="cp-compat" id="cpCompat">
      <span class="cp-compat-l">Подбор совместимости</span>
      <select class="cp-select" id="cpFromDevice"></select>
      <select class="cp-select" id="cpFromCoil"></select>
      <button class="cp-iconbtn" id="cpCompatOff" type="button" hidden>Снять подбор</button>
    </div>

    <div class="cp-shell" id="cpShell">
      <aside class="cp-rail" id="cpRail">
        <div class="cp-sec">
          <h4>Бренды <span id="cpBrandTotal"></span></h4>
          <div class="cp-facets" id="cpBrands"></div>
        </div>
        <div class="cp-sec">
          <h4>Серии <span id="cpSeriesTotal"></span></h4>
          <div class="cp-facets cp-facets--scroll" id="cpSeries"></div>
        </div>
        <div class="cp-sec">
          <h4>Тип</h4>
          <div class="cp-chipset" id="cpTypes"></div>
        </div>
        <div class="cp-sec">
          <h4>Цена <b id="cpPriceV"></b></h4>
          <div class="cp-range">
            <input id="cpMin" type="range" min="0" max="0" step="10">
            <input id="cpMax" type="range" min="0" max="0" step="10">
          </div>
        </div>
        <div class="cp-sec">
          <h4>Отборы</h4>
          <div class="cp-tgs">
            <label class="cp-tg" id="cpHitWrap"><input id="cpHit" type="checkbox"><span>Только ХИТ</span></label>
            <label class="cp-tg"><input id="cpPhoto" type="checkbox"><span>Только с фото</span></label>
            <label class="cp-tg"><input id="cpLinked" type="checkbox"><span>Совместимость заполнена</span></label>
          </div>
        </div>
        <div class="cp-sec">
          <h4>Сохранённые виды</h4>
          <div class="cp-views" id="cpViews"></div>
          <div class="cp-save">
            <input id="cpViewName" placeholder="Название вида" maxlength="28">
            <button class="cp-iconbtn" id="cpViewSave" type="button">＋</button>
          </div>
        </div>
        <div class="cp-sec">
          <h4>Алфавит</h4>
          <div class="cp-alpha" id="cpAlpha"></div>
        </div>
        <p class="cp-hint"><kbd>/</kbd> поиск · <kbd>↑↓</kbd> выбор · <kbd>Enter</kbd> карточка · <kbd>Esc</kbd> закрыть · <kbd>V</kbd> вид · <kbd>G</kbd> серии</p>
      </aside>

      <div class="cp-main" id="cpMain">
        <div class="cp-active" id="cpActive"></div>
        <div class="cp-bulk" id="cpBulk" hidden>
          <span id="cpBulkN"></span>
          <button class="cp-iconbtn" id="cpCopy" type="button">Копировать</button>
          <button class="cp-iconbtn" id="cpCsv" type="button">CSV</button>
          <button class="cp-iconbtn" id="cpSelAll" type="button">Выбрать всё</button>
          <button class="cp-iconbtn" id="cpSelNone" type="button">Снять</button>
        </div>
        <div class="cp-stats" id="cpStats"></div>
        <div class="cp-results" id="cpResults"></div>
        <div class="cp-more" id="cpMore" hidden>
          <button class="cp-btn" id="cpMoreBtn" type="button"></button>
        </div>
        <div class="cp-sentinel" id="cpSentinel"></div>
      </div>
    </div>

    <div class="cp-backdrop" id="cpBack" hidden></div>
    <aside class="cp-drawer" id="cpDrawer" hidden aria-label="Карточка товара"></aside>
    <aside class="cp-sheet" id="cpSheet" hidden aria-label="Фильтры">
      <div class="cp-sheet-head"><b>Фильтры</b><button class="cp-iconbtn" id="cpSheetClose" type="button">Готово</button></div>
      <div class="cp-sheet-body" id="cpSheetBody"></div>
    </aside>
  `;
  host.appendChild(root);

  /* ================= СТИЛИ ================= */
  const st = document.createElement("style");
  st.id = "cpStyles";
  st.textContent = `
    .cp-root{--cp-tabs:61px;--cp-bar:64px}
    .cp-bar{position:sticky;top:var(--cp-tabs);z-index:40;display:flex;flex-wrap:wrap;gap:9px;align-items:center;
      padding:11px 13px;margin-bottom:12px;border:1px solid var(--border);border-radius:16px;
      background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(14px);box-shadow:var(--shadow-soft)}
    .cp-search{position:relative;flex:1;min-width:230px;display:flex;align-items:center}
    .cp-search svg{position:absolute;left:12px;width:16px;height:16px;color:var(--muted);pointer-events:none}
    .cp-search input{width:100%;padding:11px 74px 11px 36px;border-radius:11px;border:1px solid var(--border);
      background:var(--card);color:var(--text);font:inherit;font-size:14px}
    .cp-search input:focus{outline:none;border-color:var(--accent);background:var(--card2)}
    .cp-search kbd{position:absolute;right:12px;font:800 10px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--muted2);
      border:1px solid var(--border);border-radius:5px;padding:4px 6px;background:var(--card2)}
    .cp-clear{position:absolute;right:38px;background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:13px;padding:4px}
    .cp-clear:hover{color:var(--text)}
    .cp-seg{display:flex;border:1px solid var(--border);border-radius:999px;background:var(--card);overflow:hidden;flex-shrink:0}
    .cp-seg button{padding:9px 14px;background:transparent;border:0;color:var(--muted);font:800 12.5px/1 inherit;cursor:pointer;transition:.18s;white-space:nowrap}
    .cp-seg button:hover{color:var(--text)}
    .cp-seg button.on{background:var(--accent);color:var(--ink)}
    .cp-seg--icon button{padding:9px 12px;font-size:14px}
    .cp-select{padding:9px 12px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--text);
      font:700 12.5px/1.2 inherit;cursor:pointer;max-width:210px}
    .cp-select:focus{outline:none;border-color:var(--accent)}
    .cp-iconbtn{padding:9px 13px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--muted);
      font:800 12.5px/1 inherit;cursor:pointer;transition:.18s;white-space:nowrap}
    .cp-iconbtn:hover{border-color:var(--border-strong);color:var(--text);transform:translateY(-1px)}
    .cp-iconbtn.on{background:var(--accent);color:var(--ink);border-color:var(--accent)}
    .cp-count{margin-left:auto;font:800 11px/1 inherit;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
    .cp-compat{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding:11px 13px;margin-bottom:12px;
      border:1px dashed var(--border-strong);border-radius:14px;background:var(--card)}
    .cp-compat-l{font:900 10px/1 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .cp-compat .cp-select{flex:1;min-width:190px;max-width:none}
    .cp-shell{display:grid;grid-template-columns:266px minmax(0,1fr);gap:18px;align-items:start}
    .cp-rail{position:sticky;top:calc(var(--cp-tabs) + var(--cp-bar) + 12px);max-height:calc(100vh - var(--cp-tabs) - var(--cp-bar) - 28px);
      overflow-y:auto;padding:14px;border:1px solid var(--border);border-radius:18px;background:var(--card);
      scrollbar-width:thin;scrollbar-color:var(--border-strong) transparent}
    .cp-rail::-webkit-scrollbar{width:9px}
    .cp-rail::-webkit-scrollbar-track{background:transparent}
    .cp-rail::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:9px;border:2px solid var(--card)}
    .cp-rail::-webkit-scrollbar-thumb:hover{background:var(--accent)}
    .cp-sec{padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid var(--border)}
    .cp-sec:last-of-type{border-bottom:0;margin-bottom:8px;padding-bottom:0}
    .cp-sec h4{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 9px;
      font:900 10px/1 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .cp-sec h4 span,.cp-sec h4 b{font-size:10px;color:var(--muted2);font-variant-numeric:tabular-nums}
    .cp-facets{display:flex;flex-direction:column;gap:3px}
    .cp-facets--scroll{max-height:186px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border-strong) transparent}
    .cp-facets--scroll::-webkit-scrollbar{width:7px}
    .cp-facets--scroll::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:7px}
    .cp-facet{display:flex;justify-content:space-between;gap:8px;align-items:center;width:100%;padding:7px 10px;
      border:1px solid transparent;border-radius:9px;background:transparent;color:var(--text);font:700 13px/1.25 inherit;
      cursor:pointer;text-align:left;transition:.15s}
    .cp-facet:hover{background:var(--card2);border-color:var(--border)}
    .cp-facet.on{background:var(--accent);color:var(--ink);font-weight:900}
    .cp-facet i{font-style:normal;font-size:11px;font-variant-numeric:tabular-nums;opacity:.7;flex-shrink:0}
    .cp-facet.zero{opacity:.38}
    .cp-chipset{display:flex;flex-wrap:wrap;gap:6px}
    .cp-chip{padding:6px 10px;border-radius:999px;border:1px solid var(--border);background:var(--card2);color:var(--accent2);
      font:700 11.5px/1 inherit;cursor:pointer;transition:.15s}
    .cp-chip:hover{border-color:var(--border-strong);color:var(--text)}
    .cp-chip.on{background:var(--accent);color:var(--ink);border-color:var(--accent);font-weight:900}
    .cp-range{display:flex;flex-direction:column;gap:7px}
    .cp-range input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:18px;margin:0;background:transparent;cursor:pointer}
    .cp-range input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:99px;background:var(--border-strong)}
    .cp-range input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;margin-top:-5.5px;border-radius:50%;
      background:var(--accent);border:2px solid var(--bg);box-shadow:0 0 0 1px var(--accent)}
    .cp-range input[type=range]::-moz-range-track{height:4px;border-radius:99px;background:var(--border-strong)}
    .cp-range input[type=range]::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:var(--accent);border:2px solid var(--bg)}
    .cp-tgs{display:flex;flex-direction:column;gap:8px}
    .cp-tg{display:flex;align-items:center;gap:9px;font:700 12.5px/1.3 inherit;color:var(--text);cursor:pointer}
    .cp-tg input{width:15px;height:15px;margin:0;accent-color:var(--accent);flex-shrink:0}
    .cp-views{display:flex;flex-direction:column;gap:5px;margin-bottom:8px}
    .cp-view{display:flex;gap:6px;align-items:center}
    .cp-view button:first-child{flex:1;min-width:0;padding:7px 10px;border-radius:9px;border:1px solid var(--border);
      background:var(--card2);color:var(--text);font:700 12px/1.2 inherit;cursor:pointer;text-align:left;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cp-view button:first-child:hover{border-color:var(--accent)}
    .cp-view button:last-child{padding:7px 9px;border-radius:9px;border:1px solid var(--border);background:transparent;
      color:var(--muted);cursor:pointer;font-size:11px}
    .cp-view button:last-child:hover{color:var(--text);border-color:var(--border-strong)}
    .cp-save{display:flex;gap:6px}
    .cp-save input{flex:1;min-width:0;padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:var(--bg);
      color:var(--text);font:inherit;font-size:12px}
    .cp-save input:focus{outline:none;border-color:var(--accent)}
    .cp-alpha{display:flex;flex-wrap:wrap;gap:4px}
    .cp-alpha button{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--card2);
      color:var(--accent2);font:800 11px/1 inherit;cursor:pointer}
    .cp-alpha button:hover{background:var(--accent);color:var(--ink);border-color:var(--accent)}
    .cp-hint{margin:10px 0 0;font-size:10.5px;line-height:1.9;color:var(--muted2)}
    .cp-hint kbd{font:800 9.5px/1 ui-monospace,Menlo,Consolas,monospace;border:1px solid var(--border);border-radius:4px;
      padding:2px 4px;background:var(--card2);color:var(--muted)}
    .cp-main{min-width:0}
    .cp-active{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
    .cp-tag{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;border:1px solid var(--border-strong);
      background:var(--card2);color:var(--text);font:700 11.5px/1 inherit;cursor:pointer}
    .cp-tag:hover{border-color:var(--accent)}
    .cp-tag b{font-weight:900}
    .cp-tag i{font-style:normal;opacity:.6}
    .cp-bulk{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 13px;margin-bottom:12px;
      border:1px solid var(--accent);border-radius:14px;background:var(--card2)}
    .cp-bulk span{font:900 12px/1 inherit;margin-right:auto}
    .cp-stats{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:14px;font:700 11.5px/1 inherit;color:var(--muted)}
    .cp-stats b{color:var(--text);font-weight:900;font-variant-numeric:tabular-nums}
    .cp-group{margin-bottom:20px}
    .cp-ghead{position:sticky;top:calc(var(--cp-tabs) + var(--cp-bar) + 6px);z-index:20;display:flex;align-items:center;gap:10px;
      width:100%;padding:9px 13px;margin-bottom:11px;border:1px solid var(--border);border-radius:12px;
      background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);cursor:pointer;text-align:left}
    .cp-ghead b{font:900 14px/1 inherit;letter-spacing:-.01em;color:var(--text)}
    .cp-ghead i{font-style:normal;font:800 10px/1 inherit;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
    .cp-ghead em{margin-left:auto;font-style:normal;font-size:12px;color:var(--muted);transition:transform .2s}
    .cp-ghead.closed em{transform:rotate(-90deg)}
    .cp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:14px}
    .cp-card{display:block;position:relative;border:1px solid var(--border);border-radius:16px;overflow:hidden;
      background:var(--card);color:inherit;text-decoration:none;transition:transform .2s,border-color .2s,box-shadow .2s}
    .cp-card:hover{transform:translateY(-3px);border-color:var(--border-strong);box-shadow:var(--shadow)}
    .cp-card.is-active{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
    .cp-photo{height:172px;display:flex;align-items:center;justify-content:center;background:var(--card2);overflow:hidden;position:relative}
    .cp-photo.has{background:#fff}
    .cp-photo img{width:100%;height:100%;object-fit:contain;padding:14px;transition:transform .35s}
    .cp-card:hover .cp-photo.has img{transform:scale(1.05)}
    .cp-photo b{padding:14px;text-align:center;font:900 17px/1.2 inherit;color:var(--muted)}
    .cp-photo.has b{display:none}
    .cp-hit{position:absolute;top:9px;left:9px;z-index:2;padding:4px 8px;border-radius:999px;background:var(--badge-bg,#08090b);
      color:var(--badge-fg,#fff);border:1px solid var(--badge-br,#fff);font:900 9.5px/1 inherit;letter-spacing:.1em}
    .cp-body{padding:12px}
    .cp-brand{font:900 9.5px/1 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .cp-title{margin:5px 0 8px;font:900 16px/1.22 inherit;letter-spacing:-.01em;overflow-wrap:anywhere}
    .cp-meta{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
    .cp-pill{padding:4px 8px;border-radius:999px;border:1px solid var(--border);background:var(--card2);
      font:700 11px/1 inherit;color:var(--accent2)}
    .cp-price{color:var(--accent);font-weight:900;border-color:var(--border-strong)}
    .cp-links{font-size:11.5px;line-height:1.5;color:var(--muted);border-top:1px solid var(--border);padding-top:8px}
    .cp-links b{color:var(--text);font-weight:800}
    .cp-go{display:flex;justify-content:space-between;align-items:center;margin-top:9px;font:800 11.5px/1 inherit;color:var(--muted)}
    .cp-card:hover .cp-go{color:var(--text)}
    .cp-listwrap{display:flex;flex-direction:column;gap:7px}
    .cp-row{display:flex;gap:12px;align-items:center;padding:9px 12px;border:1px solid var(--border);border-radius:13px;
      background:var(--card);transition:border-color .18s,transform .18s}
    .cp-row:hover{border-color:var(--border-strong);transform:translateX(2px)}
    .cp-row.is-active{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
    .cp-row input[type=checkbox]{width:15px;height:15px;margin:0;accent-color:var(--accent);flex-shrink:0}
    .cp-thumb{width:54px;height:54px;flex-shrink:0;border-radius:9px;background:var(--card2);display:flex;align-items:center;justify-content:center;overflow:hidden}
    .cp-thumb.has{background:#fff}
    .cp-thumb img{width:100%;height:100%;object-fit:contain;padding:5px}
    .cp-thumb b{font:900 10px/1 inherit;color:var(--muted);text-align:center;padding:3px}
    .cp-thumb.has b{display:none}
    .cp-rowmain{flex:1;min-width:0}
    .cp-rowmain b{display:block;font:800 14px/1.25 inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cp-rowmain span{display:block;font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cp-rowprice{font:900 14px/1 inherit;white-space:nowrap;flex-shrink:0}
    .cp-rowlinks{font:700 11px/1 inherit;color:var(--muted);white-space:nowrap;flex-shrink:0}
    .cp-rowopen{padding:7px 11px;border-radius:9px;border:1px solid var(--border);background:var(--card2);color:var(--text);
      font:800 11.5px/1 inherit;cursor:pointer;text-decoration:none;flex-shrink:0}
    .cp-rowopen:hover{border-color:var(--accent)}
    .cp-tablewrap{overflow-x:auto;border:1px solid var(--border);border-radius:14px;background:var(--card);
      scrollbar-width:thin;scrollbar-color:var(--border-strong) transparent}
    .cp-tablewrap::-webkit-scrollbar{height:9px}
    .cp-tablewrap::-webkit-scrollbar-track{background:var(--card2)}
    .cp-tablewrap::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:9px}
    .cp-tablewrap::-webkit-scrollbar-thumb:hover{background:var(--accent)}
    .cp-table{width:100%;border-collapse:collapse;font-size:13px;min-width:720px}
    .cp-table th{position:sticky;top:0;z-index:2;background:var(--card2);text-align:left;padding:10px 12px;
      font:900 9.5px/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap}
    .cp-table td{padding:9px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
    .cp-table tr:last-child td{border-bottom:0}
    .cp-table tbody tr{cursor:pointer;transition:background .15s}
    .cp-table tbody tr:hover{background:var(--card2)}
    .cp-table tbody tr.is-active{background:var(--card3)}
    .cp-table input[type=checkbox]{width:15px;height:15px;margin:0;accent-color:var(--accent)}
    .cp-table .cp-tname{font-weight:800}
    .cp-table .cp-tnum{font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:800}
    .cp-table a{color:var(--text);font-weight:800;text-decoration:none;border-bottom:1px solid var(--border-strong)}
    .cp-table a:hover{border-color:var(--accent)}
    .cp-more{display:flex;justify-content:center;padding:16px 0}
    .cp-btn{padding:12px 22px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:var(--ink);
      font:900 13px/1 inherit;cursor:pointer;transition:.18s}
    .cp-btn:hover{filter:brightness(.88);transform:translateY(-1px)}
    .cp-sentinel{height:1px}
    .cp-empty{padding:52px 24px;text-align:center;border:1px dashed var(--border-strong);border-radius:18px;background:var(--card)}
    .cp-empty b{display:block;font:900 19px/1.3 inherit;margin-bottom:9px}
    .cp-empty p{margin:0 0 18px;color:var(--muted);font-size:13.5px;line-height:1.6}
    mark{background:var(--accent);color:var(--ink);border-radius:3px;padding:0 2px}
    .cp-backdrop{position:fixed;inset:0;z-index:9550;background:var(--scrim,rgba(4,5,7,.9));backdrop-filter:blur(6px);animation:cpFade .22s ease}
    @keyframes cpFade{from{opacity:0}to{opacity:1}}
    .cp-drawer,.cp-sheet{position:fixed;top:0;right:0;bottom:0;z-index:9600;display:flex;flex-direction:column;
      background:var(--card);border-left:1px solid var(--border-strong);box-shadow:var(--shadow);
      animation:cpSlide .28s cubic-bezier(.2,.8,.25,1)}
    .cp-drawer{width:min(520px,96vw)}
    .cp-sheet{width:min(360px,92vw)}
    @keyframes cpSlide{from{transform:translateX(100%)}to{transform:none}}
    .cp-dhead{display:flex;gap:10px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
    .cp-dhead b{flex:1;font:900 12px/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
    .cp-dbody{flex:1;overflow-y:auto;padding:16px;scrollbar-width:thin;scrollbar-color:var(--border-strong) transparent}
    .cp-dbody::-webkit-scrollbar{width:9px}
    .cp-dbody::-webkit-scrollbar-track{background:transparent}
    .cp-dbody::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:9px;border:2px solid var(--card)}
    .cp-dbody::-webkit-scrollbar-thumb:hover{background:var(--accent)}
    .cp-dphoto{height:250px;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:14px}
    .cp-dphoto.none{background:var(--card2)}
    .cp-dphoto img{width:100%;height:100%;object-fit:contain;padding:20px}
    .cp-dphoto b{font:900 22px/1.2 inherit;color:var(--muted);text-align:center;padding:20px}
    .cp-dbrand{font:900 10px/1 inherit;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
    .cp-dtitle{margin:8px 0 12px;font:900 clamp(22px,4vw,30px)/1.08 inherit;letter-spacing:-.025em;overflow-wrap:anywhere}
    .cp-dprice{font:900 26px/1 inherit;margin-bottom:14px}
    .cp-ddesc{color:var(--muted);font-size:13.5px;line-height:1.65;white-space:pre-wrap;margin:0 0 16px}
    .cp-dspecs{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px}
    .cp-dspec{padding:10px 12px;border:1px solid var(--border);border-radius:11px;background:var(--bg)}
    .cp-dspec span{display:block;font:900 9px/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:var(--muted2);margin-bottom:5px}
    .cp-dspec b{font-size:13px;overflow-wrap:anywhere}
    .cp-dsec{margin:0 0 10px;font:900 10px/1 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .cp-dlinks{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
    .cp-dlink{display:flex;gap:10px;align-items:center;padding:9px 11px;border:1px solid var(--border);border-radius:11px;
      background:var(--card2);color:var(--text);font:700 12.5px/1.3 inherit;cursor:pointer;text-align:left;transition:.15s}
    .cp-dlink:hover{border-color:var(--accent);transform:translateX(2px)}
    .cp-dlink i{font-style:normal;margin-left:auto;font-size:11px;color:var(--muted);white-space:nowrap}
    .cp-dacts{display:flex;flex-wrap:wrap;gap:8px}
    .cp-dacts a,.cp-dacts button{flex:1 1 44%;text-align:center;padding:11px 14px;border-radius:11px;font:800 12.5px/1 inherit;
      cursor:pointer;text-decoration:none;border:1px solid var(--border-strong);background:var(--card2);color:var(--text);transition:.18s}
    .cp-dacts a:hover,.cp-dacts button:hover{border-color:var(--accent);transform:translateY(-1px)}
    .cp-dacts .primary{background:var(--accent);color:var(--ink);border-color:var(--accent)}
    .cp-sheet-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)}
    .cp-sheet-head b{flex:1;font:900 14px/1 inherit}
    .cp-sheet-body{flex:1;overflow-y:auto;padding:14px;scrollbar-width:thin;scrollbar-color:var(--border-strong) transparent}
    .cp-sheet-body::-webkit-scrollbar{width:9px}
    .cp-sheet-body::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:9px}
    .cp-sheet .cp-rail{position:static;max-height:none;overflow:visible;border:0;padding:0;background:transparent}
    @media (max-width:1080px){
      .cp-shell{grid-template-columns:1fr}
      .cp-shell>.cp-rail{display:none}
      .cp-grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
    }
    @media (min-width:1081px){.cp-fbtn{display:none}}
    @media (max-width:620px){
      .cp-bar{position:static;padding:10px}
      .cp-search{min-width:100%;order:-1}
      .cp-count{margin-left:0;width:100%}
      .cp-select{flex:1;max-width:none;min-width:0}
      .cp-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
      .cp-photo{height:132px}
      .cp-title{font-size:14px}
      .cp-ghead{position:static}
      .cp-rowlinks{display:none}
      .cp-drawer,.cp-sheet{width:100vw}
      .cp-dspecs{grid-template-columns:1fr}
      .cp-compat .cp-select{min-width:100%}
    }
    @media (prefers-reduced-motion:reduce){
      .cp-card,.cp-row,.cp-dlink{transition:none}
      .cp-drawer,.cp-sheet,.cp-backdrop{animation:none}
    }
  `;
  document.head.appendChild(st);

  /* ================= ТОСТ ================= */
  let tTimer = 0;
  function toast(text, action) {
    let n = $("cpToast");
    if (!n) { n = document.createElement("div"); n.id = "cpToast"; n.className = "toast"; n.style.bottom = "150px"; document.body.appendChild(n); }
    n.innerHTML = `<span>${esc(text)}</span>` + (action ? `<button class="toast-btn" type="button">${esc(action.label)}</button>` : "");
    if (action) n.querySelector("button").addEventListener("click", () => { action.fn(); n.classList.remove("show"); });
    n.classList.add("show");
    clearTimeout(tTimer);
    tTimer = setTimeout(() => n.classList.remove("show"), action ? 7000 : 2600);
  }

  /* ================= ОТРИСОВКА ================= */
  let F = null;

  function render() {
    F = compute();
    const k = S.kind;
    const total = F.sorted.length;
    const shown = Math.min(limit, total);
    const visible = F.sorted.slice(0, shown);

    $("cpQ").value = S.q;
    $("cpQClear").hidden = !S.q;
    [...$("cpKind").children].forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    [...$("cpView").children].forEach((b) => b.classList.toggle("on", b.dataset.v === S.view));
    $("cpGroup").classList.toggle("on", S.group);
    $("cpCount").textContent = `${shown} из ${total}`;

    const sorts = [["az", "А → Я"], ["za", "Я → А"], ["cheap", "Цена ↑"], ["rich", "Цена ↓"], ["hot", "Сначала ХИТ"], ["fresh", "Сначала новые"], ["links", "Больше связей"]];
    if (k === "coils") sorts.splice(4, 0, ["ohm", "Сопротивление ↑"]);
    $("cpSort").innerHTML = sorts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
    $("cpSort").value = S.sort;

    $("cpHitWrap").hidden = k !== "devices";
    $("cpHit").checked = S.hit; $("cpPhoto").checked = S.photo; $("cpLinked").checked = S.linked;

    const brands = [...F.brandCounts.keys()].sort((a, b) => String(a).localeCompare(String(b), "ru"));
    $("cpBrandTotal").textContent = brands.length;
    $("cpBrands").innerHTML =
      `<button class="cp-facet${S.brand === "all" ? " on" : ""}" data-brand="all"><span>Все бренды</span><i>${F.base.length}</i></button>` +
      brands.map((b) => `<button class="cp-facet${S.brand === b ? " on" : ""}" data-brand="${esc(b)}"><span>${esc(b)}</span><i>${F.brandCounts.get(b)}</i></button>`).join("");

    const series = [...F.seriesCounts.keys()].sort((a, b) => String(a).localeCompare(String(b), "ru"));
    $("cpSeriesTotal").textContent = series.length;
    $("cpSeries").innerHTML =
      `<button class="cp-facet${S.series === "all" ? " on" : ""}" data-series="all"><span>Все серии</span><i>${F.seriesCounts.size ? [...F.seriesCounts.values()].reduce((a, b) => a + b, 0) : 0}</i></button>` +
      series.map((s) => `<button class="cp-facet${S.series === s ? " on" : ""}" data-series="${esc(s)}"><span>${esc(s)}</span><i>${F.seriesCounts.get(s)}</i></button>`).join("");

    const types = [...F.typeCounts.keys()].sort();
    $("cpTypes").innerHTML = types.map((t) => `<button class="cp-chip${S.types.includes(t) ? " on" : ""}" data-type="${esc(t)}">${esc(t)} · ${F.typeCounts.get(t)}</button>`).join("");

    const dis = bounds.max <= bounds.min;
    ["cpMin", "cpMax"].forEach((id) => { const el = $(id); el.min = bounds.min; el.max = bounds.max; el.disabled = dis; });
    $("cpMin").value = S.min; $("cpMax").value = S.max;
    $("cpPriceV").textContent = dis ? "—" : `${Number(S.min).toLocaleString("ru-RU")} — ${Number(S.max).toLocaleString("ru-RU")} ₽`;

    $("cpViews").innerHTML = views.length
      ? views.map((v) => `<div class="cp-view"><button type="button" data-view="${esc(v.id)}" title="${esc(v.name)}">${esc(v.name)}</button><button type="button" data-delview="${esc(v.id)}" title="Удалить">✕</button></div>`).join("")
      : `<div class="cp-hint" style="margin:0">Сохраняйте частые наборы фильтров.</div>`;

    const letters = [...new Set(F.sorted.map((x) => titleOf(x, k).charAt(0).toUpperCase()))].filter((c) => /[A-ZА-Я0-9]/i.test(c)).sort((a, b) => a.localeCompare(b, "ru"));
    $("cpAlpha").innerHTML = letters.map((c) => `<button type="button" data-letter="${esc(c)}">${esc(c)}</button>`).join("") || `<span class="cp-hint" style="margin:0">—</span>`;

    const dv = [...db.devices].sort((a, b) => labelOf(a, "devices").localeCompare(labelOf(b, "devices"), "ru"));
    const cv = [...db.coils].sort((a, b) => (a.brand + a.name).localeCompare(b.brand + b.name, "ru") || resNum(a) - resNum(b));
    $("cpFromDevice").innerHTML = `<option value="">Картриджи для устройства…</option>` + dv.map((d) => `<option value="${esc(d.id)}">${esc(labelOf(d, "devices"))}</option>`).join("");
    $("cpFromCoil").innerHTML = `<option value="">Устройства для картриджа…</option>` + cv.map((c) => `<option value="${esc(c.id)}">${esc(labelOf(c, "coils"))}</option>`).join("");
    $("cpFromDevice").value = S.compat && S.compat.kind === "devices" ? S.compat.id : "";
    $("cpFromCoil").value = S.compat && S.compat.kind === "coils" ? S.compat.id : "";
    $("cpCompatOff").hidden = !S.compat;

    const chips = [];
    if (S.compat) { const it = byId(S.compat.kind, S.compat.id); chips.push(["compat", "Подбор", it ? labelOf(it, S.compat.kind) : "—"]); }
    if (S.q) chips.push(["q", "Поиск", S.q]);
    if (S.brand !== "all") chips.push(["brand", "Бренд", S.brand]);
    if (S.series !== "all") chips.push(["series", "Серия", S.series]);
    S.types.forEach((t) => chips.push(["type:" + t, "Тип", t]));
    if (bounds.max > bounds.min && (S.min > bounds.min || S.max < bounds.max)) chips.push(["price", "Цена", `${S.min}–${S.max} ₽`]);
    if (S.hit) chips.push(["hit", "Отбор", "ХИТ"]);
    if (S.photo) chips.push(["photo", "Отбор", "с фото"]);
    if (S.linked) chips.push(["linked", "Отбор", "со связями"]);
    $("cpActive").innerHTML = chips.length
      ? chips.map(([id, l, v]) => `<button class="cp-tag" data-drop="${esc(id)}"><i>${esc(l)}</i> <b>${esc(v)}</b> ✕</button>`).join("") +
        `<button class="cp-tag" data-drop="all"><b>Сбросить всё</b></button>`
      : "";

    const withPhoto = pool().filter((x) => x.image).length;
    $("cpStats").innerHTML = [
      ["В базе", k === "devices" ? db.devices.length : db.coils.length],
      ["Подходит", total],
      ["Брендов", F.brandCounts.size],
      ["Серий", F.seriesCounts.size],
      ["С фото", withPhoto]
    ].map(([l, v]) => `<span>${l} <b>${v}</b></span>`).join("");

    $("cpBulk").hidden = sel.size === 0 || S.view === "grid";
    $("cpBulkN").textContent = `Выбрано: ${sel.size}`;

    const res = $("cpResults");
    if (!total) {
      res.innerHTML = `<div class="cp-empty"><b>Ничего не найдено</b><p>Слабьте фильтры или измените запрос. В базе ${pool().length} позиций этого типа.</p><button class="cp-btn" type="button" data-drop="all">Сбросить фильтры</button></div>`;
    } else if (S.view === "table") {
      res.innerHTML = tableHTML(visible, k);
    } else if (S.group) {
      const groups = new Map();
      visible.forEach((x) => { const s = seriesOf(x, k); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(x); });
      res.innerHTML = [...groups.entries()].map(([s, items]) => {
        const closed = collapsed.has(s);
        return `<section class="cp-group"><button class="cp-ghead${closed ? " closed" : ""}" data-group="${esc(s)}" type="button"><b>${esc(s)}</b><i>${items.length} поз.</i><em>▾</em></button>${closed ? "" : (S.view === "grid" ? `<div class="cp-grid">${items.map((x) => cardHTML(x, k)).join("")}</div>` : `<div class="cp-listwrap">${items.map((x) => rowHTML(x, k)).join("")}</div>`)}</section>`;
      }).join("");
    } else {
      res.innerHTML = S.view === "grid"
        ? `<div class="cp-grid">${visible.map((x) => cardHTML(x, k)).join("")}</div>`
        : `<div class="cp-listwrap">${visible.map((x) => rowHTML(x, k)).join("")}</div>`;
    }

    $("cpMore").hidden = shown >= total;
    $("cpMoreBtn").textContent = `Показать ещё ${Math.min(PAGE, total - shown)} · осталось ${total - shown}`;

    activeIdx = clamp(activeIdx, -1, visible.length - 1);
    markActive();
    paintHash();
  }

  function relText(x, k) {
    if (k === "devices") {
      const c = coilsOf(x);
      if (!c.length) return `<b>Совместимость не заполнена</b>`;
      const names = [...new Set(c.map((y) => y.name))];
      return `<b>${c.length}</b> картр. · ${esc(names.slice(0, 2).join(", "))}${names.length > 2 ? " +" + (names.length - 2) : ""}`;
    }
    const d = devicesOf(x);
    if (!d.length) return `<b>Нет привязанных устройств</b>`;
    return `<b>${d.length}</b> устр. · ${esc(d.slice(0, 2).map((y) => y.model).join(", "))}${d.length > 2 ? " +" + (d.length - 2) : ""}`;
  }

  function photoHTML(x, k, cls) {
    const src = x.image ? imgUrl(x.image) : "";
    const t = titleOf(x, k);
    return `<div class="${cls}${src ? " has" : ""}">${src ? `<img src="${esc(src)}" alt="${esc(t)}" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove('has');this.remove();">` : ""}<b>${esc(t)}</b></div>`;
  }

  function cardHTML(x, k) {
    const t = titleOf(x, k);
    return `<a class="cp-card" href="${itemUrl(k, x.id)}" data-open="${esc(x.id)}" data-kind="${k}">
      ${x.popular && k === "devices" ? `<span class="cp-hit">ХИТ</span>` : ""}
      ${photoHTML(x, k, "cp-photo")}
      <div class="cp-body">
        <div class="cp-brand">${hi(x.brand, S.q)}</div>
        <div class="cp-title">${hi(t, S.q)}</div>
        <div class="cp-meta">
          <span class="cp-pill">${esc(x.type)}</span>
          <span class="cp-pill cp-price">${money(x.price)}</span>
        </div>
        <div class="cp-links">${relText(x, k)}</div>
        <div class="cp-go"><span>Карточка</span><span>→</span></div>
      </div>
    </a>`;
  }

  function rowHTML(x, k) {
    const t = titleOf(x, k);
    const n = k === "devices" ? coilsOf(x).length : devicesOf(x).length;
    return `<div class="cp-row" data-open="${esc(x.id)}" data-kind="${k}">
      <input type="checkbox" data-sel="${esc(x.id)}" ${sel.has(x.id) ? "checked" : ""} aria-label="Выбрать">
      ${photoHTML(x, k, "cp-thumb")}
      <div class="cp-rowmain"><b>${hi(x.brand + " " + t, S.q)}</b><span>${esc(x.type)}${k === "devices" && x.popular ? " · ХИТ" : ""} · ${esc(seriesOf(x, k))}</span></div>
      <span class="cp-rowlinks">${n} связ.</span>
      <span class="cp-rowprice">${money(x.price)}</span>
      <a class="cp-rowopen" href="${itemUrl(k, x.id)}" data-stop="1">↗</a>
    </div>`;
  }

  function tableHTML(items, k) {
    const all = items.length && items.every((x) => sel.has(x.id));
    return `<div class="cp-tablewrap"><table class="cp-table">
      <thead><tr>
        <th><input type="checkbox" id="cpThAll" ${all ? "checked" : ""} aria-label="Выбрать все"></th>
        <th>Бренд</th><th>${k === "devices" ? "Модель" : "Название"}</th>
        ${k === "coils" ? "<th>Ω</th>" : ""}<th>Тип</th><th>Цена</th><th>Связи</th><th></th>
      </tr></thead>
      <tbody>${items.map((x) => `<tr data-open="${esc(x.id)}" data-kind="${k}">
        <td><input type="checkbox" data-sel="${esc(x.id)}" ${sel.has(x.id) ? "checked" : ""} aria-label="Выбрать"></td>
        <td>${hi(x.brand, S.q)}</td>
        <td class="cp-tname">${hi(titleOf(x, k), S.q)}${x.popular && k === "devices" ? " · ХИТ" : ""}</td>
        ${k === "coils" ? `<td class="cp-tnum">${esc(fmtRes(x.resistance) || "—")}</td>` : ""}
        <td>${esc(x.type)}</td>
        <td class="cp-tnum">${money(x.price)}</td>
        <td class="cp-tnum">${k === "devices" ? coilsOf(x).length : devicesOf(x).length}</td>
        <td><a href="${itemUrl(k, x.id)}" data-stop="1">открыть ↗</a></td>
      </tr>`).join("")}</tbody></table></div>`;
  }

  function markActive() {
    const nodes = [...$("cpResults").querySelectorAll("[data-open]")];
    nodes.forEach((n, i) => n.classList.toggle("is-active", i === activeIdx));
  }

  /* ================= ХЭШ ================= */
  function paintHash() {
    const p = new URLSearchParams();
    if (S.q) p.set("q", S.q);
    if (S.kind !== "devices") p.set("k", S.kind);
    if (S.brand !== "all") p.set("b", S.brand);
    if (S.series !== "all") p.set("s", S.series);
    if (S.types.length) p.set("t", S.types.join("|"));
    if (S.view !== "grid") p.set("v", S.view);
    if (S.sort !== "az") p.set("o", S.sort);
    if (!S.group) p.set("g", "0");
    if (S.compat) p.set("c", S.compat.kind + ":" + S.compat.id);
    const str = p.toString();
    const next = str ? "#cat=" + str : location.pathname + location.search;
    try { history.replaceState(null, "", str ? "#cat=" + str : location.pathname + location.search); } catch {}
  }
  function readHash() {
    if (!location.hash.startsWith("#cat=")) return false;
    const p = new URLSearchParams(location.hash.slice(5));
    S.q = p.get("q") || "";
    S.kind = p.get("k") === "coils" ? "coils" : "devices";
    S.brand = p.get("b") || "all";
    S.series = p.get("s") || "all";
    S.types = (p.get("t") || "").split("|").filter(Boolean);
    S.view = ["grid", "list", "table"].includes(p.get("v")) ? p.get("v") : "grid";
    S.sort = p.get("o") || "az";
    S.group = p.get("g") !== "0";
    const c = p.get("c");
    S.compat = c && /^(devices|coils):/.test(c) ? { kind: c.split(":")[0], id: c.split(":")[1] } : null;
    syncBounds(true);
    return true;
  }

  /* ================= ДЕЙСТВИЯ ================= */
  function refresh(resetLimit = true) { if (resetLimit) limit = PAGE; render(); }

  function setKind(k) {
    if (S.kind === k) return;
    S.kind = k; S.series = "all"; S.types = []; S.hit = false;
    if (S.sort === "ohm" && k !== "coils") S.sort = "az";
    sel.clear(); activeIdx = -1;
    syncBounds(true); savePref(); refresh();
  }

  function resetAll() {
    const keep = { kind: S.kind, view: S.view, sort: S.sort, group: S.group };
    S = Object.assign({}, DEF, keep);
    sel.clear(); collapsed.clear(); activeIdx = -1;
    syncBounds(true); refresh();
    toast("Фильтры сброшены");
  }

  function drop(id) {
    if (id === "all") return resetAll();
    if (id === "q") S.q = "";
    else if (id === "brand") S.brand = "all";
    else if (id === "series") S.series = "all";
    else if (id === "price") syncBounds(true);
    else if (id === "hit") S.hit = false;
    else if (id === "photo") S.photo = false;
    else if (id === "linked") S.linked = false;
    else if (id === "compat") S.compat = null;
    else if (id.startsWith("type:")) S.types = S.types.filter((t) => t !== id.slice(5));
    refresh();
  }

  function setCompat(kind, id) {
    if (!id) { S.compat = null; refresh(); return; }
    S.compat = { kind, id };
    S.kind = kind === "devices" ? "coils" : "devices";
    S.brand = "all"; S.series = "all"; S.types = []; S.hit = false; S.q = "";
    sel.clear(); syncBounds(true); savePref(); refresh();
    const it = byId(kind, id);
    toast(`Подбор: ${it ? labelOf(it, kind) : ""}`);
  }

  function jumpLetter(c) {
    const idx = F.sorted.findIndex((x) => titleOf(x, S.kind).charAt(0).toUpperCase() === c);
    if (idx < 0) return;
    if (idx >= limit) { limit = idx + PAGE; render(); }
    const node = [...$("cpResults").querySelectorAll("[data-open]")][idx];
    if (node) {
      const top = node.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(root).getPropertyValue("--cp-tabs")) || 60) - (parseFloat(getComputedStyle(root).getPropertyValue("--cp-bar")) || 60) - 24;
      scrollTo({ top, behavior: "smooth" });
      activeIdx = idx; markActive();
    }
  }

  /* ================= КАРТОЧКА-ШТОРКА ================= */
  let lock = "";
  function lockScroll(on) {
    if (on) { lock = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    else document.body.style.overflow = lock || "";
  }
  function closeOverlays() {
    const d = $("cpDrawer"), s = $("cpSheet"), b = $("cpBack");
    if (!d.hidden) { d.hidden = true; d.innerHTML = ""; }
    if (!s.hidden) { s.hidden = true; $("cpRail") && $("cpShell").insertBefore($("cpRail"), $("cpMain")); }
    b.hidden = true;
    lockScroll(false);
  }

  function openDrawer(kind, id) {
    const x = byId(kind, id);
    if (!x) return;
    const d = $("cpDrawer");
    const t = titleOf(x, kind);
    const rel = kind === "devices" ? coilsOf(x) : devicesOf(x);
    const relKind = kind === "devices" ? "coils" : "devices";
    const src = x.image ? imgUrl(x.image) : "";
    const specs = kind === "devices"
      ? [["Бренд", x.brand], ["Тип", x.type], ["Серия", seriesOf(x, kind)], ["Картриджей", rel.length]]
      : [["Бренд", x.brand], ["Сопротивление", fmtRes(x.resistance) || "—"], ["Тип", x.type], ["Устройств", rel.length]];

    d.innerHTML = `
      <div class="cp-dhead"><b>${kind === "devices" ? "Устройство" : "Картридж / испаритель"}</b>
        <button class="cp-iconbtn" type="button" data-close="1">Закрыть ✕</button></div>
      <div class="cp-dbody">
        <div class="cp-dphoto${src ? "" : " none"}">${src ? `<img src="${esc(src)}" alt="${esc(t)}" onerror="this.parentNode.classList.add('none');this.remove();">` : `<b>${esc(t)}</b>`}</div>
        <div class="cp-dbrand">${esc(x.brand)}${x.popular && kind === "devices" ? " · ХИТ" : ""}</div>
        <h3 class="cp-dtitle">${esc(t)}</h3>
        <div class="cp-dprice">${money(x.price)}</div>
        <p class="cp-ddesc">${esc(x.description || "Описание не заполнено.")}</p>
        <div class="cp-dspecs">${specs.map(([a, b]) => `<div class="cp-dspec"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}</div>
        <h4 class="cp-dsec">${kind === "devices" ? "Совместимые картриджи" : "Подходит к устройствам"} · ${rel.length}</h4>
        <div class="cp-dlinks">
          ${rel.length ? rel.map((y) => `<button class="cp-dlink" type="button" data-jump="${esc(y.id)}" data-jkind="${relKind}"><span>${esc(labelOf(y, relKind))}</span><i>${money(y.price)}</i></button>`).join("")
            : `<div class="cp-hint" style="margin:0">Связи не заполнены.</div>`}
        </div>
        <div class="cp-dacts">
          <a class="primary" href="${itemUrl(kind, x.id)}">Открыть страницу ↗</a>
          <button type="button" data-find="${esc(x.id)}" data-fkind="${kind}">Показать совместимость</button>
          <button type="button" data-copylink="${esc(x.id)}" data-lkind="${kind}">Копировать ссылку</button>
          <a href="${adminUrl(kind, x.id)}">Редактировать</a>
        </div>
      </div>`;
    d.hidden = false;
    $("cpSheet").hidden = true;
    $("cpBack").hidden = false;
    lockScroll(true);
    d.querySelector("[data-close]").focus();
  }

  function openSheet() {
    const s = $("cpSheet");
    $("cpSheetBody").appendChild($("cpRail"));
    s.hidden = false;
    $("cpDrawer").hidden = true;
    $("cpBack").hidden = false;
    lockScroll(true);
  }

  /* ================= ВЫДЕЛЕНИЕ ================= */
  function selectedItems() {
    const k = S.kind;
    return pool().filter((x) => sel.has(x.id));
  }
  function exportCsv() {
    const items = sel.size ? selectedItems() : F.sorted;
    if (!items.length) return toast("Нечего выгружать");
    const k = S.kind;
    const head = ["Бренд", k === "devices" ? "Модель" : "Название", "Сопротивление", "Тип", "Цена", "Совместимость"];
    const rows = items.map((x) => [
      x.brand, titleOf(x, k), k === "coils" ? fmtRes(x.resistance) : "",
      x.type, x.price || 0,
      (k === "devices" ? coilsOf(x) : devicesOf(x)).map((y) => labelOf(y, k === "devices" ? "coils" : "devices")).join(" / ")
    ]);
    const csv = "\uFEFF" + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `vh-${k}-${items.length}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`Выгружено ${items.length} позиций`);
  }

  /* ================= СОБЫТИЯ ================= */
  let qTimer = 0;
  $("cpQ").addEventListener("input", (e) => {
    clearTimeout(qTimer);
    const v = e.target.value;
    qTimer = setTimeout(() => { S.q = v; activeIdx = -1; refresh(); }, 130);
  });
  $("cpQClear").addEventListener("click", () => { S.q = ""; refresh(); $("cpQ").focus(); });

  $("cpKind").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) setKind(b.dataset.k); });
  $("cpView").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) { S.view = b.dataset.v; savePref(); refresh(false); } });
  $("cpSort").addEventListener("change", (e) => { S.sort = e.target.value; savePref(); refresh(); });
  $("cpGroup").addEventListener("click", () => { S.group = !S.group; savePref(); refresh(false); });
  $("cpReset").addEventListener("click", resetAll);
  $("cpFilters").addEventListener("click", openSheet);
  $("cpSheetClose").addEventListener("click", closeOverlays);
  $("cpBack").addEventListener("click", closeOverlays);
  $("cpMoreBtn").addEventListener("click", () => { limit += PAGE; render(); });
  $("cpCompatOff").addEventListener("click", () => { S.compat = null; refresh(); });
  $("cpFromDevice").addEventListener("change", (e) => setCompat("devices", e.target.value));
  $("cpFromCoil").addEventListener("change", (e) => setCompat("coils", e.target.value));

  $("cpMin").addEventListener("input", (e) => { S.min = Math.min(Number(e.target.value), S.max); refresh(); });
  $("cpMax").addEventListener("input", (e) => { S.max = Math.max(Number(e.target.value), S.min); refresh(); });
  ["cpHit", "cpPhoto", "cpLinked"].forEach((id) => $(id).addEventListener("change", (e) => {
    S[{ cpHit: "hit", cpPhoto: "photo", cpLinked: "linked" }[id]] = e.target.checked; refresh();
  }));

  $("cpViewSave").addEventListener("click", () => {
    const name = $("cpViewName").value.trim();
    if (!name) return toast("Введите название вида");
    const state = JSON.parse(JSON.stringify({ q: S.q, kind: S.kind, brand: S.brand, series: S.series, types: S.types, min: S.min, max: S.max, hit: S.hit, photo: S.photo, linked: S.linked, sort: S.sort, view: S.view, group: S.group, compat: S.compat }));
    views.unshift({ id: "v" + Date.now(), name, state });
    views = views.slice(0, 12);
    saveViews(); $("cpViewName").value = ""; render();
    toast(`Вид «${name}» сохранён`);
  });

  $("cpCopy").addEventListener("click", async () => {
    const items = selectedItems();
    if (!items.length) return;
    const k = S.kind;
    const text = items.map((x) => `${labelOf(x, k)} — ${money(x.price)} — ${(k === "devices" ? coilsOf(x) : devicesOf(x)).map((y) => labelOf(y, k === "devices" ? "coils" : "devices")).join(", ") || "совместимость не заполнена"}`).join("\n");
    await copy(text);
    toast(`Скопировано ${items.length} позиций`);
  });
  $("cpCsv").addEventListener("click", exportCsv);
  $("cpSelAll").addEventListener("click", () => { F.sorted.slice(0, limit).forEach((x) => sel.add(x.id)); render(); });
  $("cpSelNone").addEventListener("click", () => { sel.clear(); render(); });

  root.addEventListener("click", (e) => {
    const stop = e.target.closest("[data-stop]");
    if (stop) { e.stopPropagation(); return; }

    const cb = e.target.closest("[data-sel]");
    if (cb) { const id = cb.dataset.sel; cb.checked ? sel.add(id) : sel.delete(id); render(); return; }
    if (e.target.id === "cpThAll") {
      const items = F.sorted.slice(0, limit);
      if (e.target.checked) items.forEach((x) => sel.add(x.id)); else items.forEach((x) => sel.delete(x.id));
      render(); return;
    }

    const facetB = e.target.closest("[data-brand]");
    if (facetB) { S.brand = facetB.dataset.brand; S.series = "all"; refresh(); return; }
    const facetS = e.target.closest("[data-series]");
    if (facetS) { S.series = facetS.dataset.series; refresh(); return; }
    const chip = e.target.closest("[data-type]");
    if (chip) { const t = chip.dataset.type; S.types = S.types.includes(t) ? S.types.filter((x) => x !== t) : [...S.types, t]; refresh(); return; }
    const letter = e.target.closest("[data-letter]");
    if (letter) { jumpLetter(letter.dataset.letter); return; }
    const grp = e.target.closest("[data-group]");
    if (grp) { const s = grp.dataset.group; collapsed.has(s) ? collapsed.delete(s) : collapsed.add(s); render(); return; }
    const dr = e.target.closest("[data-drop]");
    if (dr) { drop(dr.dataset.drop); return; }

    const vw = e.target.closest("[data-view]");
    if (vw) {
      const v = views.find((x) => x.id === vw.dataset.view);
      if (v) { S = Object.assign({}, DEF, JSON.parse(JSON.stringify(v.state))); sel.clear(); syncBounds(false); savePref(); refresh(); toast(`Вид «${v.name}» применён`); }
      return;
    }
    const dv = e.target.closest("[data-delview]");
    if (dv) {
      const i = views.findIndex((x) => x.id === dv.dataset.delview);
      if (i >= 0) { const removed = views.splice(i, 1)[0]; saveViews(); render(); toast(`Вид «${removed.name}» удалён`, { label: "Вернуть", fn: () => { views.splice(i, 0, removed); saveViews(); render(); } }); }
      return;
    }

    if (e.target.closest("[data-close]")) { closeOverlays(); return; }
    const jump = e.target.closest("[data-jump]");
    if (jump) { openDrawer(jump.dataset.jkind, jump.dataset.jump); return; }
    const find = e.target.closest("[data-find]");
    if (find) { closeOverlays(); setCompat(find.dataset.fkind, find.dataset.find); return; }
    const cl = e.target.closest("[data-copylink]");
    if (cl) { copy(new URL(itemUrl(cl.dataset.lkind, cl.dataset.copylink), document.baseURI).href).then(() => toast("Ссылка скопирована")); return; }

    const open = e.target.closest("[data-open]");
    if (open) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      openDrawer(open.dataset.kind, open.dataset.open);
    }
  });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if (e.key === "Escape") {
      if (!$("cpDrawer").hidden || !$("cpSheet").hidden) { closeOverlays(); return; }
      if (S.q) { S.q = ""; refresh(); return; }
    }
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault(); $("cpQ").focus(); $("cpQ").select(); return;
    }
    if (typing) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const nodes = [...$("cpResults").querySelectorAll("[data-open]")];
        if (!nodes.length) return;
        e.preventDefault();
        activeIdx = clamp(activeIdx + (e.key === "ArrowDown" ? 1 : -1), 0, nodes.length - 1);
        markActive();
        nodes[activeIdx].scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter" && activeIdx >= 0) {
        const n = [...$("cpResults").querySelectorAll("[data-open]")][activeIdx];
        if (n) { e.preventDefault(); openDrawer(n.dataset.kind, n.dataset.open); }
      }
      return;
    }
    if (e.key.toLowerCase() === "v") { const o = ["grid", "list", "table"]; S.view = o[(o.indexOf(S.view) + 1) % 3]; savePref(); refresh(false); }
    if (e.key.toLowerCase() === "g") { S.group = !S.group; savePref(); refresh(false); }
    if (e.key.toLowerCase() === "f" && innerWidth <= 1080) openSheet();
  });

  /* ================= ЖИВЫЕ ДАННЫЕ ================= */
  let dbTimer = 0;
  function reloadData() {
    clearTimeout(dbTimer);
    dbTimer = setTimeout(() => {
      db = readDb();
      sel = new Set([...sel].filter((id) => pool().some((x) => x.id === id)));
      if (S.brand !== "all" && !pool().some((x) => x.brand === S.brand)) S.brand = "all";
      if (S.series !== "all" && !pool().some((x) => seriesOf(x, S.kind) === S.series)) S.series = "all";
      if (S.compat && !byId(S.compat.kind, S.compat.id)) S.compat = null;
      syncBounds(false);
      render();
      if (!$("cpDrawer").hidden) {
        const cur = $("cpDrawer").querySelector("[data-copylink]");
        if (cur && !byId(cur.dataset.lkind, cur.dataset.copylink)) closeOverlays();
      }
    }, 180);
  }

  const origSet = localStorage.setItem.bind(localStorage);
  const origDel = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function (k, v) { origSet(k, v); if (k === DB_KEY) reloadData(); };
  localStorage.removeItem = function (k) { origDel(k); if (k === DB_KEY) reloadData(); };
  window.addEventListener("storage", (e) => { if (e.key === DB_KEY) reloadData(); });
  document.querySelectorAll('.tab[data-tab="catalog"]').forEach((b) => b.addEventListener("click", () => setTimeout(() => { db = readDb(); syncBounds(false); render(); }, 0)));

  /* ================= ЛИПКИЕ ОТСТУПЫ ================= */
  function measure() {
    const tabs = document.querySelector(".tabs");
    const th = tabs ? Math.round(tabs.getBoundingClientRect().height) : 0;
    root.style.setProperty("--cp-tabs", th + "px");
    root.style.setProperty("--cp-bar", Math.round($("cpBar").getBoundingClientRect().height) + "px");
  }
  const ro = new ResizeObserver(measure);
  const tabsEl = document.querySelector(".tabs");
  if (tabsEl) ro.observe(tabsEl);
  ro.observe($("cpBar"));
  window.addEventListener("resize", measure);

  const io = new IntersectionObserver((entries) => {
    if (entries.some((x) => x.isIntersecting) && F && limit < F.sorted.length && $("cpDrawer").hidden) { limit += PAGE; render(); }
  }, { rootMargin: "300px" });
  io.observe($("cpSentinel"));

  window.addEventListener("hashchange", () => { if (readHash()) { sel.clear(); refresh(); } });
  window.addEventListener("pagehide", () => { clearTimeout(dbTimer); clearTimeout(qTimer); ro.disconnect(); io.disconnect(); });

  /* ================= СТАРТ ================= */
  readHash();
  syncBounds(true);
  measure();
  render();
})();
