(() => {
  "use strict";

  if (window.VHPhotoFix) return;

  const DB_KEY = "vape_academy_catalog_v6";
  const BUST_KEY = "vh_photo_bust_v1";
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

  /* ================= АДРЕСА РЕПОЗИТОРИЯ ================= */
  const host = location.hostname;
  const segs = location.pathname.split("/").filter(Boolean);
  let gh = null;
  if (/\.github\.io$/i.test(host)) {
    const owner = host.split(".")[0];
    const repo = segs.length && !/\.html?$/i.test(segs[0]) ? segs[0] : `${owner}.github.io`;
    gh = { owner, repo };
  }

  const tailOf = (src) => (String(src || "").match(/(?:^|\/)(images\/[^?#]+)$/i) || [])[1] || "";
  const abs = (p) => { try { return new URL(p, document.baseURI).href; } catch { return p; } };
  const raw = (branch, tail) => `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${branch}/${tail}`;
  const cdn = (branch, tail) => `https://cdn.jsdelivr.net/gh/${gh.owner}/${gh.repo}@${branch}/${tail}`;

  let version = "1";
  function withVer(url) {
    if (!version || version === "1") return url;
    return url + (url.includes("?") ? "&" : "?") + "v=" + version;
  }

  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function computeVersion(db) {
    let bust = "";
    try { bust = sessionStorage.getItem(BUST_KEY) || ""; } catch {}
    if (bust) { version = bust; return; }
    const paths = []
      .concat((db?.devices || []).map((x) => x.image || ""))
      .concat((db?.coils || []).map((x) => x.image || ""))
      .join("|");
    version = paths ? hash(paths) : "1";
  }

  function candidates(src) {
    const s = String(s0(src)).trim();
    function s0(v) { return v || ""; }
    if (!s) return [];
    if (/^(data:|blob:)/i.test(s)) return [s];

    const tail = tailOf(s);
    const out = [];
    const add = (u) => { if (u && !out.includes(u)) out.push(u); };

    if (tail) {
      add(withVer(abs(tail)));
      if (gh) {
        add(withVer(raw("main", tail)));
        add(withVer(raw("master", tail)));
        add(withVer(cdn("main", tail)));
      }
      add(abs(tail) + (abs(tail).includes("?") ? "&" : "?") + "cb=" + Date.now());
      if (/^https?:/i.test(s)) add(s);
    } else if (/^https?:/i.test(s)) {
      add(s);
      add(s + (s.includes("?") ? "&" : "?") + "cb=" + Date.now());
    } else {
      add(withVer(abs(s)));
    }
    return out.slice(0, 6);
  }

  /* ================= НОРМАЛИЗАЦИЯ БАЗЫ ================= */
  function normalizeDb(db) {
    if (!db || typeof db !== "object") return { db, changed: false };
    let changed = false;
    ["devices", "coils"].forEach((kind) => {
      if (!Array.isArray(db[kind])) return;
      db[kind].forEach((x) => {
        if (!x || typeof x.image !== "string" || !x.image) return;
        const tail = tailOf(x.image);
        if (tail && x.image !== tail) { x.image = tail; changed = true; }
      });
    });
    return { db, changed };
  }

  function readDb() {
    try { const r = localStorage.getItem(DB_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
  }

  const nativeSet = localStorage.setItem.bind(localStorage);

  localStorage.setItem = function (key, value) {
    if (key === DB_KEY && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        const { db, changed } = normalizeDb(parsed);
        if (changed) {
          db.meta = db.meta || {};
          db.meta.updatedAt = new Date().toISOString();
          computeVersion(db);
          value = JSON.stringify(db);
          scheduleProbe();
          repaintAll();
        }
      } catch {}
    }
    nativeSet(key, value);
  };

  (function initialNormalize() {
    const db = readDb();
    if (!db) { computeVersion(window.CATALOG_DATA || null); return; }
    const { db: fixed, changed } = normalizeDb(db);
    computeVersion(fixed);
    if (changed) {
      fixed.meta = fixed.meta || {};
      fixed.meta.updatedAt = new Date().toISOString();
      try { nativeSet(DB_KEY, JSON.stringify(fixed)); } catch {}
    }
  })();

  /* ================= СТИЛИ ================= */
  function styles() {
    if ($("pfStyles")) return;
    const st = document.createElement("style");
    st.id = "pfStyles";
    st.textContent = `
      .pf-note{margin-top:10px;padding:11px 13px;border:1px dashed var(--border-strong,#454c55);border-radius:12px;
        background:var(--card2,#191c21);font-size:12px;line-height:1.55;color:var(--muted,#8b929b)}
      .pf-note b{display:block;color:var(--text,#f4f6f8);font-size:12px;margin-bottom:5px}
      .pf-note code{display:block;margin-top:5px;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;
        background:var(--bg,#08090b);border:1px solid var(--border,#2b3037);border-radius:6px;padding:5px 7px}
      .pf-note a{display:inline-block;margin-top:9px;padding:7px 12px;border-radius:8px;text-decoration:none;
        background:var(--accent,#fff);color:var(--ink,#08090b);font-weight:800;font-size:11.5px}
      .pf-note a:hover{filter:brightness(.88)}
      .stage-empty .pf-path{display:block;margin:12px auto 0;max-width:430px;word-break:break-all;
        font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#6b7280;line-height:1.6}
      .stage-empty .pf-open{display:inline-block;margin-top:12px;padding:8px 14px;border-radius:9px;text-decoration:none;
        background:#101317;color:#fff;font-weight:800;font-size:12px}
      .pf-panel{border:1px solid var(--border,#2b3037);border-radius:var(--radius-lg,20px);background:var(--card,#121418);
        padding:18px;margin-bottom:18px;box-shadow:var(--shadow-soft,0 8px 24px rgba(0,0,0,.4))}
      .pf-top{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
      .pf-h{margin:0;font-size:17px;font-weight:900;letter-spacing:-.01em}
      .pf-sub{margin:6px 0 0;font-size:12.5px;line-height:1.6;color:var(--muted,#8b929b);max-width:76ch}
      .pf-chips{display:flex;flex-wrap:wrap;gap:7px}
      .pf-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;
        border:1px solid var(--border,#2b3037);background:var(--card2,#191c21);font:800 11px/1 inherit;
        letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#8b929b)}
      .pf-chip b{color:var(--text,#f4f6f8);font-size:12px;font-variant-numeric:tabular-nums}
      .pf-chip.bad{border-style:dashed;border-color:var(--border-strong,#454c55)}
      .pf-bar{height:5px;border-radius:99px;background:var(--card2,#191c21);border:1px solid var(--border,#2b3037);overflow:hidden;margin-bottom:12px}
      .pf-bar i{display:block;height:100%;width:0;background:var(--accent,#fff);transition:width .25s ease}
      .pf-acts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
      .pf-b{padding:10px 15px;border-radius:11px;font:800 12.5px/1 inherit;cursor:pointer;
        border:1px solid var(--border-strong,#454c55);background:var(--card2,#191c21);color:var(--text,#f4f6f8);transition:.18s}
      .pf-b:hover{border-color:var(--accent,#fff);transform:translateY(-1px)}
      .pf-b:disabled{opacity:.5;cursor:default;transform:none}
      .pf-b.primary{background:var(--accent,#fff);color:var(--ink,#08090b);border-color:var(--accent,#fff)}
      .pf-list{max-height:230px;overflow-y:auto;border:1px solid var(--border,#2b3037);border-radius:12px;
        background:var(--bg,#08090b);padding:10px 12px;scrollbar-width:thin;scrollbar-color:var(--border-strong,#454c55) transparent}
      .pf-list::-webkit-scrollbar{width:9px}
      .pf-list::-webkit-scrollbar-track{background:transparent}
      .pf-list::-webkit-scrollbar-thumb{background:var(--border-strong,#454c55);border-radius:9px;border:2px solid var(--bg,#08090b)}
      .pf-list::-webkit-scrollbar-thumb:hover{background:var(--accent,#fff)}
      .pf-item{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--border,#2b3037)}
      .pf-item:first-child{border-top:0}
      .pf-item b{font-size:12.5px;flex:1;min-width:150px}
      .pf-item code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--muted,#8b929b);word-break:break-all;flex:2;min-width:180px}
      .pf-item a{padding:6px 10px;border-radius:8px;border:1px solid var(--border-strong,#454c55);
        color:var(--text,#f4f6f8);text-decoration:none;font:800 11px/1 inherit;white-space:nowrap}
      .pf-item a:hover{border-color:var(--accent,#fff)}
      .pf-ok{font-size:12.5px;color:var(--muted,#8b929b);padding:4px 0}
      .pf-help{margin:12px 0 0;font-size:11.5px;line-height:1.65;color:var(--muted2,#6a717a)}
      .pf-help code{background:var(--card2,#191c21);border:1px solid var(--border,#2b3037);border-radius:5px;padding:1px 5px;font-size:11px}
      @media (max-width:560px){.pf-acts .pf-b{flex:1 1 46%}}
    `;
    document.head.appendChild(st);
  }

  /* ================= ПОДМЕНА АДРЕСА У КАРТИНОК ================= */
  const seen = new WeakMap();

  function succeed(img, rec) {
    img.dataset.pfOk = rec.list[rec.i];
    img.hidden = false;
    img.style.display = "";
    const holder = img.closest(".photo, .mini-photo");
    if (holder) holder.classList.add("has");
    if (img.id === "stageImg") syncZoom(rec.list[rec.i]);
  }

  function fail(img, rec) {
    const path = tailOf(rec.original) || rec.original;
    const probe = rec.list[0] || rec.original;

    const holder = img.closest(".photo, .mini-photo");
    if (holder) { holder.classList.remove("has"); img.remove(); return; }

    const quiz = img.closest(".quiz-media");
    if (quiz) { quiz.remove(); return; }

    if (img.id === "stageImg") {
      const stage = img.closest(".stage");
      const title = img.alt || "Товар";
      if (stage) {
        stage.querySelectorAll("#stageImg, .zoom-hint, .stage-empty").forEach((n) => n.remove());
        const box = document.createElement("div");
        box.className = "stage-empty";
        box.innerHTML = `<b></b><span>Фото не найдено</span><code class="pf-path"></code><a class="pf-open" target="_blank" rel="noopener">Проверить файл ↗</a>`;
        box.querySelector("b").textContent = title;
        box.querySelector(".pf-path").textContent = path;
        box.querySelector("a").href = probe;
        stage.appendChild(box);
      }
      return;
    }

    if (img.classList.contains("preview")) {
      img.hidden = true;
      let note = img.parentElement.querySelector(".pf-note");
      if (!note) { note = document.createElement("div"); note.className = "pf-note"; img.insertAdjacentElement("afterend", note); }
      note.innerHTML = `<b>Фото не открывается</b>Проверьте, что файл загружен в репозиторий по этому пути:<code></code><a target="_blank" rel="noopener">Открыть адрес ↗</a>`;
      note.querySelector("code").textContent = path;
      note.querySelector("a").href = probe;
      return;
    }

    img.style.display = "none";
  }

  function advance(img, rec) {
    rec.i += 1;
    if (rec.i < rec.list.length) img.src = rec.list[rec.i];
    else { img.onerror = null; fail(img, rec); }
  }

  function process(img) {
    if (!img || img.tagName !== "IMG") return;
    if (img.closest("#lightbox")) return;
    if (img.dataset.pfSkip === "1") return;

    const cur = img.getAttribute("src") || "";
    if (!cur) return;

    const prev = seen.get(img);
    if (prev && prev.v === version && (prev.original === cur || prev.list.includes(cur))) return;

    const list = candidates(cur);
    if (!list.length) return;

    const rec = { original: prev && prev.v === version ? prev.original : cur, list, i: 0, v: version };
    seen.set(img, rec);

    img.removeAttribute("onerror");
    img.onerror = () => advance(img, rec);
    img.onload = () => succeed(img, rec);

    if (cur !== list[0]) img.src = list[0];
    else if (img.complete && img.naturalWidth === 0) advance(img, rec);
    else if (img.complete && img.naturalWidth > 0) succeed(img, rec);
  }

  function repaintAll() {
    document.querySelectorAll("img").forEach(process);
  }

  function syncZoom(url) {
    const set = () => { const lb = $("lightboxImg"); if (lb) lb.src = url; };
    ["stageImg", "zoomBtn"].forEach((id) => {
      const el = $(id);
      if (el && !el.dataset.pfZoom) { el.dataset.pfZoom = "1"; el.addEventListener("click", () => setTimeout(set, 0)); }
    });
  }

  function observe() {
    const run = () => repaintAll();
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes") { process(m.target); continue; }
        m.addedNodes && m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IMG") process(n);
          else n.querySelectorAll && n.querySelectorAll("img").forEach(process);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    run();
    window.addEventListener("pagehide", () => mo.disconnect());
  }

  /* ================= ДИАГНОСТИКА В АДМИНКЕ ================= */
  let panel = null, probeToken = 0, probeTimer = 0, results = null, probing = false;

  function buildPanel() {
    const admin = $("admin");
    if (!admin || $("pfPanel")) { panel = $("pfPanel"); return; }

    panel = document.createElement("div");
    panel.id = "pfPanel";
    panel.className = "pf-panel";
    panel.innerHTML = `
      <div class="pf-top">
        <div>
          <h2 class="pf-h">Доступность фото</h2>
          <p class="pf-sub">Проверяет, открывается ли каждый снимок из базы по адресам репозитория. Если файла нет — он не появится ни у вас, ни у продавцов, пока не будет загружен в папку <code>images/</code>.</p>
        </div>
        <div class="pf-chips" id="pfChips"></div>
      </div>
      <div class="pf-bar"><i id="pfBar"></i></div>
      <div class="pf-acts">
        <button class="pf-b primary" id="pfRun" type="button">Проверить фото</button>
        <button class="pf-b" id="pfBust" type="button">Обновить кэш снимков</button>
        <button class="pf-b" id="pfCopy" type="button">Скопировать пути</button>
      </div>
      <div class="pf-list" id="pfList"><div class="pf-ok">Нажмите «Проверить фото», чтобы увидеть список недостающих файлов.</div></div>
      <p class="pf-help">Пути в базе хранятся в переносимом виде — <code>images/devices/имя.jpg</code>. Адрес подставляется автоматически под текущий домен и аккаунт, поэтому переезд репозитория больше не ломает снимки.</p>
    `;
    const first = admin.querySelector(".panel");
    admin.insertBefore(panel, first ? first.nextSibling : admin.firstChild);

    $("pfRun").addEventListener("click", () => runProbe(true));
    $("pfBust").addEventListener("click", () => {
      try { sessionStorage.setItem(BUST_KEY, String(Date.now())); } catch {}
      computeVersion(readDb() || window.CATALOG_DATA);
      repaintAll();
      runProbe(true);
    });
    $("pfCopy").addEventListener("click", async () => {
      const db = readDb() || window.CATALOG_DATA || {};
      const items = [].concat(db.devices || [], db.coils || []).filter((x) => x.image);
      const missing = results ? items.filter((x) => results.bad.has(x.id)) : items;
      const text = missing.map((x) => tailOf(x.image) || x.image).join("\n") || "Все фото на месте";
      try { await navigator.clipboard.writeText(text); }
      catch {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch {}
        ta.remove();
      }
      const b = $("pfCopy"), old = b.textContent;
      b.textContent = "Скопировано ✓";
      setTimeout(() => { b.textContent = old; }, 1600);
    });

    paintPanel();
  }

  function paintPanel() {
    if (!panel) return;
    const db = readDb() || window.CATALOG_DATA || {};
    const items = [].concat(db.devices || [], db.coils || []).filter((x) => x && x.image);
    const total = items.length;
    const ok = results ? results.ok.size : 0;
    const bad = results ? results.bad.size : 0;

    $("pfChips").innerHTML =
      `<span class="pf-chip">С путями <b>${total}</b></span>` +
      `<span class="pf-chip">Открывается <b>${ok}</b></span>` +
      `<span class="pf-chip${bad ? " bad" : ""}">Не найдено <b>${bad}</b></span>` +
      (probing ? `<span class="pf-chip">Проверка…</span>` : "");

    $("pfRun").disabled = probing;
    $("pfBar").style.width = results && total ? `${Math.round(((ok + bad) / total) * 100)}%` : (probing ? "12%" : "0%");

    const list = $("pfList");
    if (probing && !results) { list.innerHTML = `<div class="pf-ok">Проверяем адреса снимков…</div>`; return; }
    if (!results) return;

    if (!bad) {
      list.innerHTML = `<div class="pf-ok">Все ${ok} снимков открываются. Продавцы увидят те же фото, что и вы.</div>`;
      return;
    }

    const label = (x) => x.model ? `${x.brand} ${x.model}` : `${x.brand} ${x.name} ${x.resistance || ""}`.trim();
    list.innerHTML = [...results.bad].map((id) => {
      const x = items.find((y) => y.id === id);
      if (!x) return "";
      const path = tailOf(x.image) || x.image;
      const url = candidates(x.image)[0] || x.image;
      return `<div class="pf-item"><b>${esc(label(x))}</b><code>${esc(path)}</code><a href="${esc(url)}" target="_blank" rel="noopener">открыть ↗</a></div>`;
    }).join("");
  }

  function probeOne(src) {
    return new Promise((resolve) => {
      const list = candidates(src);
      if (!list.length) return resolve(false);
      let i = 0;
      const img = new Image();
      img.dataset && (img.dataset.pfSkip = "1");
      const timer = setTimeout(() => { img.src = ""; resolve(false); }, 12000);
      img.onload = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => {
        i += 1;
        if (i < list.length) img.src = list[i];
        else { clearTimeout(timer); resolve(false); }
      };
      img.src = list[0];
    });
  }

  async function runProbe(force) {
    if (!panel || probing) return;
    const db = readDb() || window.CATALOG_DATA || {};
    const items = [].concat(db.devices || [], db.coils || []).filter((x) => x && x.image);
    if (!items.length) { results = { ok: new Set(), bad: new Set() }; paintPanel(); return; }

    probing = true;
    const token = ++probeToken;
    const ok = new Set(), bad = new Set();
    results = { ok, bad };
    paintPanel();

    let cursor = 0;
    const worker = async () => {
      while (cursor < items.length && token === probeToken) {
        const x = items[cursor++];
        const good = await probeOne(x.image);
        if (token !== probeToken) return;
        good ? ok.add(x.id) : bad.add(x.id);
        paintPanel();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (token !== probeToken) return;
    probing = false;
    paintPanel();
  }

  function scheduleProbe() {
    if (!panel) return;
    clearTimeout(probeTimer);
    probeTimer = setTimeout(() => runProbe(false), 2200);
  }

  /* ================= СТАРТ ================= */
  function boot() {
    styles();
    observe();
    buildPanel();
    if (panel) scheduleProbe();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.addEventListener("storage", (e) => {
    if (e.key !== DB_KEY) return;
    computeVersion(readDb());
    repaintAll();
    scheduleProbe();
  });

  window.VHPhotoFix = {
    recheck: () => runProbe(true),
    refresh: () => { try { sessionStorage.setItem(BUST_KEY, String(Date.now())); } catch {} computeVersion(readDb()); repaintAll(); },
    candidates
  };
})();
