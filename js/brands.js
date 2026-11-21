(() => {
  "use strict";

  const host = document.getElementById("catalog");
  if (!host || document.getElementById("brRoot")) return;

  const DB_KEY = "vape_academy_catalog_v6";
  const PREF_KEY = "vh_brands_pref_v1";
  const PAGE = 60;

  /* ================= УТИЛИТЫ ================= */
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
  const money = (n) => { const v = Number(n || 0); return v ? `${v.toLocaleString("ru-RU")} ₽` : "—"; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const resNum = (c) => { const m = String(c.resistance || "").match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 999; };
  const fmtRes = (r) => {
    const s = String(r || "").trim();
    if (!s) return "";
    if (/Ω/.test(s)) return s;
    const m = s.match(/\d+(?:\.\d+)?/);
    if (!m) return s;
    const n = parseFloat(m[0]);
    return s.replace(m[0], Number.isInteger(n) ? n.toFixed(1) : String(parseFloat(n.toFixed(2)))) + "Ω";
  };
  const titleOf = (x, k) => k === "devices" ? String(x.model || "") : `${x.name || ""} ${fmtRes(x.resistance)}`.trim();
  const labelOf = (x, k) => `${x.brand || ""} ${titleOf(x, k)}`.trim();
  const fresh = (x) => { const m = String(x.id || "").match(/-(\d{13})-/); return m ? Number(m[1]) : 0; };
  const itemUrl = (k, id) => `item.html?type=${k === "devices" ? "device" : "coil"}&id=${encodeURIComponent(id)}`;

  const INIT = { vaporesso: "VP", voopoo: "VO", geekvape: "GV", rincoe: "RC", smoant: "SM", brusko: "BR", lostvape: "LV", plonq: "PL", smok: "SK", joyetech: "JT", elfbar: "EB", voopooargus: "AR" };
  function mono(brand) {
    const key = norm(brand).replace(/[^a-zа-я0-9]/g, "");
    if (INIT[key]) return INIT[key];
    const parts = String(brand || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(brand || "?").trim().slice(0, 2).toUpperCase();
  }

  function imgUrl(src) {
    if (!src) return "";
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    try { return new URL(src, document.baseURI).href; } catch { return src; }
  }

  function hi(text, q) {
    const t = String(text || "");
    if (!q) return esc(t);
    let out = esc(t);
    norm(q).split(/\s+/).filter((x) => x.length > 1).forEach((tk) => {
      const i = out.toLowerCase().indexOf(tk);
      if (i < 0) return;
      out = out.slice(0, i) + "<mark>" + out.slice(i, i + tk.length) + "</mark>" + out.slice(i + tk.length);
    });
    return out;
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
  const coilsOf = (d) => (d.coils || []).map((id) => db.coils.find((c) => c.id === id)).filter(Boolean);
  const devicesOf = (c) => db.devices.filter((d) => (d.coils || []).includes(c.id));
  const pool = () => S.kind === "devices" ? db.devices : db.coils;

  function hay(x, k) {
    const rel = k === "devices" ? coilsOf(x).map((c) => labelOf(c, "coils")).join(" ") : devicesOf(x).map((d) => labelOf(d, "devices")).join(" ");
    return norm([x.brand, titleOf(x, k), x.type, x.resistance, x.price, x.description, rel].join(" "));
  }

  /* ================= СОСТОЯНИЕ ================= */
  const DEF = { brand: null, kind: "devices", q: "", sort: "az", view: "grid", hit: false };
  let S = { ...DEF };
  let limit = PAGE;
  let collapsedless = true;

  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    ["kind", "sort", "view"].forEach((k) => { if (p[k] !== undefined) S[k] = p[k]; });
  } catch {}
  const savePref = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ kind: S.kind, sort: S.sort, view: S.view })); } catch {} };

  /* ================= КАРКАС ================= */
  [...host.children].forEach((n) => { n.hidden = true; n.dataset.brLegacy = "1"; });

  const root = document.createElement("div");
  root.id = "brRoot";
  root.className = "br-root";
  root.innerHTML = `
    <div class="br-bar" id="brBar">
      <div class="br-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>
        <input id="brQ" type="search" placeholder="Поиск по всем производителям: XROS, PnP, 0.6Ω…" autocomplete="off" spellcheck="false">
        <kbd>/</kbd>
        <button class="br-clr" id="brQC" type="button" title="Очистить" hidden>✕</button>
      </div>
      <div class="br-seg" id="brKind">
        <button type="button" data-k="devices">Устройства</button>
        <button type="button" data-k="coils">Картриджи</button>
      </div>
      <select class="br-sel" id="brSort" title="Сортировка"></select>
      <div class="br-seg br-seg--ic" id="brView">
        <button type="button" data-v="grid" title="Плитка">▦</button>
        <button type="button" data-v="list" title="Компактный список">☰</button>
      </div>
      <button class="br-ib" id="brHit" type="button">ХИТ</button>
      <button class="br-ib" id="brReset" type="button">Сброс</button>
      <span class="br-cnt" id="brCnt"></span>
    </div>

    <nav class="br-crumbs" id="brCrumbs" aria-label="Навигация"></nav>
    <div id="brBody"></div>
    <div class="br-more" id="brMore" hidden><button class="br-btn" id="brMoreB" type="button"></button></div>
    <div id="brSentinel" style="height:1px"></div>
  `;
  host.appendChild(root);

  /* ================= СТИЛИ ================= */
  const st = document.createElement("style");
  st.id = "brStyles";
  st.textContent = `
    .br-root{--br-tabs:61px;--br-bar:64px}
    .br-bar{position:sticky;top:var(--br-tabs);z-index:40;display:flex;flex-wrap:wrap;gap:9px;align-items:center;
      padding:11px 13px;margin-bottom:14px;border:1px solid var(--border);border-radius:16px;
      background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(14px);box-shadow:var(--shadow-soft)}
    .br-search{position:relative;flex:1;min-width:240px;display:flex;align-items:center}
    .br-search svg{position:absolute;left:12px;width:16px;height:16px;color:var(--muted);pointer-events:none}
    .br-search input{width:100%;padding:11px 74px 11px 36px;border-radius:11px;border:1px solid var(--border);
      background:var(--card);color:var(--text);font:inherit;font-size:14px}
    .br-search input:focus{outline:none;border-color:var(--accent);background:var(--card2)}
    .br-search kbd{position:absolute;right:12px;font:800 10px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--muted2);
      border:1px solid var(--border);border-radius:5px;padding:4px 6px;background:var(--card2)}
    .br-clr{position:absolute;right:38px;background:none;border:0;color:var(--muted);cursor:pointer;font-size:13px;padding:4px}
    .br-clr:hover{color:var(--text)}
    .br-seg{display:flex;border:1px solid var(--border);border-radius:999px;background:var(--card);overflow:hidden;flex-shrink:0}
    .br-seg button{padding:9px 14px;background:none;border:0;color:var(--muted);font:800 12.5px/1 inherit;cursor:pointer;white-space:nowrap;transition:.18s}
    .br-seg button:hover{color:var(--text)}
    .br-seg button.on{background:var(--accent);color:var(--ink)}
    .br-seg--ic button{padding:9px 12px;font-size:14px}
    .br-sel{padding:9px 12px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--text);
      font:700 12.5px/1.2 inherit;cursor:pointer;max-width:200px}
    .br-sel:focus{outline:none;border-color:var(--accent)}
    .br-ib{padding:9px 13px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--muted);
      font:800 12.5px/1 inherit;cursor:pointer;white-space:nowrap;transition:.18s}
    .br-ib:hover{border-color:var(--border-strong);color:var(--text);transform:translateY(-1px)}
    .br-ib.on{background:var(--accent);color:var(--ink);border-color:var(--accent)}
    .br-cnt{margin-left:auto;font:800 11px/1 inherit;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}

    .br-crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-bottom:16px;
      font:800 10.5px/1 inherit;letter-spacing:.13em;text-transform:uppercase;color:var(--muted2)}
    .br-crumbs button{background:none;border:0;padding:0;color:var(--muted);font:inherit;cursor:pointer;letter-spacing:inherit}
    .br-crumbs button:hover{color:var(--accent)}
    .br-crumbs b{color:var(--text);font-weight:900}
    .br-crumbs i{font-style:normal;opacity:.5}

    .br-lead{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between;margin-bottom:18px}
    .br-lead h2{margin:0;font-size:clamp(24px,3.4vw,34px);font-weight:900;letter-spacing:-.03em;line-height:1.05}
    .br-lead p{margin:8px 0 0;max-width:62ch;font-size:13.5px;line-height:1.6;color:var(--muted)}
    .br-facts{display:flex;flex-wrap:wrap;gap:8px}
    .br-fact{padding:9px 13px;border:1px solid var(--border);border-radius:12px;background:var(--card);text-align:right}
    .br-fact b{display:block;font-size:19px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}
    .br-fact span{display:block;margin-top:5px;font:900 9px/1 inherit;letter-spacing:.13em;text-transform:uppercase;color:var(--muted2)}

    .br-brands{display:grid;grid-template-columns:repeat(auto-fill,minmax(252px,1fr));gap:14px}
    .br-brand{position:relative;display:flex;flex-direction:column;gap:0;padding:0;overflow:hidden;text-align:left;
      border:1px solid var(--border);border-radius:18px;background:var(--card);color:inherit;cursor:pointer;
      transition:transform .22s,border-color .22s,box-shadow .22s;animation:brIn .5s cubic-bezier(.2,.8,.25,1) both}
    @keyframes brIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    .br-brand:hover{transform:translateY(-4px);border-color:var(--border-strong);box-shadow:var(--shadow)}
    .br-brand::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent);
      transform:scaleX(0);transform-origin:left;transition:transform .3s;z-index:3}
    .br-brand:hover::before{transform:scaleX(1)}
    .br-bhead{display:flex;align-items:center;gap:13px;padding:15px 15px 12px}
    .br-mono{width:52px;height:52px;flex-shrink:0;border-radius:14px;display:grid;place-items:center;
      background:repeating-linear-gradient(45deg,var(--card2),var(--card2) 6px,var(--card3) 6px,var(--card3) 12px);
      border:1px solid var(--border);font:900 17px/1 inherit;letter-spacing:-.02em;color:var(--text)}
    .br-bname{font-size:19px;font-weight:900;letter-spacing:-.02em;line-height:1.15;overflow-wrap:anywhere}
    .br-btag{display:block;margin-top:5px;font:900 9px/1 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--muted2)}
    .br-bnum{display:flex;align-items:baseline;gap:9px;padding:0 15px 12px}
    .br-bnum b{font-size:38px;font-weight:900;line-height:.9;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
    .br-bnum span{font:800 11px/1.3 inherit;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}
    .br-bmeta{display:flex;flex-wrap:wrap;gap:6px;padding:0 15px 13px}
    .br-pill{padding:5px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card2);
      font:700 11px/1 inherit;color:var(--accent2)}
    .br-pill.hot{border-color:var(--border-strong);color:var(--accent);font-weight:900}
    .br-bgo{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding:11px 15px;
      border-top:1px solid var(--border);font:800 12px/1 inherit;color:var(--muted);transition:.2s}
    .br-brand:hover .br-bgo{color:var(--text);background:var(--card2)}
    .br-bgo em{font-style:normal;transition:transform .2s}
    .br-brand:hover .br-bgo em{transform:translateX(5px)}
    .br-brand.all{background:var(--accent);border-color:var(--accent);color:var(--ink)}
    .br-brand.all .br-mono{background:repeating-linear-gradient(45deg,rgba(127,127,127,.22),rgba(127,127,127,.22) 6px,transparent 6px,transparent 12px);
      border-color:currentColor;color:var(--ink)}
    .br-brand.all .br-btag,.br-brand.all .br-bnum span,.br-brand.all .br-bgo{color:var(--ink);opacity:.72}
    .br-brand.all .br-pill{background:transparent;border-color:currentColor;color:var(--ink)}
    .br-brand.all .br-bgo{border-top-color:currentColor}
    .br-brand.all:hover .br-bgo{background:rgba(127,127,127,.16);color:var(--ink);opacity:1}
    .br-brand.all::before{background:var(--ink)}

    .br-bhero{display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:18px;margin-bottom:16px;
      border:1px solid var(--border);border-radius:20px;background:var(--card);box-shadow:var(--shadow-soft)}
    .br-bhero .br-mono{width:66px;height:66px;border-radius:18px;font-size:22px}
    .br-bhero-t{flex:1;min-width:180px}
    .br-bhero-t h2{margin:0;font-size:clamp(22px,3vw,30px);font-weight:900;letter-spacing:-.03em;line-height:1.05}
    .br-bhero-t p{margin:7px 0 0;font-size:12.5px;color:var(--muted)}
    .br-back{padding:10px 15px;border-radius:11px;border:1px solid var(--border-strong);background:var(--card2);
      color:var(--text);font:800 12px/1 inherit;cursor:pointer;transition:.18s;white-space:nowrap}
    .br-back:hover{border-color:var(--accent);transform:translateY(-1px)}

    .br-stats{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:14px;font:700 11.5px/1 inherit;color:var(--muted)}
    .br-stats b{color:var(--text);font-weight:900;font-variant-numeric:tabular-nums}

    .br-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:16px}
    .br-card{display:block;position:relative;border:1px solid var(--border);border-radius:18px;overflow:hidden;
      background:var(--card);color:inherit;text-decoration:none;transition:transform .22s,border-color .22s,box-shadow .22s}
    .br-card:hover{transform:translateY(-4px);border-color:var(--border-strong);box-shadow:var(--shadow)}
    .br-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent);
      transform:scaleX(0);transform-origin:left;transition:transform .3s;z-index:3}
    .br-card:hover::before{transform:scaleX(1)}
    .br-photo{height:210px;display:flex;align-items:center;justify-content:center;background:var(--card2);
      overflow:hidden;position:relative;border-bottom:1px solid var(--border)}
    .br-photo.has{background:#fff}
    .br-photo img{width:100%;height:100%;object-fit:contain;padding:18px;transition:transform .4s}
    .br-card:hover .br-photo.has img{transform:scale(1.05)}
    .br-photo b{padding:18px;text-align:center;font:900 21px/1.2 inherit;color:var(--muted);letter-spacing:-.01em}
    .br-photo.has b{display:none}
    .br-hit{position:absolute;top:11px;left:11px;z-index:2;padding:5px 9px;border-radius:999px;
      background:var(--badge-bg,#08090b);color:var(--badge-fg,#fff);border:1px solid var(--badge-br,#fff);
      font:900 9.5px/1 inherit;letter-spacing:.1em}
    .br-body{padding:14px}
    .br-brandline{font:900 9.5px/1 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .br-title{margin:6px 0 9px;font:900 18px/1.22 inherit;letter-spacing:-.015em;overflow-wrap:anywhere}
    .br-meta{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px}
    .br-price{color:var(--accent);font-weight:900;border-color:var(--border-strong)}
    .br-links{font-size:11.5px;line-height:1.5;color:var(--muted);border-top:1px solid var(--border);padding-top:9px}
    .br-links b{color:var(--text);font-weight:800}
    .br-go{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font:800 11.5px/1 inherit;color:var(--muted)}
    .br-card:hover .br-go{color:var(--text)}
    .br-go em{font-style:normal;transition:transform .2s}
    .br-card:hover .br-go em{transform:translateX(5px)}

    .br-list{display:flex;flex-direction:column;gap:8px}
    .br-row{display:flex;gap:13px;align-items:center;padding:10px 13px;border:1px solid var(--border);border-radius:14px;
      background:var(--card);color:inherit;text-decoration:none;transition:border-color .18s,transform .18s,box-shadow .18s}
    .br-row:hover{border-color:var(--border-strong);transform:translateX(3px);box-shadow:var(--shadow-soft)}
    .br-thumb{width:56px;height:56px;flex-shrink:0;border-radius:10px;background:var(--card2);
      display:flex;align-items:center;justify-content:center;overflow:hidden}
    .br-thumb.has{background:#fff}
    .br-thumb img{width:100%;height:100%;object-fit:contain;padding:5px}
    .br-thumb b{font:900 10px/1.1 inherit;color:var(--muted);text-align:center;padding:4px}
    .br-thumb.has b{display:none}
    .br-rmain{flex:1;min-width:0}
    .br-rmain b{display:block;font:800 14.5px/1.25 inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .br-rmain span{display:block;margin-top:3px;font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .br-rlinks{font:700 11px/1 inherit;color:var(--muted);white-space:nowrap;flex-shrink:0}
    .br-rprice{font:900 14.5px/1 inherit;white-space:nowrap;flex-shrink:0}
    .br-rgo{font:800 13px/1 inherit;color:var(--muted);flex-shrink:0}
    .br-row:hover .br-rgo{color:var(--text)}

    .br-more{display:flex;justify-content:center;padding:18px 0}
    .br-btn{padding:12px 22px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:var(--ink);
      font:900 13px/1 inherit;cursor:pointer;transition:.18s}
    .br-btn:hover{filter:brightness(.88);transform:translateY(-1px)}
    .br-empty{padding:54px 24px;text-align:center;border:1px dashed var(--border-strong);border-radius:20px;background:var(--card)}
    .br-empty b{display:block;font:900 20px/1.3 inherit;margin-bottom:10px}
    .br-empty p{margin:0 0 20px;color:var(--muted);font-size:13.5px;line-height:1.6}
    mark{background:var(--accent);color:var(--ink);border-radius:3px;padding:0 2px}

    @media (max-width:720px){
      .br-bar{position:static;padding:10px}
      .br-search{min-width:100%;order:-1}
      .br-cnt{margin-left:0;width:100%}
      .br-sel{flex:1;max-width:none;min-width:0}
      .br-brands{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:11px}
      .br-grid{grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:11px}
      .br-photo{height:150px}.br-photo b{font-size:16px}
      .br-title{font-size:15px}.br-body{padding:11px}
      .br-bnum b{font-size:31px}
      .br-rlinks{display:none}
      .br-lead{align-items:flex-start}
      .br-facts{width:100%}.br-fact{flex:1;text-align:left}
    }
    @media (prefers-reduced-motion:reduce){
      .br-brand,.br-card,.br-row{animation:none!important;transition:none!important}
    }
  `;
  document.head.appendChild(st);

  /* ================= ТОСТ ================= */
  let tT = 0;
  function toast(text) {
    let n = $("brToast");
    if (!n) { n = document.createElement("div"); n.id = "brToast"; n.className = "toast"; n.style.bottom = "150px"; document.body.appendChild(n); }
    n.innerHTML = `<span>${esc(text)}</span>`;
    n.classList.add("show");
    clearTimeout(tT);
    tT = setTimeout(() => n.classList.remove("show"), 2400);
  }

  /* ================= ВЫБОРКА ================= */
  function brandList() {
    const map = new Map();
    pool().forEach((x) => {
      const b = x.brand || "Без бренда";
      if (!map.has(b)) map.set(b, { name: b, count: 0, min: 0, hits: 0 });
      const r = map.get(b);
      r.count++;
      const p = Number(x.price || 0);
      if (p && (!r.min || p < r.min)) r.min = p;
      if (S.kind === "devices" && x.popular) r.hits++;
    });
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }

  function otherCount(brand) {
    const other = S.kind === "devices" ? db.coils : db.devices;
    return other.filter((x) => x.brand === brand).length;
  }

  function results() {
    const k = S.kind;
    const tk = norm(S.q).split(/\s+/).filter(Boolean);
    let list = pool();
    if (S.brand && S.brand !== "*") list = list.filter((x) => x.brand === S.brand);
    if (S.hit && k === "devices") list = list.filter((x) => x.popular);
    if (tk.length) list = list.filter((x) => { const h = hay(x, k); return tk.every((t) => h.includes(t)); });

    const cmp = {
      az: (a, b) => labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      za: (a, b) => labelOf(b, k).localeCompare(labelOf(a, k), "ru"),
      cheap: (a, b) => (a.price || 0) - (b.price || 0) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      rich: (a, b) => (b.price || 0) - (a.price || 0) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      hot: (a, b) => Number(!!b.popular) - Number(!!a.popular) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      fresh: (a, b) => fresh(b) - fresh(a) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      ohm: (a, b) => resNum(a) - resNum(b) || labelOf(a, k).localeCompare(labelOf(b, k), "ru"),
      links: (a, b) => (k === "devices" ? coilsOf(b).length - coilsOf(a).length : devicesOf(b).length - devicesOf(a).length)
    };
    return [...list].sort(cmp[S.sort] || cmp.az);
  }

  const showcase = () => !S.brand && !S.q.trim();

  /* ================= ОТРИСОВКА ================= */
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
    return `<a class="br-card" href="${itemUrl(k, x.id)}">
      ${x.popular && k === "devices" ? `<span class="br-hit">ХИТ</span>` : ""}
      ${photoHTML(x, k, "br-photo")}
      <div class="br-body">
        <div class="br-brandline">${hi(x.brand, S.q)}</div>
        <div class="br-title">${hi(titleOf(x, k), S.q)}</div>
        <div class="br-meta">
          <span class="br-pill">${esc(x.type)}</span>
          <span class="br-pill br-price">${money(x.price)}</span>
        </div>
        <div class="br-links">${relText(x, k)}</div>
        <div class="br-go"><span>Открыть карточку</span><em>→</em></div>
      </div>
    </a>`;
  }

  function rowHTML(x, k) {
    const n = k === "devices" ? coilsOf(x).length : devicesOf(x).length;
    return `<a class="br-row" href="${itemUrl(k, x.id)}">
      ${photoHTML(x, k, "br-thumb")}
      <div class="br-rmain">
        <b>${hi(labelOf(x, k), S.q)}</b>
        <span>${esc(x.type)}${x.popular && k === "devices" ? " · ХИТ" : ""} · ${n} связ.</span>
      </div>
      <span class="br-rlinks">${k === "devices" ? "картриджей" : "устройств"} ${n}</span>
      <span class="br-rprice">${money(x.price)}</span>
      <span class="br-rgo">↗</span>
    </a>`;
  }

  function render() {
    const k = S.kind;
    $("brQ").value = S.q;
    $("brQC").hidden = !S.q;
    [...$("brKind").children].forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    [...$("brView").children].forEach((b) => b.classList.toggle("on", b.dataset.v === S.view));
    $("brHit").classList.toggle("on", S.hit);
    $("brHit").hidden = k !== "devices";

    const sorts = [["az", "А → Я"], ["za", "Я → А"], ["cheap", "Цена ↑"], ["rich", "Цена ↓"], ["hot", "Сначала ХИТ"], ["fresh", "Сначала новые"], ["links", "Больше связей"]];
    if (k === "coils") sorts.splice(4, 0, ["ohm", "Сопротивление ↑"]);
    $("brSort").innerHTML = sorts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
    $("brSort").value = S.sort;

    const unit = k === "devices" ? "устройств" : "картриджей";
    const crumbs = [`<button type="button" data-home="1">Производители</button>`];
    if (S.brand === "*") crumbs.push(`<i>/</i><b>Все ${unit}</b>`);
    else if (S.brand) crumbs.push(`<i>/</i><b>${esc(S.brand)}</b>`);
    else if (S.q.trim()) crumbs.push(`<i>/</i><b>Поиск</b>`);
    $("brCrumbs").innerHTML = crumbs.join("");

    const body = $("brBody");

    if (showcase()) {
      const brands = brandList();
      const total = pool().length;
      const withPhoto = pool().filter((x) => x.image).length;
      const hits = k === "devices" ? db.devices.filter((x) => x.popular).length : 0;
      $("brCnt").textContent = `${brands.length} производителей`;
      $("brMore").hidden = true;

      body.innerHTML = `
        <div class="br-lead">
          <div>
            <h2>Выберите производителя</h2>
            <p>Сначала бренд — потом только его ${unit}. Так не приходится листать весь ассортимент подряд. Внутри бренда работает поиск и сортировка.</p>
          </div>
          <div class="br-facts">
            <div class="br-fact"><b>${total}</b><span>${unit}</span></div>
            <div class="br-fact"><b>${brands.length}</b><span>брендов</span></div>
            <div class="br-fact"><b>${withPhoto}</b><span>с фото</span></div>
            ${k === "devices" ? `<div class="br-fact"><b>${hits}</b><span>хитов</span></div>` : ""}
          </div>
        </div>
        <div class="br-brands">
          ${brands.map((b, i) => `
            <button class="br-brand" type="button" data-brand="${esc(b.name)}" style="animation-delay:${Math.min(i * 45, 400)}ms">
              <div class="br-bhead">
                <span class="br-mono">${esc(mono(b.name))}</span>
                <span>
                  <span class="br-bname">${esc(b.name)}</span>
                  <span class="br-btag">${otherCount(b.name)} ${k === "devices" ? "картриджей" : "устройств"} в базе</span>
                </span>
              </div>
              <div class="br-bnum"><b>${b.count}</b><span>${unit}<br>в наличии</span></div>
              <div class="br-bmeta">
                ${b.min ? `<span class="br-pill">от ${money(b.min)}</span>` : ""}
                ${b.hits ? `<span class="br-pill hot">${b.hits} ХИТ</span>` : ""}
              </div>
              <div class="br-bgo"><span>Смотреть ${unit}</span><em>→</em></div>
            </button>`).join("")}
          <button class="br-brand all" type="button" data-brand="*" style="animation-delay:${Math.min(brands.length * 45, 420)}ms">
            <div class="br-bhead">
              <span class="br-mono">∑</span>
              <span><span class="br-bname">Все ${unit}</span><span class="br-btag">плоский список без выбора бренда</span></span>
            </div>
            <div class="br-bnum"><b>${total}</b><span>позиций<br>всего</span></div>
            <div class="br-bmeta"><span class="br-pill">${brands.length} брендов</span></div>
            <div class="br-bgo"><span>Открыть всё</span><em>→</em></div>
          </button>
        </div>`;
      paintHash();
      return;
    }

    const list = results();
    const shown = Math.min(limit, list.length);
    const vis = list.slice(0, shown);
    $("brCnt").textContent = `${shown} из ${list.length}`;

    let head = "";
    if (S.brand && S.brand !== "*") {
      const b = brandList().find((x) => x.name === S.brand);
      head = `<div class="br-bhero">
        <span class="br-mono">${esc(mono(S.brand))}</span>
        <div class="br-bhero-t">
          <h2>${esc(S.brand)}</h2>
          <p>${b ? `${b.count} ${unit} · ${otherCount(S.brand)} ${k === "devices" ? "картриджей" : "устройств"} этого бренда${b.min ? ` · от ${money(b.min)}` : ""}` : `${list.length} ${unit}`}</p>
        </div>
        <button class="br-back" type="button" data-home="1">← Все производители</button>
      </div>`;
    } else if (S.brand === "*") {
      head = `<div class="br-bhero">
        <span class="br-mono">∑</span>
        <div class="br-bhero-t"><h2>Все ${unit}</h2><p>${list.length} позиций всех производителей единым списком</p></div>
        <button class="br-back" type="button" data-home="1">← Все производители</button>
      </div>`;
    } else {
      head = `<div class="br-bhero">
        <span class="br-mono">?</span>
        <div class="br-bhero-t"><h2>Поиск по каталогу</h2><p>«${esc(S.q)}» — ${list.length} совпадений среди всех производителей</p></div>
        <button class="br-back" type="button" data-home="1">← Все производители</button>
      </div>`;
    }

    const stats = `<div class="br-stats">
      <span>Подходит <b>${list.length}</b></span>
      <span>В базе <b>${pool().length}</b></span>
      <span>Брендов в выдаче <b>${new Set(list.map((x) => x.brand)).size}</b></span>
      <span>С фото <b>${list.filter((x) => x.image).length}</b></span>
    </div>`;

    if (!list.length) {
      body.innerHTML = head + stats + `<div class="br-empty"><b>Ничего не найдено</b><p>Измените запрос${S.hit ? ", снимите отбор «ХИТ»" : ""} или вернитесь к выбору производителя.</p><button class="br-btn" type="button" data-home="1">К производителям</button></div>`;
      $("brMore").hidden = true;
      paintHash();
      return;
    }

    body.innerHTML = head + stats + (S.view === "grid"
      ? `<div class="br-grid">${vis.map((x) => cardHTML(x, k)).join("")}</div>`
      : `<div class="br-list">${vis.map((x) => rowHTML(x, k)).join("")}</div>`);

    $("brMore").hidden = shown >= list.length;
    $("brMoreB").textContent = `Показать ещё ${Math.min(PAGE, list.length - shown)} · осталось ${list.length - shown}`;
    paintHash();
  }

  /* ================= ХЭШ ================= */
  function hashString() {
    const p = new URLSearchParams();
    if (S.brand) p.set("b", S.brand);
    if (S.kind !== "devices") p.set("k", S.kind);
    if (S.q) p.set("q", S.q);
    if (S.sort !== "az") p.set("o", S.sort);
    if (S.view !== "grid") p.set("v", S.view);
    if (S.hit) p.set("h", "1");
    return p.toString();
  }
  function paintHash(push) {
    const s = hashString();
    const url = s ? "#" + s : location.pathname + location.search;
    try { push ? history.pushState(null, "", url) : history.replaceState(null, "", url); } catch {}
  }
  function readHash() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw || /^(device|coil)=/.test(raw)) return false;
    const p = new URLSearchParams(raw);
    S.brand = p.get("b") || null;
    S.kind = p.get("k") === "coils" ? "coils" : "devices";
    S.q = p.get("q") || "";
    S.sort = p.get("o") || "az";
    S.view = p.get("v") === "list" ? "list" : "grid";
    S.hit = p.get("h") === "1";
    return true;
  }

  /* ================= ДЕЙСТВИЯ ================= */
  function scrollTop() {
    const tabs = parseFloat(getComputedStyle(root).getPropertyValue("--br-tabs")) || 0;
    const bar = parseFloat(getComputedStyle(root).getPropertyValue("--br-bar")) || 0;
    const y = root.getBoundingClientRect().top + scrollY - tabs - bar - 14;
    scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }
  function goBrand(name) {
    S.brand = name;
    limit = PAGE;
    render();
    paintHash(true);
    scrollTop();
  }
  function goHome() {
    S.brand = null; S.q = ""; S.hit = false;
    limit = PAGE;
    render();
    paintHash(true);
    scrollTo({ top: 0, behavior: "smooth" });
  }
  function refresh(resetLimit = true) { if (resetLimit) limit = PAGE; render(); }

  /* ================= СОБЫТИЯ ================= */
  let qT = 0;
  $("brQ").addEventListener("input", (e) => {
    clearTimeout(qT);
    const v = e.target.value;
    qT = setTimeout(() => { S.q = v; refresh(); }, 140);
  });
  $("brQC").addEventListener("click", () => { S.q = ""; refresh(); $("brQ").focus(); });

  $("brKind").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b || S.kind === b.dataset.k) return;
    S.kind = b.dataset.k;
    if (S.sort === "ohm" && S.kind !== "coils") S.sort = "az";
    S.hit = false;
    savePref(); refresh();
  });
  $("brView").addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    S.view = b.dataset.v; savePref(); refresh(false);
  });
  $("brSort").addEventListener("change", (e) => { S.sort = e.target.value; savePref(); refresh(); });
  $("brHit").addEventListener("click", () => { S.hit = !S.hit; refresh(); });
  $("brReset").addEventListener("click", () => { goHome(); toast("Показаны все производители"); });
  $("brMoreB").addEventListener("click", () => { limit += PAGE; render(); });

  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-brand]");
    if (b) { goBrand(b.dataset.brand); return; }
    if (e.target.closest("[data-home]")) { goHome(); return; }
  });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault(); $("brQ").focus(); $("brQ").select(); return;
    }
    if (e.key === "Escape") {
      if (S.q) { S.q = ""; refresh(); return; }
      if (S.brand) goHome();
    }
  });

  window.addEventListener("popstate", () => { readHash(); limit = PAGE; render(); });

  /* ================= ЖИВАЯ БАЗА ================= */
  let dbT = 0;
  function reload() {
    clearTimeout(dbT);
    dbT = setTimeout(() => {
      db = readDb();
      if (S.brand && S.brand !== "*" && !pool().some((x) => x.brand === S.brand)) S.brand = null;
      render();
    }, 200);
  }
  const origSet = localStorage.setItem.bind(localStorage);
  const origDel = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function (k, v) { origSet(k, v); if (k === DB_KEY) reload(); };
  localStorage.removeItem = function (k) { origDel(k); if (k === DB_KEY) reload(); };
  window.addEventListener("storage", (e) => { if (e.key === DB_KEY) reload(); });
  document.querySelectorAll('.tab[data-tab="catalog"]').forEach((b) => b.addEventListener("click", () => setTimeout(() => { db = readDb(); render(); }, 0)));

  /* ================= ЛИПКИЕ ОТСТУПЫ ================= */
  function measure() {
    const tabs = document.querySelector(".tabs");
    root.style.setProperty("--br-tabs", (tabs ? Math.round(tabs.getBoundingClientRect().height) : 0) + "px");
    root.style.setProperty("--br-bar", Math.round($("brBar").getBoundingClientRect().height) + "px");
  }
  const ro = new ResizeObserver(measure);
  const tabsEl = document.querySelector(".tabs");
  if (tabsEl) ro.observe(tabsEl);
  ro.observe($("brBar"));
  window.addEventListener("resize", measure);

  const io = new IntersectionObserver((en) => {
    if (en.some((x) => x.isIntersecting) && !showcase() && limit < results().length) { limit += PAGE; render(); }
  }, { rootMargin: "320px" });
  io.observe($("brSentinel"));

  window.addEventListener("pagehide", () => { clearTimeout(dbT); clearTimeout(qT); ro.disconnect(); io.disconnect(); });

  /* ================= СТАРТ ================= */
  readHash();
  measure();
  render();
})();
