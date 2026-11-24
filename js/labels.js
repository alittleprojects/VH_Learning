(() => {
  "use strict";

  if (window.VHLabels) return;

  const DB_KEY = "vape_academy_catalog_v6";
  const $ = (id) => document.getElementById(id);
  const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

  /* ================= СЛОВАРЬ ================= */
  const WORDS = {
    cartridge: ["картридж", "картриджа", "картриджу", "картриджем", "картридже", "картриджи", "картриджей", "картриджам", "картриджами", "картриджах"],
    coil: ["испаритель", "испарителя", "испарителю", "испарителем", "испарителе", "испарители", "испарителей", "испарителям", "испарителями", "испарителях"],
    mixed: ["расходник", "расходника", "расходнику", "расходником", "расходнике", "расходники", "расходников", "расходникам", "расходниками", "расходниках"]
  };
  const ABBR = { cartridge: "КАРТР.", coil: "ИСПАР.", mixed: "РАСХОД." };

  const IDX_CART = { "ами": 8, "ах": 9, "ам": 7, "ей": 6, "ом": 3, "а": 1, "у": 2, "е": 4, "и": 5 };
  const IDX_COIL = { "ями": 8, "ях": 9, "ям": 7, "ей": 6, "ем": 3, "я": 1, "ю": 2, "е": 4, "и": 5, "ь": 0 };
  const IDX_MIX = { "ами": 8, "ах": 9, "ам": 7, "ов": 6, "ом": 3, "а": 1, "у": 2, "е": 4, "и": 5 };

  /* границы слова вручную: \b в JS не работает с кириллицей */
  const NOT_LETTER = "(^|[^а-яёa-z0-9])";
  const NO_TAIL = "(?![а-яёa-z0-9])";
  const RE_CART = new RegExp(NOT_LETTER + "картридж(ами|ах|ам|ей|ом|а|у|е|и)?" + NO_TAIL, "gi");
  const RE_COIL = new RegExp(NOT_LETTER + "испарител(ями|ях|ям|ей|ем|я|ю|е|и|ь)?" + NO_TAIL, "gi");
  const RE_MIX = new RegExp(NOT_LETTER + "расходник(ами|ах|ам|ов|ом|а|у|е|и)?" + NO_TAIL, "gi");
  const RE_ABBR = new RegExp(NOT_LETTER + "(КАРТР\\.|ИСПАР\\.|РАСХОД\\.)", "gi");

  function plural(n, kind) {
    const k = WORDS[kind] ? kind : "mixed";
    const a = Math.abs(Number(n) || 0) % 100, b = a % 10;
    if (a > 10 && a < 20) return WORDS[k][6];
    if (b === 1) return WORDS[k][0];
    if (b > 1 && b < 5) return WORDS[k][1];
    return WORDS[k][6];
  }

  function keepCase(src, out) {
    if (src === src.toUpperCase() && /[а-яёa-z]/i.test(src)) return out.toUpperCase();
    if (src.charAt(0) === src.charAt(0).toUpperCase()) return out.charAt(0).toUpperCase() + out.slice(1);
    return out;
  }

  function swap(text, re, map, target) {
    return text.replace(re, (m, pre, end) => {
      const word = m.slice(pre.length);
      const idx = map[(end || "").toLowerCase()];
      return pre + keepCase(word, target[idx === undefined ? 0 : idx]);
    });
  }

  function convert(text, kind) {
    if (!text || !WORDS[kind]) return text;
    let s = String(text);
    const target = WORDS[kind];

    s = s.replace(RE_ABBR, (m, pre, ab) => pre + keepCase(ab, ABBR[kind]));
    if (kind !== "cartridge") s = swap(swap(s, RE_CART, IDX_CART, target), RE_CART, IDX_CART, target);
    if (kind !== "coil") s = swap(swap(s, RE_COIL, IDX_COIL, target), RE_COIL, IDX_COIL, target);
    if (kind !== "mixed") s = swap(swap(s, RE_MIX, IDX_MIX, target), RE_MIX, IDX_MIX, target);
    return s;
  }

  /* ================= БАЗА ================= */
  function read() {
    try { const r = localStorage.getItem(DB_KEY); if (r) return JSON.parse(r); } catch {}
    try { return JSON.parse(JSON.stringify(window.CATALOG_DATA || null)); } catch { return null; }
  }

  let db = read() || { devices: [], coils: [] };
  let rev = 0;
  let devices = [], coils = [], byId = new Map(), textCache = new Map();

  /* название серии — самый надёжный признак */
  const COIL_NAME = /(^|[^а-яёa-z])(gtx|pnp|tpp|rpm|nrg|gt ?\d|b ?series|z ?coil|mesh|coil|испарител|atomizer|head|sub ?ohm|ceramic|кантал|mesh coil)/;
  const CART_NAME = /(cartridge|картридж|xros series|luxe q|caliburn|novo|pod\b|мanto|manto|jellybox|pasito|ursa|orion|eco nano|veco)/;
  const MOD_TYPE = /pod[ -]?mod|box|мод|kit|набор|aio|батарейн/;

  function coilKind(c) {
    if (c.consumableSrc === "user" && (c.consumable === "coil" || c.consumable === "cartridge")) return c.consumable;
    const n = norm(c.name);
    const t = norm(c.type);
    if (COIL_NAME.test(n) && !CART_NAME.test(n)) return "coil";
    if (CART_NAME.test(n) && !COIL_NAME.test(n)) return "cartridge";
    if (/испар|coil/.test(t)) return "coil";
    if (/картр|cartridge/.test(t)) return "cartridge";
    if (COIL_NAME.test(n)) return "coil";
    return "cartridge";
  }

  function deviceKind(d) {
    if (d.consumableSrc === "user" && (d.consumable === "coil" || d.consumable === "cartridge")) return d.consumable;
    const rel = (d.coils || []).map((id) => byId.get(id)).filter(Boolean);
    if (rel.length) {
      let c = 0, k = 0;
      rel.forEach((r) => { coilKind(r) === "coil" ? k++ : c++; });
      if (k !== c) return k > c ? "coil" : "cartridge";
    }
    if (MOD_TYPE.test(norm(d.type))) return "coil";
    if (rel.length) return coilKind(rel[0]);
    return "cartridge";
  }

  function rebuild() {
    db = read() || { devices: [], coils: [] };
    db.devices = Array.isArray(db.devices) ? db.devices : [];
    db.coils = Array.isArray(db.coils) ? db.coils : [];
    byId = new Map(db.coils.map((c) => [c.id, c]));
    coils = db.coils.map((c) => ({
      id: c.id, kind: coilKind(c),
      keys: [norm(`${c.brand} ${c.name} ${c.resistance || ""}`), norm(`${c.name} ${c.resistance || ""}`), norm(c.name)].filter(Boolean)
    }));
    devices = db.devices.map((d) => ({
      id: d.id, brand: d.brand || "", model: d.model || "", kind: deviceKind(d),
      keys: [norm(`${d.brand} ${d.model}`), norm(d.model)].filter(Boolean)
    }));
    rev++;
    textCache.clear();
    document.querySelectorAll("[data-vh-kind]").forEach((n) => { n.removeAttribute("data-vh-kind"); n.removeAttribute("data-vh-rev"); });
  }

  function normalizeBase() {
    const src = read();
    if (!src || !Array.isArray(src.devices)) return;
    db = src;
    db.coils = Array.isArray(db.coils) ? db.coils : [];
    byId = new Map(db.coils.map((c) => [c.id, c]));
    let changed = false;
    db.coils.forEach((c) => {
      if (c.consumableSrc === "user") return;
      const k = coilKind(c);
      if (c.consumable !== k || c.consumableSrc !== "auto") { c.consumable = k; c.consumableSrc = "auto"; changed = true; }
    });
    db.devices.forEach((d) => {
      if (d.consumableSrc === "user") return;
      const k = deviceKind(d);
      if (d.consumable !== k || d.consumableSrc !== "auto") { d.consumable = k; d.consumableSrc = "auto"; changed = true; }
    });
    if (changed) { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch {} }
  }

  /* ================= КОНТЕКСТ ================= */
  const itemCtx = (() => {
    if (!/item\.html/i.test(location.pathname) && !$("itemRoot")) return null;
    const p = new URLSearchParams(location.search);
    const id = p.get("id"), type = p.get("type");
    if (!id) return null;
    if (type === "coil") { const c = byId.get(id); return c ? coilKind(c) : null; }
    const d = db.devices.find((x) => x.id === id);
    return d ? deviceKind(d) : null;
  })();

  function brandKind(name) {
    const list = devices.filter((d) => norm(d.brand) === norm(name));
    if (!list.length) return "mixed";
    const set = new Set(list.map((d) => d.kind));
    return set.size === 1 ? [...set][0] : "mixed";
  }
  function poolKind() {
    const set = new Set(coils.map((c) => c.kind));
    return set.size === 1 ? [...set][0] : "mixed";
  }

  function matchText(txt) {
    const t = norm(txt);
    if (!t) return null;
    if (textCache.has(t)) return textCache.get(t);
    let best = null, len = 0;
    for (const d of devices) for (const k of d.keys) if (k.length > 2 && t.includes(k) && k.length > len) { best = d.kind; len = k.length; }
    if (!best) for (const c of coils) for (const k of c.keys) if (k.length > 3 && t.includes(k) && k.length > len) { best = c.kind; len = k.length; }
    if (textCache.size > 900) textCache.clear();
    textCache.set(t, best);
    return best;
  }

  const BOX = ".bt-card,.bt-row,.bt-tile,.bt-bhero,.mini-card,.card,.question,.explain,.mistake,.spec,.checks label,.info-panel,.stage,.compat,.cl-panel,.panel";

  function kindFor(el) {
    if (itemCtx) return itemCtx;
    if (!el) return "mixed";
    if (el.closest && el.closest("#btKind")) return "mixed";
    if (el.closest && el.closest("#btSecHead,#btStats,#btCnt,.bt-status,#btCrumbs")) return poolKind();

    const box = el.closest ? el.closest(BOX) : null;
    if (box) {
      if (box.dataset.vhKind && box.dataset.vhRev === String(rev)) return box.dataset.vhKind;
      let k = null;
      const tname = box.querySelector(".bt-tname");
      if (tname) k = brandKind(tname.textContent);
      if (!k && box.classList.contains("bt-bhero")) {
        const h = box.querySelector("#btHeroTitle");
        const name = h ? h.textContent : "";
        k = /все|поиск/i.test(name) ? "mixed" : brandKind(name);
      }
      if (!k) {
        const b = box.querySelector(".bt-cbrand,.brand,.mini-brand");
        const t = box.querySelector(".bt-ctitle,.title,.mini-title,.bt-rmain b");
        k = matchText(`${b ? b.textContent : ""} ${t ? t.textContent : ""}`) || matchText(box.textContent);
      }
      if (!k) k = "mixed";
      box.dataset.vhKind = k;
      box.dataset.vhRev = String(rev);
      return k;
    }
    const holder = (el.closest && el.closest("#btBody,#catalog,#training,#admin,main")) || el.parentElement;
    return matchText(holder && holder.textContent ? holder.textContent.slice(0, 400) : "") || "mixed";
  }

  /* ================= КОРРЕКТОР ================= */
  const SKIP = /^(INPUT|TEXTAREA|SELECT|OPTION|SCRIPT|STYLE|NOSCRIPT|CODE)$/;
  let busy = false, queued = new Set(), rafId = 0;

  function fixNode(node) {
    const p = node.parentElement;
    if (!p || SKIP.test(p.tagName) || p.isContentEditable) return;
    const raw = node.nodeValue;
    if (!raw || raw.length < 4 || !/картр|испар|расход/i.test(raw)) return;
    const out = convert(raw, kindFor(p));
    if (out !== raw) node.nodeValue = out;
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return fixNode(root);
    if (root.nodeType !== 1 || SKIP.test(root.tagName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || SKIP.test(p.tagName) || p.isContentEditable) return NodeFilter.FILTER_REJECT;
        return /картр|испар|расход/i.test(n.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    let n;
    while ((n = w.nextNode())) fixNode(n);
  }

  function flush() {
    rafId = 0;
    const items = [...queued];
    queued.clear();
    busy = true;
    for (const n of items) if (n.isConnected) walk(n);
    busy = false;
  }
  function schedule(n) { queued.add(n); if (!rafId) rafId = requestAnimationFrame(flush); }
  function passAll() {
    document.querySelectorAll("[data-vh-kind]").forEach((n) => { n.removeAttribute("data-vh-kind"); n.removeAttribute("data-vh-rev"); });
    walk(document.body);
  }

  const mo = new MutationObserver((muts) => {
    if (busy) return;
    for (const m of muts) {
      if (m.type === "characterData") { schedule(m.target); continue; }
      m.addedNodes && m.addedNodes.forEach((n) => schedule(n));
    }
  });

  /* ================= ПОЛЕ В АДМИНКЕ ================= */
  let picked = null, touched = false;

  function styles() {
    if ($("vhLabelsStyles")) return;
    const st = document.createElement("style");
    st.id = "vhLabelsStyles";
    st.textContent = `
      .lb-field{margin:0 0 16px;padding:14px;border:1px solid var(--border,#2b3037);
        border-radius:var(--radius,14px);background:var(--card2,#191c21)}
      .lb-top{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;justify-content:space-between;margin-bottom:10px}
      .lb-l{font:900 10px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.14em;
        text-transform:uppercase;color:var(--muted,#8b929b)}
      .lb-hint{font-size:11px;line-height:1.5;color:var(--muted2,#6a717a)}
      .lb-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .lb-seg button{padding:12px 14px;border:2px solid var(--border-strong,#454c55);border-radius:var(--radius-sm,10px);
        background:var(--card,#121418);color:var(--muted,#8b929b);cursor:pointer;text-align:left;
        font:800 13px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;transition:.16s}
      .lb-seg button:hover{border-color:var(--accent,#fff);color:var(--text,#f4f6f8)}
      .lb-seg button b{display:block;font-size:13px;font-weight:900}
      .lb-seg button span{display:block;margin-top:4px;font-size:10.5px;font-weight:700;opacity:.75}
      .lb-seg button[aria-pressed="true"]{background:var(--accent,#fff);color:var(--ink,#08090b);border-color:var(--accent,#fff)}
      .lb-foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px}
      .lb-auto{padding:7px 12px;border:1px solid var(--border-strong,#454c55);border-radius:999px;
        background:transparent;color:var(--muted,#8b929b);font:800 11px/1 system-ui,sans-serif;
        letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:.16s}
      .lb-auto:hover{border-color:var(--accent,#fff);color:var(--text,#f4f6f8)}
      .lb-count{font-size:11px;font-weight:700;color:var(--muted2,#6a717a)}
      @media (max-width:560px){.lb-seg{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function paintSeg() {
    const seg = $("lbSeg");
    if (!seg) return;
    [...seg.children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === picked)));
    const c = $("lbCount");
    if (c) {
      const n = ($("coilChecks") ? $("coilChecks").querySelectorAll("input:checked") : []).length;
      c.textContent = picked ? `В тексте будет: «${n} ${plural(n, picked)}»` : "Выбери, что устанавливается в устройство";
    }
  }

  function currentDevice() {
    const id = $("deviceSelect") ? $("deviceSelect").value : "";
    if (id) { const d = db.devices.find((x) => x.id === id); if (d) return d; }
    const brand = ($("dBrand") ? $("dBrand").value : "").trim();
    const model = ($("dModel") ? $("dModel").value : "").trim();
    if (brand && model) return db.devices.find((x) => norm(x.brand) === norm(brand) && norm(x.model) === norm(model)) || null;
    return null;
  }

  function syncFromDevice() {
    db = read() || db;
    byId = new Map((db.coils || []).map((c) => [c.id, c]));
    const d = currentDevice();
    if (d) { picked = deviceKind(d); touched = d.consumableSrc === "user"; }
    else if (!touched) { picked = MOD_TYPE.test(norm($("dType") ? $("dType").value : "")) ? "coil" : "cartridge"; }
    paintSeg();
  }

  function applyToDevice(force) {
    const d = currentDevice();
    if (!d || !picked) return;
    const fresh = read();
    if (!fresh || !Array.isArray(fresh.devices)) return;
    const target = fresh.devices.find((x) => x.id === d.id);
    if (!target) return;
    if (target.consumable === picked && target.consumableSrc === "user" && !force) return;
    target.consumable = picked;
    target.consumableSrc = "user";
    try { localStorage.setItem(DB_KEY, JSON.stringify(fresh)); } catch {}
    rebuild();
    passAll();
  }

  function buildField() {
    const form = $("deviceForm");
    if (!form || $("lbField")) return;

    const box = document.createElement("div");
    box.id = "lbField";
    box.className = "lb-field";
    box.innerHTML = `
      <div class="lb-top">
        <span class="lb-l">Что использует устройство</span>
        <span class="lb-hint">Влияет на слово в каталоге, карточке и тренажёре</span>
      </div>
      <div class="lb-seg" id="lbSeg">
        <button type="button" data-kind="cartridge" aria-pressed="false"><b>Картридж</b><span>Сменный бак целиком · XROS, Luxe Q, Novo</span></button>
        <button type="button" data-kind="coil" aria-pressed="false"><b>Испаритель</b><span>Сменная голова в баке · GTX, PnP, B Series</span></button>
      </div>
      <div class="lb-foot">
        <button class="lb-auto" id="lbAuto" type="button">Определить автоматически</button>
        <span class="lb-count" id="lbCount"></span>
      </div>`;

    const checks = $("coilChecks");
    const anchor = checks ? (checks.closest("label") || checks.parentElement) : form.querySelector(".form-actions");
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(box, anchor);
    else form.appendChild(box);

    $("lbSeg").addEventListener("click", (e) => {
      const b = e.target.closest("[data-kind]");
      if (!b) return;
      picked = b.dataset.kind; touched = true;
      paintSeg(); applyToDevice(true);
    });

    $("lbAuto").addEventListener("click", () => {
      const d = currentDevice();
      if (d) { const clone = Object.assign({}, d); clone.consumableSrc = "auto"; picked = deviceKind(clone); }
      else picked = MOD_TYPE.test(norm($("dType") ? $("dType").value : "")) ? "coil" : "cartridge";
      touched = true; paintSeg(); applyToDevice(true);
    });

    if (checks) checks.addEventListener("change", () => { if (!touched) syncFromDevice(); else paintSeg(); });
    if ($("dType")) $("dType").addEventListener("change", () => { if (!touched) syncFromDevice(); });
    if ($("deviceSelect")) $("deviceSelect").addEventListener("change", () => { touched = false; setTimeout(syncFromDevice, 0); });
    form.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b && /новое|новый|создать|очистить/i.test(b.textContent || "")) { touched = false; setTimeout(syncFromDevice, 30); }
    });

    let snap = null;
    form.addEventListener("submit", () => {
      snap = { brand: ($("dBrand") ? $("dBrand").value : "").trim(), model: ($("dModel") ? $("dModel").value : "").trim(), kind: picked };
    }, true);
    form.addEventListener("submit", () => {
      setTimeout(() => {
        if (!snap || !snap.kind) return;
        const fresh = read();
        if (!fresh || !Array.isArray(fresh.devices)) return;
        const d = fresh.devices.find((x) => norm(x.brand) === norm(snap.brand) && norm(x.model) === norm(snap.model));
        if (d) {
          d.consumable = snap.kind;
          d.consumableSrc = "user";
          try { localStorage.setItem(DB_KEY, JSON.stringify(fresh)); } catch {}
        }
        rebuild(); passAll(); syncFromDevice();
        snap = null;
      }, 0);
    });

    syncFromDevice();
  }

  /* ================= ЦИКЛ ================= */
  function onDb() { rebuild(); passAll(); if ($("lbField")) syncFromDevice(); }

  function boot() {
    styles();
    rebuild();
    buildField();
    passAll();
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    setTimeout(passAll, 600);
    setTimeout(passAll, 2000);
  }

  normalizeBase();
  rebuild();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.addEventListener("vh:db", onDb);
  window.addEventListener("storage", (e) => { if (e.key === DB_KEY) onDb(); });
  window.addEventListener("pageshow", (e) => { if (e.persisted) { rebuild(); passAll(); } });
  window.addEventListener("pagehide", () => { mo.disconnect(); cancelAnimationFrame(rafId); });

  window.VHLabels = {
    kindOf: (id) => { const d = db.devices.find((x) => x.id === id); return d ? deviceKind(d) : null; },
    word: (n, kind) => `${n} ${plural(n, kind)}`,
    plural, convert, rebuild: onDb,
    get pool() { return poolKind(); }
  };
})();
