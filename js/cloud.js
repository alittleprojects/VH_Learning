(() => {
  "use strict";

  if (window.VHCloud) return;

  const DB_KEY = "vape_academy_catalog_v6";
  const CFG_KEY = "vh_cloud_cfg_v1";
  const STATE_KEY = "vh_reload_state_v1";
  const me = document.currentScript;

  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const now = () => Date.now();

  /* ================= КОНФИГ ================= */
  function detect() {
    const host = location.hostname;
    const seg = location.pathname.split("/").filter(Boolean);
    if (/\.github\.io$/i.test(host)) {
      return {
        owner: host.split(".")[0],
        repo: seg.length && !/\.html?$/i.test(seg[0]) ? seg[0] : `${host.split(".")[0]}.github.io`,
        branch: "main",
        path: "data/catalog.js"
      };
    }
    return { owner: "", repo: "", branch: "main", path: "data/catalog.js" };
  }

  const DEF = Object.assign({ token: "", autoPush: true, autoPull: true, interval: 90, strict: true }, detect());

  let cfg = Object.assign({}, DEF);
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      cfg = Object.assign({}, DEF, saved);
      const d = detect();
      if (!cfg.owner && d.owner) cfg.owner = d.owner;
      if (!cfg.repo && d.repo) cfg.repo = d.repo;
    }
  } catch {}

  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {} };
  const canRead = () => Boolean(cfg.owner && cfg.repo && cfg.branch && cfg.path);
  const canWrite = () => canRead() && Boolean(cfg.token);

  /* ================= СОСТОЯНИЕ ================= */
  let status = canRead() ? "idle" : "local";
  let lastSync = 0;
  let lastError = "";
  let pushing = false;
  let pullTimer = 0;
  let pushTimer = 0;
  let suppress = false;
  let pendingRemote = null;
  let applyTimer = 0;
  const log = [];

  function note(text, kind) {
    log.unshift({ t: new Date(), text, kind: kind || "info" });
    if (log.length > 9) log.pop();
    paintLog();
  }

  function setStatus(s, err) {
    status = s;
    lastError = err || "";
    if (s === "ok") lastSync = now();
    paintPill();
    paintPanel();
  }

  /* ================= БАЗА ================= */
  function readLocal() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function writeLocal(data) {
    suppress = true;
    try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch {}
    setTimeout(() => { suppress = false; }, 60);
  }

  function stamp(db) {
    const t = Date.parse(db?.meta?.updatedAt || "");
    return Number.isFinite(t) ? t : 0;
  }

  function valid(db) {
    return db && Array.isArray(db.devices) && Array.isArray(db.coils);
  }

  function parseCatalog(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) throw new Error("Пустой файл");
    let obj;
    try { obj = JSON.parse(trimmed); }
    catch {
      const a = trimmed.indexOf("=");
      const b = trimmed.lastIndexOf(";");
      if (a === -1) throw new Error("Не найден CATALOG_DATA");
      obj = JSON.parse(trimmed.slice(a + 1, b === -1 ? undefined : b));
    }
    if (!valid(obj)) throw new Error("Неверная структура базы");
    return obj;
  }

  const serialize = (db) => `window.CATALOG_DATA = ${JSON.stringify(db, null, 2)};\n`;

  function b64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return btoa(bin);
  }

  /* ================= СЕТЬ ================= */
  const rawUrl = () => `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${cfg.path}?cb=${now()}`;
  const apiUrl = () => `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path.split("/").map(encodeURIComponent).join("/")}`;

  async function timed(url, opts, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 9000);
    try { return await fetch(url, Object.assign({}, opts, { signal: ctl.signal, cache: "no-store" })); }
    finally { clearTimeout(t); }
  }

  async function fetchRemote(ms) {
    const res = await timed(rawUrl(), { method: "GET" }, ms);
    if (!res.ok) throw new Error(`Файл недоступен (${res.status})`);
    return parseCatalog(await res.text());
  }

  async function apiGet() {
    const res = await timed(`${apiUrl()}?ref=${encodeURIComponent(cfg.branch)}&cb=${now()}`, {
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" }
    });
    if (res.status === 404) return { sha: null, db: null };
    if (res.status === 401) throw new Error("Токен недействителен");
    if (res.status === 403) throw new Error("Нет прав или лимит запросов");
    if (!res.ok) throw new Error(`GitHub ответил ${res.status}`);
    const j = await res.json();
    let db = null;
    try {
      const bin = atob(String(j.content || "").replace(/\s/g, ""));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      db = parseCatalog(new TextDecoder().decode(bytes));
    } catch {}
    return { sha: j.sha, db };
  }

  async function apiPut(db, sha, message) {
    const body = { message, content: b64(serialize(db)), branch: cfg.branch };
    if (sha) body.sha = sha;
    const res = await timed(apiUrl(), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }, 15000);
    if (res.status === 401) throw new Error("Токен недействителен");
    if (res.status === 403) throw new Error("У токена нет права Contents: Read and write");
    if (res.status === 404) throw new Error("Репозиторий или ветка не найдены");
    if (res.status === 409) throw new Error("Конфликт версий");
    if (!res.ok) throw new Error(`Запись отклонена (${res.status})`);
    return res.json();
  }

  /* ================= ОТПРАВКА ================= */
  async function push(force) {
    if (!canWrite() || pushing) return;
    const local = readLocal();
    if (!valid(local)) { note("Нечего отправлять: база пуста", "warn"); return; }

    pushing = true;
    setStatus("syncing");
    try {
      let { sha, db: remote } = await apiGet();

      if (remote && cfg.strict && !force && stamp(remote) > stamp(local)) {
        pushing = false;
        setStatus("warn", "В репозитории более новая версия");
        note("Отправка остановлена: удалённая база новее", "warn");
        if (confirm("В репозитории база новее вашей локальной. Перезаписать её вашей версией?")) {
          return push(true);
        }
        return;
      }

      local.meta = local.meta || {};
      local.meta.updatedAt = new Date().toISOString();
      local.meta.syncedFrom = "admin";
      writeLocal(local);

      const counts = `${local.devices.length} устр. / ${local.coils.length} картр.`;
      try {
        await apiPut(local, sha, `V&H: обновление каталога · ${counts}`);
      } catch (e) {
        if (/Конфликт/.test(e.message)) {
          const again = await apiGet();
          await apiPut(local, again.sha, `V&H: обновление каталога · ${counts}`);
        } else throw e;
      }

      setStatus("ok");
      note(`Отправлено в репозиторий · ${counts}`, "ok");
    } catch (e) {
      setStatus("error", e.message);
      note(`Ошибка отправки: ${e.message}`, "err");
    } finally {
      pushing = false;
    }
  }

  function queuePush() {
    if (!canWrite() || !cfg.autoPush || suppress) return;
    clearTimeout(pushTimer);
    setStatus("dirty");
    pushTimer = setTimeout(() => push(false), 1500);
  }

  /* ================= ПОЛУЧЕНИЕ ================= */
  function editing() {
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    const lb = $("lightbox");
    if (lb && !lb.hidden) return true;
    const login = $("loginOverlay");
    if (login && getComputedStyle(login).display !== "none") return true;
    return false;
  }

  function rememberPlace() {
    try {
      const tab = document.querySelector(".tab.active")?.dataset.tab || "";
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ y: scrollY, tab, at: now() }));
    } catch {}
  }

  function restorePlace() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STATE_KEY);
      const s = JSON.parse(raw);
      if (now() - (s.at || 0) > 15000) return;
      if (s.tab) document.querySelector(`.tab[data-tab="${CSS.escape(s.tab)}"]`)?.click();
      requestAnimationFrame(() => scrollTo({ top: s.y || 0, behavior: "auto" }));
    } catch {}
  }

  function applyRemote(db, quiet) {
    writeLocal(db);
    note(`Получена база · ${db.devices.length} устр. / ${db.coils.length} картр.`, "ok");
    lastSync = now();
    if (quiet) return;
    rememberPlace();
    location.reload();
  }

  function offerRemote(db) {
    pendingRemote = db;
    toast("Каталог обновлён в репозитории", {
      label: "Применить",
      fn: () => { clearTimeout(applyTimer); const d = pendingRemote; pendingRemote = null; if (d) applyRemote(d); }
    });
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      if (!pendingRemote) return;
      if (editing()) { offerRemote(pendingRemote); return; }
      const d = pendingRemote; pendingRemote = null;
      applyRemote(d);
    }, 7000);
  }

  async function pull(initial) {
    if (!canRead()) { setStatus("local"); return; }
    if (!initial && !cfg.autoPull) return;
    if (document.hidden) return;
    if (!initial) setStatus("syncing");
    try {
      const remote = await fetchRemote(initial ? 4500 : 9000);
      const local = readLocal();

      if (!valid(local)) {
        applyRemote(remote, true);
        setStatus("ok");
        return;
      }

      const rs = stamp(remote), ls = stamp(local);

      if (rs > ls) {
        if (initial) { applyRemote(remote, true); setStatus("ok"); }
        else { setStatus("ok"); offerRemote(remote); }
        return;
      }

      setStatus("ok");
      if (ls > rs && canWrite() && cfg.autoPush && initial) queuePush();
    } catch (e) {
      if (!navigator.onLine) { setStatus("offline", "Нет сети"); if (!initial) note("Офлайн: работаем на локальной базе", "warn"); }
      else { setStatus(initial ? "local" : "error", e.message); if (!initial) note(`Проверка не удалась: ${e.message}`, "err"); }
    }
  }

  function watch() {
    clearInterval(pullTimer);
    if (!canRead() || !cfg.autoPull) return;
    pullTimer = setInterval(() => pull(false), clamp(Number(cfg.interval) || 90, 30, 600) * 1000);
  }

  /* ================= ПЕРЕХВАТ ЗАПИСИ ================= */
  const origSet = localStorage.setItem.bind(localStorage);
  const origDel = localStorage.removeItem.bind(localStorage);

  localStorage.setItem = function (k, v) {
    origSet(k, v);
    if (k === DB_KEY && !suppress) queuePush();
  };
  localStorage.removeItem = function (k) {
    origDel(k);
    if (k === DB_KEY && !suppress) queuePush();
  };

  /* ================= ТОСТ ================= */
  let toastTimer = 0;
  function toast(text, action) {
    let n = $("vhCloudToast");
    if (!n) {
      n = document.createElement("div");
      n.id = "vhCloudToast";
      n.className = "toast";
      n.style.bottom = "88px";
      document.body.appendChild(n);
    }
    n.innerHTML = `<span>${esc(text)}</span>` + (action ? `<button class="toast-btn" type="button">${esc(action.label)}</button>` : "");
    if (action) n.querySelector("button").addEventListener("click", () => { action.fn(); n.classList.remove("show"); });
    n.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.classList.remove("show"), action ? 9000 : 3000);
  }

  /* ================= СТИЛИ ================= */
  function styles() {
    if ($("vhCloudStyles")) return;
    const st = document.createElement("style");
    st.id = "vhCloudStyles";
    st.textContent = `
      .cl-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;
        border:1px solid var(--border,#2b3037);background:var(--card,#121418);color:var(--muted,#8b929b);
        font:800 11px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.06em;text-transform:uppercase;
        cursor:pointer;flex-shrink:0;transition:border-color .2s,color .2s,background-color .28s}
      .cl-pill:hover{border-color:var(--border-strong,#454c55);color:var(--text,#f4f6f8)}
      .cl-pill i{width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0}
      .cl-pill[data-s="ok"]{color:var(--text,#f4f6f8);border-color:var(--border-strong,#454c55)}
      .cl-pill[data-s="ok"] i{animation:clBeat 2.4s ease-out infinite}
      .cl-pill[data-s="syncing"] i,.cl-pill[data-s="dirty"] i{animation:clSpin .9s linear infinite;border-radius:2px}
      .cl-pill[data-s="error"]{border-style:dashed;border-color:var(--border-strong,#454c55);color:var(--text,#f4f6f8)}
      .cl-pill[data-s="error"] i{border-radius:1px;transform:rotate(45deg)}
      .cl-pill[data-s="warn"]{border-style:dashed}
      @keyframes clBeat{0%{box-shadow:0 0 0 0 currentColor;opacity:1}70%{box-shadow:0 0 0 7px transparent;opacity:.75}100%{box-shadow:0 0 0 0 transparent;opacity:1}}
      @keyframes clSpin{to{transform:rotate(360deg)}}
      .cl-panel{border:1px solid var(--border,#2b3037);border-radius:var(--radius-lg,20px);
        background:var(--card,#121418);padding:18px;margin-bottom:18px;box-shadow:var(--shadow-soft,0 8px 24px rgba(0,0,0,.4))}
      .cl-top{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px}
      .cl-h{margin:0;font-size:17px;font-weight:900;letter-spacing:-.01em}
      .cl-sub{margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--muted,#8b929b);max-width:74ch}
      .cl-state{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:900;letter-spacing:.07em;
        text-transform:uppercase;padding:6px 11px;border-radius:999px;border:1px solid var(--border,#2b3037);background:var(--card2,#191c21)}
      .cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:12px}
      .cl-f label{display:block;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
        color:var(--muted,#8b929b);margin-bottom:6px}
      .cl-f input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border,#2b3037);
        background:var(--bg,#08090b);color:var(--text,#f4f6f8);font:inherit;font-size:13px}
      .cl-f input:focus{outline:none;border-color:var(--accent,#fff)}
      .cl-token{display:flex;gap:8px}
      .cl-token input{flex:1;min-width:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
      .cl-eye{padding:0 12px;border-radius:10px;border:1px solid var(--border,#2b3037);background:var(--card2,#191c21);
        color:var(--text,#f4f6f8);cursor:pointer;font-size:14px}
      .cl-row{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:12px}
      .cl-tg{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:700;color:var(--muted,#8b929b)}
      .cl-tg button{display:inline-flex;align-items:center;width:34px;height:19px;border-radius:999px;padding:2px;
        border:1px solid var(--border,#2b3037);background:var(--card2,#191c21);cursor:pointer}
      .cl-tg button i{width:13px;height:13px;border-radius:50%;background:var(--muted,#8b929b);transition:.2s}
      .cl-tg button[aria-checked="true"]{background:var(--accent,#fff);border-color:var(--accent,#fff)}
      .cl-tg button[aria-checked="true"] i{transform:translateX(15px);background:var(--ink,#08090b)}
      .cl-int{display:flex;align-items:center;gap:10px;min-width:230px;flex:1}
      .cl-int span{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#8b929b);white-space:nowrap}
      .cl-int b{font-size:12px;font-variant-numeric:tabular-nums;color:var(--text,#f4f6f8);min-width:52px;text-align:right}
      .cl-int input[type=range]{-webkit-appearance:none;appearance:none;flex:1;height:18px;background:transparent;cursor:pointer;margin:0}
      .cl-int input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:99px;background:var(--border-strong,#454c55)}
      .cl-int input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;margin-top:-5.5px;border-radius:50%;
        background:var(--accent,#fff);border:2px solid var(--bg,#08090b);box-shadow:0 0 0 1px var(--accent,#fff)}
      .cl-int input[type=range]::-moz-range-track{height:4px;border-radius:99px;background:var(--border-strong,#454c55)}
      .cl-int input[type=range]::-moz-range-thumb{width:13px;height:13px;border:2px solid var(--bg,#08090b);border-radius:50%;background:var(--accent,#fff)}
      .cl-acts{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:12px}
      .cl-b{padding:10px 15px;border-radius:11px;font:800 13px/1 system-ui,sans-serif;cursor:pointer;
        border:1px solid var(--border-strong,#454c55);background:var(--card2,#191c21);color:var(--text,#f4f6f8);transition:.18s}
      .cl-b:hover{border-color:var(--accent,#fff);transform:translateY(-1px)}
      .cl-b:disabled{opacity:.5;cursor:default;transform:none}
      .cl-b.primary{background:var(--accent,#fff);color:var(--ink,#08090b);border-color:var(--accent,#fff)}
      .cl-log{max-height:168px;overflow-y:auto;border:1px solid var(--border,#2b3037);border-radius:12px;
        background:var(--bg,#08090b);padding:10px 12px;scrollbar-width:thin;scrollbar-color:var(--border-strong,#454c55) transparent}
      .cl-log::-webkit-scrollbar{width:8px}
      .cl-log::-webkit-scrollbar-track{background:transparent}
      .cl-log::-webkit-scrollbar-thumb{background:var(--border-strong,#454c55);border-radius:8px}
      .cl-log::-webkit-scrollbar-thumb:hover{background:var(--accent,#fff)}
      .cl-li{display:flex;gap:10px;font-size:12px;line-height:1.5;padding:4px 0;border-top:1px solid var(--border,#2b3037)}
      .cl-li:first-child{border-top:0}
      .cl-li time{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--muted2,#6a717a);flex-shrink:0}
      .cl-li[data-k="ok"] span{color:var(--text,#f4f6f8)}
      .cl-li[data-k="err"] span{font-weight:800}
      .cl-li[data-k="warn"] span{color:var(--muted,#8b929b)}
      .cl-empty{font-size:12px;color:var(--muted2,#6a717a)}
      .cl-help{margin:12px 0 0;font-size:11.5px;line-height:1.65;color:var(--muted2,#6a717a)}
      .cl-help b{color:var(--muted,#8b929b)}
      .cl-help code{background:var(--card2,#191c21);border:1px solid var(--border,#2b3037);border-radius:5px;padding:1px 5px;font-size:11px}
      @media (max-width:560px){.cl-acts .cl-b{flex:1 1 46%}.cl-pill span{display:none}.cl-pill{padding:8px}}
      @media (prefers-reduced-motion:reduce){.cl-pill i{animation:none!important}}
    `;
    document.head.appendChild(st);
  }

  /* ================= ИНДИКАТОР ================= */
  const TEXT = {
    idle: "Готово", local: "Локально", syncing: "Обмен", dirty: "Правки",
    ok: "Синхронно", warn: "Конфликт", error: "Ошибка", offline: "Офлайн"
  };

  let pill = null;
  function buildPill() {
    if ($("vhCloudPill")) { pill = $("vhCloudPill"); return; }
    pill = document.createElement("button");
    pill.id = "vhCloudPill";
    pill.type = "button";
    pill.className = "cl-pill";
    pill.innerHTML = `<i></i><span></span>`;
    const bar = document.querySelector(".tabs");
    const acts = document.querySelector(".header-actions");
    const head = document.querySelector(".header");
    const sw = $("vhThemeSwitch");
    if (bar) { bar.insertBefore(pill, sw && sw.parentElement === bar ? sw : null); pill.style.marginLeft = "auto"; if (sw) sw.style.marginLeft = "8px"; }
    else if (acts) acts.insertBefore(pill, acts.firstChild);
    else if (head) { pill.style.marginLeft = "auto"; head.appendChild(pill); }
    else { pill.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9990"; document.body.appendChild(pill); }

    pill.addEventListener("click", () => {
      const p = $("vhCloudPanel");
      if (p) { p.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      pull(false).then(() => toast(lastError ? `Проверка: ${lastError}` : "Каталог проверен"));
    });
    paintPill();
  }

  function paintPill() {
    if (!pill) return;
    pill.dataset.s = status;
    const ago = lastSync ? Math.round((now() - lastSync) / 1000) : 0;
    const tail = status === "ok" && ago > 5 ? ` · ${ago < 60 ? ago + "с" : Math.round(ago / 60) + "м"}` : "";
    pill.querySelector("span").textContent = (TEXT[status] || status) + tail;
    pill.title = lastError || (canWrite() ? "Автоотправка в GitHub включена" : canRead() ? "Автообновление из GitHub" : "Репозиторий не определён");
  }
  setInterval(paintPill, 5000);

  /* ================= ПАНЕЛЬ ================= */
  let panel = null;
  function buildPanel() {
    const admin = document.getElementById("admin") || ($("deviceForm") ? $("deviceForm").closest("section") : null);
    if (!admin || $("vhCloudPanel")) { panel = $("vhCloudPanel"); return; }

    panel = document.createElement("div");
    panel.id = "vhCloudPanel";
    panel.className = "cl-panel";
    panel.innerHTML = `
      <div class="cl-top">
        <div>
          <h2 class="cl-h">Автосинхронизация с GitHub</h2>
          <p class="cl-sub">Каждое сохранение само улетает в <code>data/catalog.js</code>. Продавцы получают обновление автоматически — экспорт и загрузка файла вручную больше не нужны.</p>
        </div>
        <span class="cl-state" id="clState"></span>
      </div>

      <div class="cl-grid">
        <div class="cl-f"><label for="clOwner">Владелец</label><input id="clOwner" spellcheck="false" placeholder="alittleprojects"></div>
        <div class="cl-f"><label for="clRepo">Репозиторий</label><input id="clRepo" spellcheck="false" placeholder="VH_Learning"></div>
        <div class="cl-f"><label for="clBranch">Ветка</label><input id="clBranch" spellcheck="false" placeholder="main"></div>
        <div class="cl-f"><label for="clPath">Путь к базе</label><input id="clPath" spellcheck="false" placeholder="data/catalog.js"></div>
      </div>

      <div class="cl-f" style="margin-bottom:12px">
        <label for="clToken">Токен доступа · только у вас</label>
        <div class="cl-token">
          <input id="clToken" type="password" spellcheck="false" autocomplete="off" placeholder="github_pat_…">
          <button class="cl-eye" id="clEye" type="button" title="Показать токен">👁</button>
        </div>
      </div>

      <div class="cl-row">
        <span class="cl-tg">Автоотправка<button id="clPushTg" type="button" role="switch"><i></i></button></span>
        <span class="cl-tg">Автообновление<button id="clPullTg" type="button" role="switch"><i></i></button></span>
        <span class="cl-tg">Спрашивать при конфликте<button id="clStrictTg" type="button" role="switch"><i></i></button></span>
        <span class="cl-int"><span>Проверка</span><input id="clInterval" type="range" min="30" max="300" step="15"><b id="clIntV"></b></span>
      </div>

      <div class="cl-acts">
        <button class="cl-b primary" id="clConnect" type="button">Подключить и отправить</button>
        <button class="cl-b" id="clSend" type="button">Отправить сейчас</button>
        <button class="cl-b" id="clGet" type="button">Забрать из репозитория</button>
        <button class="cl-b" id="clTest" type="button">Проверить доступ</button>
        <button class="cl-b" id="clOff" type="button">Отключить токен</button>
      </div>

      <div class="cl-log" id="clLog"></div>

      <p class="cl-help">
        <b>Как получить токен:</b> GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
        Repository access — только этот репозиторий. Permissions → Repository permissions → <b>Contents: Read and write</b>.
        Скопируйте токен сюда и нажмите «Подключить и отправить». Токен хранится только в этом браузере и никуда, кроме GitHub, не отправляется.
        Без токена сайт продолжает читать обновления автоматически.
      </p>
    `;
    const first = admin.querySelector(".panel");
    admin.insertBefore(panel, first || admin.firstChild);

    ["clOwner", "clRepo", "clBranch", "clPath", "clToken"].forEach((id) => {
      $(id).addEventListener("input", () => {
        cfg[{ clOwner: "owner", clRepo: "repo", clBranch: "branch", clPath: "path", clToken: "token" }[id]] = $(id).value.trim();
        saveCfg(); paintPanel();
      });
    });

    $("clEye").addEventListener("click", () => {
      const i = $("clToken");
      i.type = i.type === "password" ? "text" : "password";
      $("clEye").textContent = i.type === "password" ? "👁" : "🚫";
    });

    const tg = (id, key, after) => $(id).addEventListener("click", () => {
      cfg[key] = !cfg[key]; saveCfg(); paintPanel(); if (after) after();
    });
    tg("clPushTg", "autoPush");
    tg("clPullTg", "autoPull", watch);
    tg("clStrictTg", "strict");

    $("clInterval").addEventListener("input", (e) => {
      cfg.interval = Number(e.target.value); saveCfg(); paintPanel(); watch();
    });

    $("clConnect").addEventListener("click", async () => {
      if (!canWrite()) { toast("Заполните репозиторий и токен"); return; }
      saveCfg();
      note("Подключение: отправляем текущую базу", "info");
      await push(true);
      watch();
    });

    $("clSend").addEventListener("click", () => push(false));

    $("clGet").addEventListener("click", async () => {
      if (!canRead()) { toast("Укажите репозиторий"); return; }
      setStatus("syncing");
      try {
        const remote = await fetchRemote(9000);
        applyRemote(remote);
      } catch (e) {
        setStatus("error", e.message);
        note(`Не удалось забрать: ${e.message}`, "err");
      }
    });

    $("clTest").addEventListener("click", async () => {
      if (!canWrite()) { toast("Нужен токен"); return; }
      setStatus("syncing");
      try {
        const res = await timed(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
          headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" }
        });
        if (res.status === 401) throw new Error("Токен недействителен");
        if (res.status === 404) throw new Error("Репозиторий не найден или нет доступа");
        if (!res.ok) throw new Error(`GitHub ответил ${res.status}`);
        const j = await res.json();
        const w = j.permissions?.push !== false;
        setStatus("ok");
        note(`Доступ есть: ${j.full_name}${w ? " · запись разрешена" : " · только чтение"}`, w ? "ok" : "warn");
      } catch (e) {
        setStatus("error", e.message);
        note(`Проверка доступа: ${e.message}`, "err");
      }
    });

    $("clOff").addEventListener("click", () => {
      cfg.token = ""; saveCfg(); paintPanel();
      setStatus(canRead() ? "ok" : "local");
      note("Токен удалён · сайт читает обновления без записи", "warn");
    });

    paintPanel();
    paintLog();
  }

  function paintPanel() {
    if (!panel) return;
    const map = { clOwner: "owner", clRepo: "repo", clBranch: "branch", clPath: "path", clToken: "token" };
    Object.entries(map).forEach(([id, key]) => {
      const el = $(id);
      if (el && document.activeElement !== el) el.value = cfg[key] || "";
    });
    [["clPushTg", "autoPush"], ["clPullTg", "autoPull"], ["clStrictTg", "strict"]].forEach(([id, key]) => {
      $(id)?.setAttribute("aria-checked", String(!!cfg[key]));
    });
    const iv = $("clInterval");
    if (iv && document.activeElement !== iv) iv.value = String(cfg.interval);
    const ivv = $("clIntV");
    if (ivv) ivv.textContent = `${cfg.interval} с`;
    const s = $("clState");
    if (s) {
      s.textContent = (TEXT[status] || status) + (lastError ? ` · ${lastError}` : "");
      s.style.borderStyle = (status === "error" || status === "warn") ? "dashed" : "solid";
    }
    const send = $("clSend"), conn = $("clConnect");
    if (send) send.disabled = !canWrite() || pushing;
    if (conn) conn.disabled = !canWrite() || pushing;
  }

  function paintLog() {
    const box = $("clLog");
    if (!box) return;
    box.innerHTML = log.length
      ? log.map((l) => `<div class="cl-li" data-k="${esc(l.kind)}"><time>${l.t.toLocaleTimeString("ru-RU")}</time><span>${esc(l.text)}</span></div>`).join("")
      : `<div class="cl-empty">Журнал обмена пуст. Сохраните товар — запись появится здесь.</div>`;
  }

  /* ================= ЗАГРУЗЧИК ================= */
  function loadScript(src) {
    return new Promise((resolve) => {
      if (!src) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.body.appendChild(s);
    });
  }

  function appList() {
    const main = me?.dataset.app || ($("itemRoot") ? "js/item.js" : "js/app.js");
    const extra = (me?.dataset.extra || "").split(",").map((s) => s.trim()).filter(Boolean);
    return [main, ...extra];
  }

  window.VHCloud = {
    push: () => push(true),
    pull: () => pull(false),
    get status() { return status; },
    get config() { return Object.assign({}, cfg, { token: cfg.token ? "•••" : "" }); }
  };

  /* ================= СТАРТ ================= */
  (async () => {
    styles();
    buildPill();
    try { await pull(true); } catch {}
    for (const src of appList()) await loadScript(src);
    buildPanel();
    restorePlace();
    watch();
    if (canRead()) note(canWrite() ? "Автосинхронизация активна" : "Автообновление активно", "ok");
    else note("Репозиторий не определён · работа локально", "warn");
  })();

  document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(false); });
  window.addEventListener("online", () => { note("Сеть восстановлена", "ok"); pull(false); if (canWrite() && cfg.autoPush) queuePush(); });
  window.addEventListener("offline", () => setStatus("offline", "Нет сети"));
  window.addEventListener("pagehide", () => { clearInterval(pullTimer); clearTimeout(pushTimer); clearTimeout(applyTimer); });
})();
