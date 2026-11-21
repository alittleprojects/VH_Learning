(() => {
  "use strict";

  const host = document.getElementById("catalog");
  if (!host || document.getElementById("btRoot")) return;

  const P = window.VHPerf;
  const PREF_KEY = "vh_brutal_pref_v1";
  const PAGE = 48;
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
  const pad = (n) => String(n).padStart(2, "0");
  const money = (n) => { const v = Number(n || 0); return v ? `${v.toLocaleString("ru-RU")} ₽` : "ЦЕНА НЕ УКАЗАНА"; };
  const resNum = (r) => { const m = String(r || "").match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 999; };
  const fmtRes = (r) => {
    const s = String(r || "").trim();
    if (!s || /Ω/.test(s)) return s;
    const m = s.match(/\d+(?:\.\d+)?/);
    if (!m) return s;
    const n = parseFloat(m[0]);
    return s.replace(m[0], Number.isInteger(n) ? n.toFixed(1) : String(parseFloat(n.toFixed(2)))) + "Ω";
  };
  const itemUrl = (k, id) => `item.html?type=${k === "devices" ? "device" : "coil"}&id=${encodeURIComponent(id)}`;
  const INIT = { vaporesso: "VP", voopoo: "VO", geekvape: "GV", rincoe: "RC", smoant: "SM", brusko: "BR", lostvape: "LV", plonq: "PL", smok: "SK", joyetech: "JT", elfbar: "EB" };
  function mono(b) {
    const k = norm(b).replace(/[^a-zа-я0-9]/g, "");
    if (INIT[k]) return INIT[k];
    const p = String(b || "").trim().split(/\s+/).filter(Boolean);
    return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : String(b || "?").trim().slice(0, 2).toUpperCase();
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

  const readDb = () => P ? P.db() : (() => { try { return JSON.parse(localStorage.getItem("vape_academy_catalog_v6")) || window.CATALOG_DATA; } catch { return window.CATALOG_DATA || { devices: [], coils: [] }; } })();
  let db = readDb();

  /* ---------- индекс: строки строятся один раз на ревизию базы ---------- */
  let IDX = { devices: [], coils: [] }, idxRev = -1;
  function buildIndex() {
    const rev = P ? P.rev : Math.random();
    if (rev === idxRev) return;
    idxRev = rev;
    db = readDb();
    const coilMap = new Map(db.coils.map((c) => [c.id, c]));
    const devOf = new Map();
    db.devices.forEach((d) => (d.coils || []).forEach((cid) => {
      if (!devOf.has(cid)) devOf.set(cid, []);
      devOf.get(cid).push(d);
    }));
    const make = (x, kind) => {
      const title = kind === "devices" ? String(x.model || "") : `${x.name || ""} ${fmtRes(x.resistance)}`.trim();
      const label = `${x.brand || ""} ${title}`.trim();
      const rel = kind === "devices" ? (x.coils || []).map((id) => coilMap.get(id)).filter(Boolean) : (devOf.get(x.id) || []);
      const relNames = [...new Set(rel.map((y) => kind === "devices" ? y.name : y.model))];
      const relText = rel.length
        ? `<b>${rel.length}</b> ${kind === "devices" ? "КАРТР." : "УСТР."} · ${esc(relNames.slice(0, 2).join(", "))}${relNames.length > 2 ? " +" + (relNames.length - 2) : ""}`
        : `<b>${kind === "devices" ? "СОВМЕСТИМОСТЬ НЕ ЗАПОЛНЕНА" : "НЕТ ПРИВЯЗАННЫХ УСТРОЙСТВ"}</b>`;
      const m = String(x.id || "").match(/-(\d{13})-/);
      return {
        id: x.id, kind, brand: x.brand || "БЕЗ БРЕНДА", title, label,
        key: norm(label), price: Number(x.price || 0), type: x.type || "",
        image: x.image || "", popular: !!x.popular, n: rel.length, rel: relText,
        res: resNum(x.resistance), fresh: m ? Number(m[1]) : 0,
        hay: norm([x.brand, title, x.type, x.resistance, x.price, x.description, rel.map((y) => `${y.brand} ${y.model || y.name} ${y.resistance || ""}`).join(" ")].join(" "))
      };
    };
    IDX.devices = db.devices.map((x) => make(x, "devices"));
    IDX.coils = db.coils.map((x) => make(x, "coils"));
    cardCache.clear(); rowCache.clear(); tileRev = -1;
  }

  /* ---------- состояние ---------- */
  const DEF = { brand: null, kind: "devices", q: "", sort: "az", view: "grid", hit: false };
  let S = { ...DEF }, limit = PAGE, tileRev = -1, lastQ = null;
  let prefs = { kind: "devices", sort: "az", view: "grid" };
  try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); ["kind", "sort", "view"].forEach((k) => { if (p[k] !== undefined) prefs[k] = p[k]; }); } catch {}
  Object.assign(S, prefs);
  const savePref = () => { prefs = { kind: S.kind, sort: S.sort, view: S.view }; try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} };
  const pool = () => IDX[S.kind];
  const showcase = () => !S.brand && !S.q.trim();

  /* ---------- каркас ---------- */
  [...host.children].forEach((n) => { n.hidden = true; n.dataset.btLegacy = "1"; });
  const root = document.createElement("div");
  root.id = "btRoot"; root.className = "bt-root";
  root.innerHTML = `
    <div class="bt-bar" id="btBar">
      <div class="bt-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>
        <input id="btQ" type="search" placeholder="ПОИСК ПО КАТАЛОГУ…" autocomplete="off" spellcheck="false">
        <button class="bt-clr" id="btQC" type="button" hidden>✕</button>
      </div>
      <div class="bt-pills" id="btKind"><button type="button" data-k="devices">УСТРОЙСТВА</button><button type="button" data-k="coils">КАРТРИДЖИ</button></div>
      <select class="bt-sel" id="btSort"></select>
      <div class="bt-pills bt-pills--ic" id="btView"><button type="button" data-v="grid">▦</button><button type="button" data-v="list">☰</button></div>
      <button class="bt-ib" id="btHit" type="button">ХИТ</button>
      <button class="bt-ib" id="btReset" type="button">СБРОС</button>
      <span class="bt-cnt" id="btCnt"></span>
    </div>
    <nav class="bt-crumbs" id="btCrumbs"></nav>
    <div id="btShow">
      <div class="bt-head"><h2>ВЫБЕРИ<br>БРЕНД</h2></div>
      <div class="bt-brands" id="btBrands"></div>
      <div class="bt-sechead" id="btSecHead"><h3 id="btSecTitle"></h3><span id="btSecCount"></span></div>
      <div class="bt-grid" id="btFeat"></div>
    </div>
    <div id="btListView" hidden>
      <div class="bt-bhero">
        <div class="bt-mono" id="btHeroMono"></div>
        <div class="bt-bhero-t"><h2 id="btHeroTitle"></h2><p id="btHeroSub"></p></div>
        <button class="bt-back" type="button" data-home="1">← ВСЕ БРЕНДЫ</button>
      </div>
      <div class="bt-stats" id="btStats">
        <span>ПОДХОДИТ <b id="btS1"></b></span><span>В БАЗЕ <b id="btS2"></b></span>
        <span>БРЕНДОВ В ВЫДАЧЕ <b id="btS3"></b></span><span>С ФОТО <b id="btS4"></b></span>
      </div>
      <div class="bt-grid" id="btGrid"></div>
      <div class="bt-list" id="btRows" hidden></div>
      <div class="bt-empty" id="btEmpty" hidden>
        <b>НИЧЕГО НЕ НАЙДЕНО</b><p id="btEmptyText"></p>
        <button class="bt-btn" type="button" data-home="1">К ПРОИЗВОДИТЕЛЯМ</button>
      </div>
    </div>
    <div class="bt-more" id="btMore" hidden><button class="bt-btn" id="btMoreB" type="button"></button></div>
    <div id="btSentinel" style="height:1px"></div>
    <div class="bt-status">
      <span>© V&amp;H · КАТАЛОГ ОБУЧЕНИЯ</span>
      <span class="bt-live"><i></i>БАЗА АКТИВНА</span>
      <span id="btStatTotal"></span><span id="btStatBuild"></span>
    </div>`;
  host.appendChild(root);

  /* ---------- фабрики узлов с переиспользованием ---------- */
  const cardCache = new Map(), rowCache = new Map(), tileCache = new Map();

  function makeCard(e) {
    const a = document.createElement("a");
    a.className = "bt-card"; a.href = itemUrl(e.kind, e.id);
    a.innerHTML = `${e.popular && e.kind === "devices" ? '<span class="bt-hit">ХИТ</span>' : ""}
      <div class="bt-photo${e.image ? " has" : ""}">${e.image ? "<img>" : ""}<b>${esc(e.title)}</b></div>
      <div class="bt-cbody">
        <div class="bt-cbrand"></div><div class="bt-ctitle"></div>
        <div class="bt-ctype">${esc(e.type)}</div>
        <div class="bt-cprice">${money(e.price)}</div>
        <div class="bt-clinks">${e.rel}</div>
        <div class="bt-cfoot"><span class="bt-step">${e.n} ${e.kind === "devices" ? "КАРТРИДЖЕЙ" : "УСТРОЙСТВ"}</span><span class="bt-start">ОТКРЫТЬ</span></div>
      </div>`;
    const im = a.querySelector("img");
    if (im) {
      im.alt = e.title;
      im.addEventListener("error", () => { im.parentNode.classList.remove("has"); im.remove(); }, { once: true });
      P ? P.img(im, imgUrl(e.image)) : (im.src = imgUrl(e.image));
    }
    a._b = a.querySelector(".bt-cbrand"); a._t = a.querySelector(".bt-ctitle"); a._q = null;
    return a;
  }
  function makeRow(e) {
    const a = document.createElement("a");
    a.className = "bt-row"; a.href = itemUrl(e.kind, e.id);
    a.innerHTML = `<div class="bt-thumb${e.image ? " has" : ""}">${e.image ? "<img>" : ""}<b>${esc(e.title)}</b></div>
      <div class="bt-rmain"><b></b><span class="bt-rsub">${esc(e.type)}${e.popular && e.kind === "devices" ? " · ХИТ" : ""}</span></div>
      <span class="bt-rlinks">${e.n} СВЯЗ.</span><span class="bt-rprice">${money(e.price)}</span><span class="bt-rgo">→</span>`;
    const im = a.querySelector("img");
    if (im) {
      im.alt = e.title;
      im.addEventListener("error", () => { im.parentNode.classList.remove("has"); im.remove(); }, { once: true });
      P ? P.img(im, imgUrl(e.image)) : (im.src = imgUrl(e.image));
    }
    a._t = a.querySelector(".bt-rmain b"); a._q = null;
    return a;
  }
  function getCard(e) { const k = e.kind + ":" + e.id; let n = cardCache.get(k); if (!n) { n = makeCard(e); cardCache.set(k, n); } return n; }
  function getRow(e) { const k = e.kind + ":" + e.id; let n = rowCache.get(k); if (!n) { n = makeRow(e); rowCache.set(k, n); } return n; }

  function highlight(node, e, q, isRow) {
    if (node._q === q) return;
    node._q = q;
    if (isRow) node._t.innerHTML = hi(e.label, q);
    else { node._b.innerHTML = hi(e.brand, q); node._t.innerHTML = hi(e.title, q); }
  }
  function reconcile(box, nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const cur = box.children[i];
      if (cur !== nodes[i]) box.insertBefore(nodes[i], cur || null);
    }
    while (box.children.length > nodes.length) box.removeChild(box.lastElementChild);
  }

  /* ---------- выборка ---------- */
  const CMP = {
    az: (a, b) => a.key.localeCompare(b.key, "ru"),
    za: (a, b) => b.key.localeCompare(a.key, "ru"),
    cheap: (a, b) => a.price - b.price || a.key.localeCompare(b.key, "ru"),
    rich: (a, b) => b.price - a.price || a.key.localeCompare(b.key, "ru"),
    hot: (a, b) => Number(b.popular) - Number(a.popular) || a.key.localeCompare(b.key, "ru"),
    fresh: (a, b) => b.fresh - a.fresh || a.key.localeCompare(b.key, "ru"),
    ohm: (a, b) => a.res - b.res || a.key.localeCompare(b.key, "ru"),
    links: (a, b) => b.n - a.n || a.key.localeCompare(b.key, "ru")
  };
  function results() {
    const tk = norm(S.q).split(/\s+/).filter(Boolean);
    let list = pool();
    if (S.brand && S.brand !== "*") list = list.filter((x) => x.brand === S.brand);
    if (S.hit && S.kind === "devices") list = list.filter((x) => x.popular);
    if (tk.length) list = list.filter((x) => tk.every((t) => x.hay.includes(t)));
    return list.slice().sort(CMP[S.sort] || CMP.az);
  }
  function brandStats() {
    const map = new Map();
    pool().forEach((x) => {
      let r = map.get(x.brand);
      if (!r) map.set(x.brand, r = { name: x.brand, count: 0, min: 0, hits: 0, other: 0 });
      r.count++;
      if (x.price && (!r.min || x.price < r.min)) r.min = x.price;
      if (x.popular) r.hits++;
    });
    const other = S.kind === "devices" ? IDX.coils : IDX.devices;
    other.forEach((x) => { const r = map.get(x.brand); if (r) r.other++; });
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }

  /* ---------- отрисовка ---------- */
  function render() {
    buildIndex();
    const k = S.kind, unit = k === "devices" ? "УСТРОЙСТВ" : "КАРТРИДЖЕЙ";
    if ($("btQ").value !== S.q) $("btQ").value = S.q;
    $("btQC").hidden = !S.q;
    [...$("btKind").children].forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    [...$("btView").children].forEach((b) => b.classList.toggle("on", b.dataset.v === S.view));
    $("btHit").classList.toggle("on", S.hit);
    $("btHit").hidden = k !== "devices";

    const sorts = [["az", "А → Я"], ["za", "Я → А"], ["cheap", "ЦЕНА ↑"], ["rich", "ЦЕНА ↓"], ["hot", "СНАЧАЛА ХИТ"], ["fresh", "СНАЧАЛА НОВЫЕ"], ["links", "БОЛЬШЕ СВЯЗЕЙ"]];
    if (k === "coils") sorts.splice(4, 0, ["ohm", "СОПРОТИВЛЕНИЕ ↑"]);
    if (!sorts.some(([v]) => v === S.sort)) S.sort = "az";
    const sel = $("btSort");
    if (sel.dataset.k !== k) { sel.dataset.k = k; sel.innerHTML = sorts.map(([v, t]) => `<option value="${v}">${t}</option>`).join(""); }
    sel.value = S.sort;

    const crumbs = [`<button type="button" data-home="1">ПРОИЗВОДИТЕЛИ</button>`];
    if (S.brand === "*") crumbs.push(`<i>/</i><b>ВСЕ ${unit}</b>`);
    else if (S.brand) crumbs.push(`<i>/</i><b>${esc(S.brand)}</b>`);
    else if (S.q.trim()) crumbs.push(`<i>/</i><b>ПОИСК</b>`);
    $("btCrumbs").innerHTML = crumbs.join("");

    $("btStatTotal").textContent = `ПОЗИЦИЙ: ${IDX.devices.length + IDX.coils.length}`;
    const upd = db.meta?.updatedAt ? new Date(db.meta.updatedAt) : null;
    $("btStatBuild").textContent = upd && !isNaN(upd) ? `ОБНОВЛЕНО ${upd.toLocaleDateString("ru-RU")}` : "БАЗА ЛОКАЛЬНАЯ";

    const isShow = showcase();
    $("btShow").hidden = !isShow;
    $("btListView").hidden = isShow;

    if (isShow) {
      const brands = brandStats(), total = pool().length;
      $("btCnt").textContent = `${brands.length} ПРОИЗВОДИТЕЛЕЙ`;
      $("btMore").hidden = true;

      const key = k + ":" + idxRev;
      if (tileRev !== key) {
        tileRev = key;
        const nodes = brands.map((b, i) => {
          const ck = k + ":" + b.name;
          let n = tileCache.get(ck);
          if (!n) {
            n = document.createElement("button");
            n.type = "button"; n.className = "bt-tile"; n.dataset.brand = b.name;
            n.innerHTML = `<div><div class="bt-mono">${esc(mono(b.name))}</div><div class="bt-tname">${esc(b.name)}</div></div>
              <div><div class="bt-tnum"><b></b><span>${unit}<br>В БАЗЕ</span></div><div class="bt-tmeta"></div></div>`;
            n._n = n.querySelector(".bt-tnum b"); n._m = n.querySelector(".bt-tmeta");
            tileCache.set(ck, n);
          }
          n.style.animationDelay = Math.min(i * 40, 340) + "ms";
          n._n.textContent = pad(b.count);
          n._m.innerHTML = `${b.min ? `<span class="bt-tag">ОТ ${b.min.toLocaleString("ru-RU")} ₽</span>` : ""}${b.hits ? `<span class="bt-tag">${b.hits} ХИТ</span>` : ""}<span class="bt-tag">${b.other} ${k === "devices" ? "КАРТР." : "УСТР."}</span>`;
          return n;
        });
        let all = tileCache.get(k + ":*");
        if (!all) {
          all = document.createElement("button");
          all.type = "button"; all.className = "bt-tile inv"; all.dataset.brand = "*";
          all.innerHTML = `<div class="bt-alltxt">ВСЕ<br>${unit}</div><div><div class="bt-tnum"><b></b><span>ПОЗИЦИЙ<br>ВСЕГО</span></div><div class="bt-tmeta"></div></div>`;
          all._n = all.querySelector(".bt-tnum b"); all._m = all.querySelector(".bt-tmeta");
          tileCache.set(k + ":*", all);
        }
        all._n.textContent = pad(total);
        all._m.innerHTML = `<span class="bt-tag">${brands.length} БРЕНДОВ</span>`;
        all.style.animationDelay = Math.min(brands.length * 40, 360) + "ms";
        nodes.push(all);
        reconcile($("btBrands"), nodes);
      }

      const feat = (k === "devices" ? IDX.devices.filter((x) => x.popular) : IDX.coils).slice(0, 3);
      const f = feat.length ? feat : pool().slice(0, 3);
      $("btSecHead").hidden = !f.length;
      $("btSecTitle").textContent = k === "devices" ? "ХИТЫ ПРОДАЖ" : "ПОПУЛЯРНЫЕ КАРТРИДЖИ";
      $("btSecCount").textContent = `${f.length} ПОЗИЦИИ`;
      const fn = f.map((e) => { const n = getCard(e); highlight(n, e, "", false); return n; });
      reconcile($("btFeat"), fn);
      lastQ = "";
      return;
    }

    const list = results(), shown = Math.min(limit, list.length), vis = list.slice(0, shown);
    $("btCnt").textContent = `${shown} / ${list.length}`;

    if (S.brand && S.brand !== "*") {
      const b = brandStats().find((x) => x.name === S.brand);
      $("btHeroMono").textContent = mono(S.brand);
      $("btHeroTitle").textContent = S.brand;
      $("btHeroSub").textContent = b ? `${b.count} ${unit} · ${b.other} ${k === "devices" ? "КАРТРИДЖЕЙ" : "УСТРОЙСТВ"} ЭТОГО БРЕНДА${b.min ? ` · ОТ ${b.min.toLocaleString("ru-RU")} ₽` : ""}` : `${list.length} ${unit}`;
    } else if (S.brand === "*") {
      $("btHeroMono").textContent = "∑";
      $("btHeroTitle").textContent = `ВСЕ ${unit}`;
      $("btHeroSub").textContent = `${list.length} ПОЗИЦИЙ ВСЕХ ПРОИЗВОДИТЕЛЕЙ ОДНИМ СПИСКОМ`;
    } else {
      $("btHeroMono").textContent = "?";
      $("btHeroTitle").textContent = "ПОИСК";
      $("btHeroSub").textContent = `«${S.q}» — ${list.length} СОВПАДЕНИЙ СРЕДИ ВСЕХ БРЕНДОВ`;
    }

    $("btS1").textContent = list.length;
    $("btS2").textContent = pool().length;
    $("btS3").textContent = new Set(list.map((x) => x.brand)).size;
    $("btS4").textContent = list.filter((x) => x.image).length;

    const empty = !list.length;
    $("btEmpty").hidden = !empty;
    $("btStats").hidden = empty;
    if (empty) $("btEmptyText").textContent = `Измени запрос${S.hit ? " или сними отбор ХИТ" : ""} — либо вернись к выбору производителя`;

    const grid = S.view === "grid";
    $("btGrid").hidden = empty || !grid;
    $("btRows").hidden = empty || grid;
    if (!empty) {
      const q = S.q;
      const nodes = vis.map((e) => { const n = grid ? getCard(e) : getRow(e); highlight(n, e, q, !grid); return n; });
      reconcile(grid ? $("btGrid") : $("btRows"), nodes);
      if (grid) $("btRows").textContent = "";
      else $("btGrid").textContent = "";
    }
    lastQ = S.q;

    $("btMore").hidden = shown >= list.length;
    if (shown < list.length) $("btMoreB").textContent = `ПОКАЗАТЬ ЕЩЁ ${Math.min(PAGE, list.length - shown)} · ОСТАЛОСЬ ${list.length - shown}`;
  }

  /* ---------- история ---------- */
  const SORTS = ["az", "za", "cheap", "rich", "hot", "fresh", "links", "ohm"];
  const depth = () => { const s = history.state; return s && typeof s.btDepth === "number" ? s.btDepth : 0; };
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
  const currentHash = () => { const r = location.hash.replace(/^#/, ""); return /^(device|coil)=/.test(r) ? null : r; };
  function writeHash(push, forced) {
    const s = hashString();
    const url = s ? "#" + s : location.pathname + location.search;
    const d = typeof forced === "number" ? forced : (push ? depth() + 1 : depth());
    try { const st = Object.assign({}, history.state, { btDepth: d }); push ? history.pushState(st, "", url) : history.replaceState(st, "", url); } catch {}
  }
  const syncHash = (push) => { if ((currentHash() || "") !== hashString()) writeHash(push); };
  function applyHash() {
    const raw = currentHash(), p = new URLSearchParams(raw || "");
    S.brand = p.get("b") || null;
    S.kind = p.get("k") === "coils" ? "coils" : "devices";
    S.q = p.get("q") || "";
    const o = p.get("o");
    S.sort = SORTS.includes(o) ? o : "az";
    if (S.sort === "ohm" && S.kind !== "coils") S.sort = "az";
    S.view = p.get("v") === "list" ? "list" : "grid";
    S.hit = p.get("h") === "1" && S.kind === "devices";
    if (!raw) { S.kind = prefs.kind; S.sort = prefs.sort; S.view = prefs.view; }
    limit = PAGE;
  }

  function scrollTop() {
    const t = parseFloat(getComputedStyle(root).getPropertyValue("--tabs")) || 0;
    const b = parseFloat(getComputedStyle(root).getPropertyValue("--bar")) || 0;
    scrollTo({ top: Math.max(0, root.getBoundingClientRect().top + scrollY - t - b - 12), behavior: "smooth" });
  }
  function goBrand(name) {
    if (S.brand === name) return scrollTop();
    S.brand = name; limit = PAGE; render(); syncHash(true); scrollTop();
  }
  function backToBrands() {
    scrollTo({ top: 0, behavior: "smooth" });
    if (depth() > 0) {
      let popped = false;
      window.addEventListener("popstate", () => { popped = true; }, { once: true });
      try { history.back(); } catch {}
      setTimeout(() => { if (popped) return; S.brand = null; S.q = ""; S.hit = false; limit = PAGE; render(); writeHash(false, 0); measure(); }, 320);
      return;
    }
    S.brand = null; S.q = ""; S.hit = false; limit = PAGE; render(); writeHash(false, 0); measure();
  }
  function update(reset = true) { if (reset) limit = PAGE; render(); syncHash(false); }

  /* ---------- тост ---------- */
  let tT = 0;
  function toast(text) {
    let n = $("btToast");
    if (!n) {
      n = document.createElement("div"); n.id = "btToast";
      n.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translate(-50%,20px);opacity:0;pointer-events:none;z-index:9999;padding:14px 20px;border:2px solid #fff;background:#000;color:#fff;font:900 11.5px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;transition:.22s;max-width:min(92vw,460px)";
      document.body.appendChild(n);
    }
    const light = document.documentElement.getAttribute("data-theme") === "light";
    n.style.background = light ? "#000" : "#fff"; n.style.color = light ? "#fff" : "#000"; n.style.borderColor = light ? "#000" : "#fff";
    n.textContent = text; n.style.opacity = "1"; n.style.transform = "translate(-50%,0)";
    clearTimeout(tT); tT = setTimeout(() => { n.style.opacity = "0"; n.style.transform = "translate(-50%,20px)"; }, 2200);
  }

  /* ---------- события ---------- */
  let qT = 0;
  $("btQ").addEventListener("input", (e) => {
    const v = e.target.value;
    clearTimeout(qT);
    qT = setTimeout(() => { S.q = v; P ? P.frame(() => update()) : update(); }, 110);
  });
  $("btQC").addEventListener("click", () => { S.q = ""; update(); $("btQ").focus(); });
  $("btKind").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b || S.kind === b.dataset.k) return;
    S.kind = b.dataset.k;
    if (S.sort === "ohm" && S.kind !== "coils") S.sort = "az";
    S.hit = false; savePref(); update();
  });
  $("btView").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; S.view = b.dataset.v; savePref(); update(false); });
  $("btSort").addEventListener("change", (e) => { S.sort = e.target.value; savePref(); update(); });
  $("btHit").addEventListener("click", () => { S.hit = !S.hit; update(); });
  $("btReset").addEventListener("click", () => { backToBrands(); toast("ПОКАЗАНЫ ВСЕ ПРОИЗВОДИТЕЛИ"); });
  $("btMoreB").addEventListener("click", () => { limit += PAGE; render(); });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-brand]");
    if (b) return goBrand(b.dataset.brand);
    if (e.target.closest("[data-home]")) backToBrands();
  });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); $("btQ").focus(); $("btQ").select(); return; }
    if (e.key === "Escape") { if (S.q) { S.q = ""; update(); return; } if (S.brand) backToBrands(); }
  });
  window.addEventListener("popstate", () => { applyHash(); render(); measure(); });

  /* ---------- живая база ---------- */
  function onDb() {
    idxRev = -1;
    buildIndex();
    if (S.brand && S.brand !== "*" && !pool().some((x) => x.brand === S.brand)) { S.brand = null; render(); writeHash(false, 0); return; }
    render();
  }
  window.addEventListener("vh:db", onDb);
  if (!P) window.addEventListener("storage", (e) => { if (e.key === "vape_academy_catalog_v6") onDb(); });
  document.querySelectorAll('.tab[data-tab="catalog"]').forEach((b) => b.addEventListener("click", () => setTimeout(() => { idxRev = -1; render(); measure(); }, 0)));

  /* ---------- липкие отступы ---------- */
   function measure() {
    const t = document.querySelector(".tabs");
    root.style.setProperty("--tabs", (t ? Math.round(t.getBoundingClientRect().height) : 0) + "px");
    root.style.setProperty("--bar", Math.round($("btBar").getBoundingClientRect().height) + "px");
  }
  const ro = new ResizeObserver(() => P ? P.frame(measure) : measure());
  const io = new IntersectionObserver((en) => {
    if (en.some((x) => x.isIntersecting) && !showcase() && limit < results().length) { limit += PAGE; render(); }
  }, { rootMargin: "300px" });
  function attach() {
    const t = document.querySelector(".tabs");
    ro.disconnect(); if (t) ro.observe(t); ro.observe($("btBar"));
    io.disconnect(); io.observe($("btSentinel"));
    measure();
  }
  window.addEventListener("pageshow", (e) => { attach(); if (e.persisted) { idxRev = -1; applyHash(); render(); measure(); } });
  window.addEventListener("pagehide", () => { clearTimeout(qT); ro.disconnect(); io.disconnect(); });

  /* ---------- старт ---------- */
  try { history.replaceState(Object.assign({}, history.state, { btDepth: depth() }), "", location.href); } catch {}
  buildIndex();
  applyHash();
  render();
  attach();
  window.dispatchEvent(new Event("vh:catalog-ready"));
  P && P.finish();
})();
