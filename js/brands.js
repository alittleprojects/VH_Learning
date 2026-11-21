(() => {
  "use strict";

  const host = document.getElementById("catalog");
  if (!host || document.getElementById("btRoot")) return;

  const DB_KEY = "vape_academy_catalog_v6";
  const PREF_KEY = "vh_brutal_pref_v1";
  const PAGE = 48;

  /* ================= УТИЛИТЫ ================= */
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
  const pad = (n) => String(n).padStart(2, "0");
  const money = (n) => { const v = Number(n || 0); return v ? `${v.toLocaleString("ru-RU")} ₽` : "ЦЕНА НЕ УКАЗАНА"; };
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

  const INIT = { vaporesso: "VP", voopoo: "VO", geekvape: "GV", rincoe: "RC", smoant: "SM", brusko: "BR", lostvape: "LV", plonq: "PL", smok: "SK", joyetech: "JT", elfbar: "EB" };
  function mono(brand) {
    const key = norm(brand).replace(/[^a-zа-я0-9]/g, "");
    if (INIT[key]) return INIT[key];
    const p = String(brand || "").trim().split(/\s+/).filter(Boolean);
    if (p.length > 1) return (p[0][0] + p[1][0]).toUpperCase();
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
    d.meta = d.meta || {};
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
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    ["kind", "sort", "view"].forEach((k) => { if (p[k] !== undefined) S[k] = p[k]; });
  } catch {}
  const savePref = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ kind: S.kind, sort: S.sort, view: S.view })); } catch {} };

  /* ================= КАРКАС ================= */
  [...host.children].forEach((n) => { n.hidden = true; n.dataset.btLegacy = "1"; });

  const root = document.createElement("div");
  root.id = "btRoot";
  root.className = "bt-root";
  root.innerHTML = `
    <div class="bt-bar" id="btBar">
      <div class="bt-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>
        <input id="btQ" type="search" placeholder="ПОИСК ПО КАТАЛОГУ…" autocomplete="off" spellcheck="false">
        <button class="bt-clr" id="btQC" type="button" title="Очистить" hidden>✕</button>
      </div>
      <div class="bt-pills" id="btKind">
        <button type="button" data-k="devices">УСТРОЙСТВА</button>
        <button type="button" data-k="coils">КАРТРИДЖИ</button>
      </div>
      <select class="bt-sel" id="btSort" title="Сортировка"></select>
      <div class="bt-pills bt-pills--ic" id="btView">
        <button type="button" data-v="grid" title="Плитка">▦</button>
        <button type="button" data-v="list" title="Список">☰</button>
      </div>
      <button class="bt-ib" id="btHit" type="button">ХИТ</button>
      <button class="bt-ib" id="btReset" type="button">СБРОС</button>
      <span class="bt-cnt" id="btCnt"></span>
    </div>

    <nav class="bt-crumbs" id="btCrumbs" aria-label="Навигация"></nav>
    <div id="btBody"></div>
    <div class="bt-more" id="btMore" hidden><button class="bt-btn" id="btMoreB" type="button"></button></div>
    <div id="btSentinel" style="height:1px"></div>

    <div class="bt-status">
      <span>© V&amp;H · КАТАЛОГ ОБУЧЕНИЯ</span>
      <span class="bt-live"><i></i>БАЗА АКТИВНА</span>
      <span id="btStatTotal"></span>
      <span id="btStatBuild"></span>
    </div>
  `;
  host.appendChild(root);

  /* ================= СТИЛИ ================= */
  const st = document.createElement("style");
  st.id = "btStyles";
  st.textContent = `
    html{scrollbar-width:thin;scrollbar-color:#fff #000}
    html::-webkit-scrollbar{width:13px;height:13px}
    html::-webkit-scrollbar-track{background:#000;border-left:1px solid #2a2a2a}
    html::-webkit-scrollbar-thumb{background:#fff;border:3px solid #000}
    html::-webkit-scrollbar-thumb:hover{background:#8a8a8a}
    :root[data-theme="light"] html,:root[data-theme="light"]{scrollbar-color:#000 #fff}
    :root[data-theme="light"] ::-webkit-scrollbar-track{background:#fff;border-left:1px solid #d0d0d0}
    :root[data-theme="light"] ::-webkit-scrollbar-thumb{background:#000;border:3px solid #fff}
    :root[data-theme="light"] ::-webkit-scrollbar-thumb:hover{background:#6a6a6a}

    .bt-root{
      --bg:#000;--fg:#fff;--dim:#8c8c8c;--dim2:#5e5e5e;--line:#262626;--line2:#3d3d3d;
      --tile:#080808;--hatch:rgba(255,255,255,.055);
      --card:#fff;--cardfg:#000;--cardline:#000;--carddim:#5c5c5c;
      --invbg:#fff;--invfg:#000;--tabs:61px;--bar:66px;
      font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
      background:var(--bg);color:var(--fg);margin:-22px -22px 0;padding:22px 22px 0;
      border-top:2px solid var(--fg)}
    :root[data-theme="light"] .bt-root{
      --bg:#fff;--fg:#000;--dim:#5c5c5c;--dim2:#8c8c8c;--line:#d6d6d6;--line2:#a8a8a8;
      --tile:#f2f2f2;--hatch:rgba(0,0,0,.06);
      --card:#fff;--cardfg:#000;--cardline:#000;--carddim:#5c5c5c;
      --invbg:#000;--invfg:#fff}
    .bt-root *{box-sizing:border-box;border-radius:0}
    .bt-root button,.bt-root input,.bt-root select{font-family:inherit}
    .bt-root :focus-visible{outline:3px solid var(--fg);outline-offset:2px}
    .bt-root mark{background:var(--fg);color:var(--bg);padding:0 3px}

    /* ---- ПАНЕЛЬ ---- */
    .bt-bar{position:sticky;top:var(--tabs);z-index:40;display:flex;flex-wrap:wrap;gap:10px;align-items:center;
      padding:12px 0;margin-bottom:18px;background:var(--bg);border-bottom:2px solid var(--fg)}
    .bt-search{position:relative;flex:1;min-width:250px;display:flex;align-items:center}
    .bt-search svg{position:absolute;left:13px;width:17px;height:17px;color:var(--dim);pointer-events:none}
    .bt-search input{width:100%;padding:12px 42px 12px 40px;border:2px solid var(--line2);background:var(--bg);
      color:var(--fg);font-size:12.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
    .bt-search input::placeholder{color:var(--dim2)}
    .bt-search input:focus{outline:none;border-color:var(--fg)}
    .bt-clr{position:absolute;right:8px;background:none;border:0;color:var(--dim);cursor:pointer;font-size:14px;padding:6px}
    .bt-clr:hover{color:var(--fg)}
    .bt-pills{display:flex;gap:6px;flex-shrink:0}
    .bt-pills button{padding:11px 16px;border:2px solid var(--line2);background:var(--bg);color:var(--dim);
      font-size:11.5px;font-weight:900;letter-spacing:.11em;cursor:pointer;transition:.14s;white-space:nowrap}
    .bt-pills button:hover{border-color:var(--fg);color:var(--fg)}
    .bt-pills button.on{background:var(--fg);color:var(--bg);border-color:var(--fg)}
    .bt-pills--ic button{padding:11px 13px;font-size:14px;letter-spacing:0}
    .bt-sel{padding:11px 13px;border:2px solid var(--line2);background:var(--bg);color:var(--fg);
      font-size:11.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;max-width:210px}
    .bt-sel:focus{outline:none;border-color:var(--fg)}
    .bt-ib{padding:11px 15px;border:2px solid var(--line2);background:var(--bg);color:var(--dim);
      font-size:11.5px;font-weight:900;letter-spacing:.11em;cursor:pointer;transition:.14s;white-space:nowrap}
    .bt-ib:hover{border-color:var(--fg);color:var(--fg)}
    .bt-ib.on{background:var(--fg);color:var(--bg);border-color:var(--fg)}
    .bt-cnt{margin-left:auto;font-size:11px;font-weight:900;letter-spacing:.14em;color:var(--dim);white-space:nowrap}

    .bt-crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:16px;
      font-size:10.5px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--dim2)}
    .bt-crumbs button{background:none;border:0;padding:0;color:var(--dim);font:inherit;cursor:pointer}
    .bt-crumbs button:hover{color:var(--fg);text-decoration:underline;text-underline-offset:3px}
    .bt-crumbs b{color:var(--fg)}
    .bt-crumbs i{font-style:normal;opacity:.55}

    /* ---- ЗАГОЛОВОК ---- */
    .bt-head{margin-bottom:26px}
    .bt-head h2{margin:0;font-size:clamp(46px,9.2vw,112px);font-weight:900;line-height:.84;
      letter-spacing:-.05em;text-transform:uppercase}
    .bt-head p{margin:16px 0 0;max-width:56ch;font-size:12px;font-weight:800;line-height:1.75;
      letter-spacing:.13em;text-transform:uppercase;color:var(--dim)}
    .bt-facts{display:flex;flex-wrap:wrap;gap:0;margin-top:20px;border:2px solid var(--fg)}
    .bt-fact{flex:1;min-width:118px;padding:12px 14px;border-right:2px solid var(--fg)}
    .bt-fact:last-child{border-right:0}
    .bt-fact b{display:block;font-size:26px;font-weight:900;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
    .bt-fact span{display:block;margin-top:6px;font-size:9px;font-weight:900;letter-spacing:.16em;color:var(--dim)}

    /* ---- ПЛИТКИ БРЕНДОВ ---- */
    .bt-brands{display:grid;grid-template-columns:repeat(auto-fit,minmax(212px,1fr));gap:12px;margin-bottom:34px}
    .bt-tile{position:relative;display:flex;flex-direction:column;justify-content:space-between;
      min-height:262px;padding:20px 18px;text-align:left;cursor:pointer;overflow:hidden;
      border:2px solid var(--line2);background:var(--tile);color:var(--fg);
      transition:transform .16s cubic-bezier(.2,.8,.3,1),box-shadow .16s,background .16s,color .16s,border-color .16s;
      animation:btIn .45s cubic-bezier(.2,.8,.25,1) both}
    @keyframes btIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    .bt-tile::before{content:"";position:absolute;inset:0;pointer-events:none;
      background:repeating-linear-gradient(45deg,transparent 0 7px,var(--hatch) 7px 8px)}
    .bt-tile:hover{transform:translate(-4px,-4px);box-shadow:9px 9px 0 var(--fg);
      background:var(--fg);color:var(--bg);border-color:var(--fg)}
    .bt-tile:hover::before{background:repeating-linear-gradient(45deg,transparent 0 7px,rgba(128,128,128,.22) 7px 8px)}
    .bt-tile:active{transform:translate(0,0);box-shadow:0 0 0 var(--fg)}
    .bt-mono{position:relative;font-size:clamp(54px,7.4vw,92px);font-weight:900;line-height:.82;letter-spacing:-.06em}
    .bt-tname{position:relative;margin-top:10px;font-size:10px;font-weight:900;letter-spacing:.18em;
      text-transform:uppercase;color:var(--dim);transition:color .16s}
    .bt-tile:hover .bt-tname{color:var(--bg);opacity:.72}
    .bt-tnum{position:relative;display:flex;align-items:flex-end;gap:10px;margin-top:auto;padding-top:22px}
    .bt-tnum b{font-size:44px;font-weight:900;line-height:.82;letter-spacing:-.045em;font-variant-numeric:tabular-nums}
    .bt-tnum span{padding-bottom:3px;font-size:9.5px;font-weight:900;letter-spacing:.16em;line-height:1.4;color:var(--dim);transition:color .16s}
    .bt-tile:hover .bt-tnum span{color:var(--bg);opacity:.72}
    .bt-tmeta{position:relative;display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
    .bt-tag{padding:4px 8px;border:1.5px solid currentColor;font-size:9px;font-weight:900;letter-spacing:.12em;opacity:.72}
    .bt-tile.inv{background:var(--invbg);color:var(--invfg);border-color:var(--invbg)}
    .bt-tile.inv::before{background:repeating-linear-gradient(45deg,transparent 0 7px,rgba(128,128,128,.16) 7px 8px)}
    .bt-tile.inv .bt-tname,.bt-tile.inv .bt-tnum span{color:var(--invfg);opacity:.66}
    .bt-tile.inv:hover{background:var(--bg);color:var(--fg);border-color:var(--fg);box-shadow:9px 9px 0 var(--fg)}
    .bt-tile.inv:hover .bt-tname,.bt-tile.inv:hover .bt-tnum span{color:var(--fg);opacity:.72}
    .bt-alltxt{position:relative;font-size:clamp(26px,3.2vw,38px);font-weight:900;line-height:.9;letter-spacing:-.035em;text-transform:uppercase}

    /* ---- СЕКЦИЯ ---- */
    .bt-sechead{display:flex;align-items:center;gap:14px;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid var(--fg)}
    .bt-sechead h3{margin:0;font-size:15px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
    .bt-sechead span{margin-left:auto;font-size:10px;font-weight:900;letter-spacing:.14em;color:var(--dim)}

    /* ---- ШАПКА БРЕНДА ---- */
    .bt-bhero{display:flex;flex-wrap:wrap;gap:20px;align-items:center;padding:20px;margin-bottom:22px;
      border:2px solid var(--fg);background:var(--tile);position:relative;overflow:hidden}
    .bt-bhero::before{content:"";position:absolute;inset:0;pointer-events:none;
      background:repeating-linear-gradient(45deg,transparent 0 7px,var(--hatch) 7px 8px)}
    .bt-bhero .bt-mono{font-size:clamp(48px,6vw,76px)}
    .bt-bhero-t{position:relative;flex:1;min-width:190px}
    .bt-bhero-t h2{margin:0;font-size:clamp(26px,4vw,44px);font-weight:900;letter-spacing:-.04em;line-height:.95;text-transform:uppercase}
    .bt-bhero-t p{margin:9px 0 0;font-size:10.5px;font-weight:900;letter-spacing:.14em;color:var(--dim);text-transform:uppercase;line-height:1.7}
    .bt-back{position:relative;padding:12px 17px;border:2px solid var(--fg);background:var(--bg);color:var(--fg);
      font-size:11px;font-weight:900;letter-spacing:.12em;cursor:pointer;transition:.14s;white-space:nowrap}
    .bt-back:hover{background:var(--fg);color:var(--bg)}

    .bt-stats{display:flex;flex-wrap:wrap;gap:18px;margin-bottom:18px;font-size:10px;font-weight:900;letter-spacing:.14em;color:var(--dim);text-transform:uppercase}
    .bt-stats b{color:var(--fg);font-variant-numeric:tabular-nums}

    /* ---- КАРТОЧКИ ---- */
    .bt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:14px}
    .bt-card{position:relative;display:flex;flex-direction:column;background:var(--card);color:var(--cardfg);
      border:2px solid var(--cardline);text-decoration:none;overflow:hidden;
      transition:transform .16s cubic-bezier(.2,.8,.3,1),box-shadow .16s}
    .bt-card:hover{transform:translate(-4px,-4px);box-shadow:9px 9px 0 var(--fg)}
    .bt-card:active{transform:none;box-shadow:none}
    .bt-photo{position:relative;height:236px;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden}
    .bt-photo img{width:100%;height:100%;object-fit:contain;padding:22px;transition:transform .4s}
    .bt-card:hover .bt-photo img{transform:scale(1.06)}
    .bt-photo b{padding:20px;text-align:center;font-size:22px;font-weight:900;letter-spacing:-.02em;color:#9a9a9a;text-transform:uppercase}
    .bt-photo.has b{display:none}
    .bt-hit{position:absolute;top:0;left:0;z-index:2;padding:7px 11px;background:#000;color:#fff;
      font-size:9.5px;font-weight:900;letter-spacing:.16em}
    .bt-cbody{display:flex;flex-direction:column;flex:1;padding:16px;border-top:2px solid var(--cardline)}
    .bt-cbrand{font-size:9.5px;font-weight:900;letter-spacing:.2em;color:var(--carddim);text-transform:uppercase}
    .bt-ctitle{margin:7px 0 6px;font-size:23px;font-weight:900;line-height:1.05;letter-spacing:-.03em;
      text-transform:uppercase;overflow-wrap:anywhere}
    .bt-ctype{font-size:10px;font-weight:900;letter-spacing:.15em;color:var(--carddim);text-transform:uppercase}
    .bt-cprice{margin-top:10px;font-size:17px;font-weight:900;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
    .bt-clinks{margin-top:10px;padding-top:10px;border-top:1.5px solid #dcdcdc;font-size:10.5px;
      font-weight:700;line-height:1.6;color:var(--carddim)}
    .bt-clinks b{color:var(--cardfg);font-weight:900}
    .bt-cfoot{display:flex;align-items:center;gap:10px;margin-top:auto;padding-top:14px}
    .bt-step{padding:6px 9px;border:1.5px solid var(--cardline);font-size:9px;font-weight:900;letter-spacing:.13em;white-space:nowrap}
    .bt-start{margin-left:auto;padding:12px 20px;background:#000;color:#fff;border:2px solid #000;
      font-size:11px;font-weight:900;letter-spacing:.16em;cursor:pointer;transition:.14s;white-space:nowrap}
    .bt-card:hover .bt-start{background:#fff;color:#000}

    /* ---- СПИСОК ---- */
    .bt-list{display:flex;flex-direction:column;gap:0;border:2px solid var(--fg)}
    .bt-row{display:flex;gap:14px;align-items:center;padding:11px 14px;background:var(--card);color:var(--cardfg);
      border-bottom:2px solid var(--cardline);text-decoration:none;transition:.14s}
    .bt-row:last-child{border-bottom:0}
    .bt-row:hover{background:#000;color:#fff}
    .bt-row:hover .bt-rsub,.bt-row:hover .bt-rlinks{color:#b4b4b4}
    .bt-row:hover .bt-thumb{border-color:#fff}
    .bt-thumb{width:58px;height:58px;flex-shrink:0;background:#fff;border:2px solid var(--cardline);
      display:flex;align-items:center;justify-content:center;overflow:hidden}
    .bt-thumb img{width:100%;height:100%;object-fit:contain;padding:5px}
    .bt-thumb b{font-size:9px;font-weight:900;color:#9a9a9a;text-align:center;padding:3px;text-transform:uppercase}
    .bt-thumb.has b{display:none}
    .bt-rmain{flex:1;min-width:0}
    .bt-rmain b{display:block;font-size:15px;font-weight:900;letter-spacing:-.01em;text-transform:uppercase;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bt-rsub{display:block;margin-top:4px;font-size:9.5px;font-weight:900;letter-spacing:.13em;color:var(--carddim);
      text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bt-rlinks{font-size:9.5px;font-weight:900;letter-spacing:.13em;color:var(--carddim);white-space:nowrap;flex-shrink:0}
    .bt-rprice{font-size:15px;font-weight:900;white-space:nowrap;flex-shrink:0;font-variant-numeric:tabular-nums}
    .bt-rgo{font-size:15px;font-weight:900;flex-shrink:0}

    /* ---- ПРОЧЕЕ ---- */
    .bt-more{display:flex;justify-content:center;padding:22px 0}
    .bt-btn{padding:15px 28px;border:2px solid var(--fg);background:var(--fg);color:var(--bg);
      font-size:12px;font-weight:900;letter-spacing:.16em;cursor:pointer;transition:.14s}
    .bt-btn:hover{background:var(--bg);color:var(--fg)}
    .bt-empty{padding:60px 24px;text-align:center;border:2px dashed var(--line2)}
    .bt-empty b{display:block;font-size:26px;font-weight:900;letter-spacing:-.02em;text-transform:uppercase;margin-bottom:12px}
    .bt-empty p{margin:0 0 22px;font-size:11px;font-weight:800;letter-spacing:.12em;line-height:1.8;color:var(--dim);text-transform:uppercase}
    .bt-status{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:34px -22px 0;padding:14px 22px;
      border-top:2px solid var(--fg);font-size:9.5px;font-weight:900;letter-spacing:.16em;color:var(--dim);text-transform:uppercase}
    .bt-status span:nth-child(2){margin-left:auto}
    .bt-live{display:inline-flex;align-items:center;gap:8px;color:var(--fg)}
    .bt-live i{width:8px;height:8px;background:var(--fg);animation:btPulse 2s steps(1) infinite}
    @keyframes btPulse{0%,60%{opacity:1}61%,100%{opacity:.25}}

    @media (max-width:820px){
      .bt-root{margin:-14px -14px 0;padding:16px 14px 0}
      .bt-bar{position:static;padding:10px 0}
      .bt-search{min-width:100%;order:-1}
      .bt-cnt{margin-left:0;width:100%}
      .bt-sel{flex:1;max-width:none;min-width:0}
      .bt-brands{grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:9px}
      .bt-tile{min-height:196px;padding:15px 13px}
      .bt-tnum b{font-size:34px}
      .bt-grid{grid-template-columns:repeat(auto-fill,minmax(164px,1fr));gap:10px}
      .bt-photo{height:158px}.bt-photo img{padding:12px}.bt-photo b{font-size:15px}
      .bt-cbody{padding:12px}.bt-ctitle{font-size:16px}.bt-cprice{font-size:14px}
      .bt-clinks{display:none}
      .bt-cfoot{flex-wrap:wrap;gap:7px}
      .bt-start{margin-left:0;width:100%;text-align:center;padding:11px}
      .bt-status{margin:26px -14px 0;padding:12px 14px;gap:9px}
      .bt-status span:nth-child(2){margin-left:0}
      .bt-rlinks{display:none}
      .bt-fact{min-width:50%;border-bottom:2px solid var(--fg)}
      .bt-fact:nth-child(even){border-right:0}
    }
    @media (prefers-reduced-motion:reduce){
      .bt-tile,.bt-card,.bt-row{animation:none!important;transition:none!important}
      .bt-live i{animation:none}
    }
  `;
  document.head.appendChild(st);

  /* ================= ТОСТ ================= */
  let tT = 0;
  function toast(text) {
    let n = $("btToast");
    if (!n) {
      n = document.createElement("div");
      n.id = "btToast";
      n.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translate(-50%,20px);opacity:0;pointer-events:none;z-index:9999;padding:14px 20px;border:2px solid var(--bt-f,#fff);background:#000;color:#fff;font:900 11.5px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;transition:.22s;max-width:min(92vw,460px)";
      document.body.appendChild(n);
    }
    const light = document.documentElement.getAttribute("data-theme") === "light";
    n.style.background = light ? "#000" : "#fff";
    n.style.color = light ? "#fff" : "#000";
    n.style.borderColor = light ? "#000" : "#fff";
    n.textContent = text;
    n.style.opacity = "1";
    n.style.transform = "translate(-50%,0)";
    clearTimeout(tT);
    tT = setTimeout(() => { n.style.opacity = "0"; n.style.transform = "translate(-50%,20px)"; }, 2400);
  }

  /* ================= ВЫБОРКА ================= */
  function brandList() {
    const map = new Map();
    pool().forEach((x) => {
      const b = x.brand || "БЕЗ БРЕНДА";
      if (!map.has(b)) map.set(b, { name: b, count: 0, min: 0, hits: 0 });
      const r = map.get(b);
      r.count++;
      const p = Number(x.price || 0);
      if (p && (!r.min || p < r.min)) r.min = p;
      if (S.kind === "devices" && x.popular) r.hits++;
    });
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }
  const otherCount = (brand) => (S.kind === "devices" ? db.coils : db.devices).filter((x) => x.brand === brand).length;

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
      if (!c.length) return `<b>СОВМЕСТИМОСТЬ НЕ ЗАПОЛНЕНА</b>`;
      const n = [...new Set(c.map((y) => y.name))];
      return `<b>${c.length}</b> КАРТР. · ${esc(n.slice(0, 2).join(", "))}${n.length > 2 ? " +" + (n.length - 2) : ""}`;
    }
    const d = devicesOf(x);
    if (!d.length) return `<b>НЕТ ПРИВЯЗАННЫХ УСТРОЙСТВ</b>`;
    return `<b>${d.length}</b> УСТР. · ${esc(d.slice(0, 2).map((y) => y.model).join(", "))}${d.length > 2 ? " +" + (d.length - 2) : ""}`;
  }
  function photoHTML(x, k, cls) {
    const src = x.image ? imgUrl(x.image) : "";
    const t = titleOf(x, k);
    return `<div class="${cls}${src ? " has" : ""}">${src ? `<img src="${esc(src)}" alt="${esc(t)}" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove('has');this.remove();">` : ""}<b>${esc(t)}</b></div>`;
  }
  function cardHTML(x, k) {
    const n = k === "devices" ? coilsOf(x).length : devicesOf(x).length;
    return `<a class="bt-card" href="${itemUrl(k, x.id)}">
      ${x.popular && k === "devices" ? `<span class="bt-hit">ХИТ</span>` : ""}
      ${photoHTML(x, k, "bt-photo")}
      <div class="bt-cbody">
        <div class="bt-cbrand">${hi(x.brand, S.q)}</div>
        <div class="bt-ctitle">${hi(titleOf(x, k), S.q)}</div>
        <div class="bt-ctype">${esc(x.type)}</div>
        <div class="bt-cprice">${money(x.price)}</div>
        <div class="bt-clinks">${relText(x, k)}</div>
        <div class="bt-cfoot">
          <span class="bt-step">${n} ${k === "devices" ? "КАРТРИДЖЕЙ" : "УСТРОЙСТВ"}</span>
          <span class="bt-start">ОТКРЫТЬ</span>
        </div>
      </div>
    </a>`;
  }
  function rowHTML(x, k) {
    const n = k === "devices" ? coilsOf(x).length : devicesOf(x).length;
    return `<a class="bt-row" href="${itemUrl(k, x.id)}">
      ${photoHTML(x, k, "bt-thumb")}
      <div class="bt-rmain">
        <b>${hi(labelOf(x, k), S.q)}</b>
        <span class="bt-rsub">${esc(x.type)}${x.popular && k === "devices" ? " · ХИТ" : ""}</span>
      </div>
      <span class="bt-rlinks">${n} СВЯЗ.</span>
      <span class="bt-rprice">${money(x.price)}</span>
      <span class="bt-rgo">→</span>
    </a>`;
  }

  function render() {
    const k = S.kind;
    const unit = k === "devices" ? "УСТРОЙСТВ" : "КАРТРИДЖЕЙ";
    $("btQ").value = S.q;
    $("btQC").hidden = !S.q;
    [...$("btKind").children].forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    [...$("btView").children].forEach((b) => b.classList.toggle("on", b.dataset.v === S.view));
    $("btHit").classList.toggle("on", S.hit);
    $("btHit").hidden = k !== "devices";

    const sorts = [["az", "А → Я"], ["za", "Я → А"], ["cheap", "ЦЕНА ↑"], ["rich", "ЦЕНА ↓"], ["hot", "СНАЧАЛА ХИТ"], ["fresh", "СНАЧАЛА НОВЫЕ"], ["links", "БОЛЬШЕ СВЯЗЕЙ"]];
    if (k === "coils") sorts.splice(4, 0, ["ohm", "СОПРОТИВЛЕНИЕ ↑"]);
    $("btSort").innerHTML = sorts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
    $("btSort").value = S.sort;

    const crumbs = [`<button type="button" data-home="1">ПРОИЗВОДИТЕЛИ</button>`];
    if (S.brand === "*") crumbs.push(`<i>/</i><b>ВСЕ ${unit}</b>`);
    else if (S.brand) crumbs.push(`<i>/</i><b>${esc(S.brand)}</b>`);
    else if (S.q.trim()) crumbs.push(`<i>/</i><b>ПОИСК</b>`);
    $("btCrumbs").innerHTML = crumbs.join("");

    $("btStatTotal").textContent = `ПОЗИЦИЙ: ${db.devices.length + db.coils.length}`;
    const upd = db.meta.updatedAt ? new Date(db.meta.updatedAt) : null;
    $("btStatBuild").textContent = upd && !isNaN(upd) ? `ОБНОВЛЕНО ${upd.toLocaleDateString("ru-RU")}` : "БАЗА ЛОКАЛЬНАЯ";

    const body = $("btBody");

    if (showcase()) {
      const brands = brandList();
      const total = pool().length;
      const withPhoto = pool().filter((x) => x.image).length;
      const hits = k === "devices" ? db.devices.filter((x) => x.popular).length : 0;
      const featured = (k === "devices" ? db.devices.filter((x) => x.popular) : db.coils).slice(0, 3);
      const feat = featured.length ? featured : pool().slice(0, 3);

      $("btCnt").textContent = `${brands.length} ПРОИЗВОДИТЕЛЕЙ`;
      $("btMore").hidden = true;

      body.innerHTML = `
        <div class="bt-head">
          <h2>ВЫБЕРИ<br>БРЕНД</h2>
          <p>Выбери производителя — откроется только его линейка ${unit}. Без бесконечной ленты всего ассортимента.</p>
          <div class="bt-facts">
            <div class="bt-fact"><b>${pad(total)}</b><span>${unit}</span></div>
            <div class="bt-fact"><b>${pad(brands.length)}</b><span>БРЕНДОВ</span></div>
            <div class="bt-fact"><b>${pad(withPhoto)}</b><span>С ФОТО</span></div>
            ${k === "devices" ? `<div class="bt-fact"><b>${pad(hits)}</b><span>ХИТОВ</span></div>` : ""}
          </div>
        </div>

        <div class="bt-brands">
          ${brands.map((b, i) => `
            <button class="bt-tile" type="button" data-brand="${esc(b.name)}" style="animation-delay:${Math.min(i * 45, 380)}ms">
              <div>
                <div class="bt-mono">${esc(mono(b.name))}</div>
                <div class="bt-tname">${esc(b.name)}</div>
              </div>
              <div>
                <div class="bt-tnum"><b>${pad(b.count)}</b><span>${unit}<br>В БАЗЕ</span></div>
                <div class="bt-tmeta">
                  ${b.min ? `<span class="bt-tag">ОТ ${b.min.toLocaleString("ru-RU")} ₽</span>` : ""}
                  ${b.hits ? `<span class="bt-tag">${b.hits} ХИТ</span>` : ""}
                  <span class="bt-tag">${otherCount(b.name)} ${k === "devices" ? "КАРТР." : "УСТР."}</span>
                </div>
              </div>
            </button>`).join("")}
          <button class="bt-tile inv" type="button" data-brand="*" style="animation-delay:${Math.min(brands.length * 45, 400)}ms">
            <div class="bt-alltxt">ВСЕ<br>${unit}</div>
            <div>
              <div class="bt-tnum"><b>${pad(total)}</b><span>ПОЗИЦИЙ<br>ВСЕГО</span></div>
              <div class="bt-tmeta"><span class="bt-tag">${brands.length} БРЕНДОВ</span></div>
            </div>
          </button>
        </div>

        ${feat.length ? `
          <div class="bt-sechead"><h3>${k === "devices" ? "ХИТЫ ПРОДАЖ" : "ПОПУЛЯРНЫЕ КАРТРИДЖИ"}</h3><span>${feat.length} ПОЗИЦИИ</span></div>
          <div class="bt-grid">${feat.map((x) => cardHTML(x, k)).join("")}</div>` : ""}
      `;
      paintHash();
      return;
    }

    const list = results();
    const shown = Math.min(limit, list.length);
    const vis = list.slice(0, shown);
    $("btCnt").textContent = `${shown} / ${list.length}`;

    let head;
    if (S.brand && S.brand !== "*") {
      const b = brandList().find((x) => x.name === S.brand);
      head = `<div class="bt-bhero">
        <div class="bt-mono">${esc(mono(S.brand))}</div>
        <div class="bt-bhero-t">
          <h2>${esc(S.brand)}</h2>
          <p>${b ? `${b.count} ${unit} · ${otherCount(S.brand)} ${k === "devices" ? "КАРТРИДЖЕЙ" : "УСТРОЙСТВ"} ЭТОГО БРЕНДА${b.min ? ` · ОТ ${b.min.toLocaleString("ru-RU")} ₽` : ""}` : `${list.length} ${unit}`}</p>
        </div>
        <button class="bt-back" type="button" data-home="1">← ВСЕ БРЕНДЫ</button>
      </div>`;
    } else if (S.brand === "*") {
      head = `<div class="bt-bhero">
        <div class="bt-mono">∑</div>
        <div class="bt-bhero-t"><h2>ВСЕ ${unit}</h2><p>${list.length} ПОЗИЦИЙ ВСЕХ ПРОИЗВОДИТЕЛЕЙ ОДНИМ СПИСКОМ</p></div>
        <button class="bt-back" type="button" data-home="1">← ВСЕ БРЕНДЫ</button>
      </div>`;
    } else {
      head = `<div class="bt-bhero">
        <div class="bt-mono">?</div>
        <div class="bt-bhero-t"><h2>ПОИСК</h2><p>«${esc(S.q)}» — ${list.length} СОВПАДЕНИЙ СРЕДИ ВСЕХ БРЕНДОВ</p></div>
        <button class="bt-back" type="button" data-home="1">← ВСЕ БРЕНДЫ</button>
      </div>`;
    }

    const stats = `<div class="bt-stats">
      <span>ПОДХОДИТ <b>${list.length}</b></span>
      <span>В БАЗЕ <b>${pool().length}</b></span>
      <span>БРЕНДОВ В ВЫДАЧЕ <b>${new Set(list.map((x) => x.brand)).size}</b></span>
      <span>С ФОТО <b>${list.filter((x) => x.image).length}</b></span>
    </div>`;

    if (!list.length) {
      body.innerHTML = head + stats + `<div class="bt-empty"><b>НИЧЕГО НЕ НАЙДЕНО</b><p>Измени запрос${S.hit ? " или сними отбор ХИТ" : ""} — либо вернись к выбору производителя</p><button class="bt-btn" type="button" data-home="1">К ПРОИЗВОДИТЕЛЯМ</button></div>`;
      $("btMore").hidden = true;
      paintHash();
      return;
    }

    body.innerHTML = head + stats + (S.view === "grid"
      ? `<div class="bt-grid">${vis.map((x) => cardHTML(x, k)).join("")}</div>`
      : `<div class="bt-list">${vis.map((x) => rowHTML(x, k)).join("")}</div>`);

    $("btMore").hidden = shown >= list.length;
    $("btMoreB").textContent = `ПОКАЗАТЬ ЕЩЁ ${Math.min(PAGE, list.length - shown)} · ОСТАЛОСЬ ${list.length - shown}`;
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
  function scrollToTop() {
    const tabs = parseFloat(getComputedStyle(root).getPropertyValue("--tabs")) || 0;
    const bar = parseFloat(getComputedStyle(root).getPropertyValue("--bar")) || 0;
    scrollTo({ top: Math.max(0, root.getBoundingClientRect().top + scrollY - tabs - bar - 12), behavior: "smooth" });
  }
  function goBrand(name) { S.brand = name; limit = PAGE; render(); paintHash(true); scrollToTop(); }
  function goHome() { S.brand = null; S.q = ""; S.hit = false; limit = PAGE; render(); paintHash(true); scrollTo({ top: 0, behavior: "smooth" }); }
  function refresh(resetLimit = true) { if (resetLimit) limit = PAGE; render(); }

  /* ================= СОБЫТИЯ ================= */
  let qT = 0;
  $("btQ").addEventListener("input", (e) => {
    clearTimeout(qT);
    const v = e.target.value;
    qT = setTimeout(() => { S.q = v; refresh(); }, 140);
  });
  $("btQC").addEventListener("click", () => { S.q = ""; refresh(); $("btQ").focus(); });
  $("btKind").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b || S.kind === b.dataset.k) return;
    S.kind = b.dataset.k;
    if (S.sort === "ohm" && S.kind !== "coils") S.sort = "az";
    S.hit = false;
    savePref(); refresh();
  });
  $("btView").addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    S.view = b.dataset.v; savePref(); refresh(false);
  });
  $("btSort").addEventListener("change", (e) => { S.sort = e.target.value; savePref(); refresh(); });
  $("btHit").addEventListener("click", () => { S.hit = !S.hit; refresh(); });
  $("btReset").addEventListener("click", () => { goHome(); toast("ПОКАЗАНЫ ВСЕ ПРОИЗВОДИТЕЛИ"); });
  $("btMoreB").addEventListener("click", () => { limit += PAGE; render(); });

  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-brand]");
    if (b) { goBrand(b.dataset.brand); return; }
    if (e.target.closest("[data-home]")) { goHome(); return; }
  });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault(); $("btQ").focus(); $("btQ").select(); return;
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
    root.style.setProperty("--tabs", (tabs ? Math.round(tabs.getBoundingClientRect().height) : 0) + "px");
    root.style.setProperty("--bar", Math.round($("btBar").getBoundingClientRect().height) + "px");
  }
  const ro = new ResizeObserver(measure);
  const tabsEl = document.querySelector(".tabs");
  if (tabsEl) ro.observe(tabsEl);
  ro.observe($("btBar"));
  window.addEventListener("resize", measure);

  const io = new IntersectionObserver((en) => {
    if (en.some((x) => x.isIntersecting) && !showcase() && limit < results().length) { limit += PAGE; render(); }
  }, { rootMargin: "320px" });
  io.observe($("btSentinel"));

  window.addEventListener("pagehide", () => { clearTimeout(dbT); clearTimeout(qT); ro.disconnect(); io.disconnect(); });

  /* ================= СТАРТ ================= */
  readHash();
  measure();
  render();
})();
