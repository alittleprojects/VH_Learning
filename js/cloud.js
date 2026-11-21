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
  const store = () => (window.VHPerf ? window.VHPerf.db() : null);

  function detect() {
    const h = location.hostname, seg = location.pathname.split("/").filter(Boolean);
    if (/\.github\.io$/i.test(h)) {
      const owner = h.split(".")[0];
      return { owner, repo: seg.length && !/\.html?$/i.test(seg[0]) ? seg[0] : `${owner}.github.io`, branch: "main", path: "data/catalog.js" };
    }
    return { owner: "", repo: "", branch: "main", path: "data/catalog.js" };
  }
  const DEF = Object.assign({ token: "", autoPush: true, autoPull: true, interval: 120, strict: true }, detect());
  let cfg = Object.assign({}, DEF);
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) { cfg = Object.assign({}, DEF, JSON.parse(raw)); const d = detect(); cfg.owner ||= d.owner; cfg.repo ||= d.repo; }
  } catch {}
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {} };
  const canRead = () => Boolean(cfg.owner && cfg.repo && cfg.branch && cfg.path);
  const canWrite = () => canRead() && Boolean(cfg.token);

  let status = canRead() ? "idle" : "local", lastSync = 0, lastError = "";
  let pushing = false, pullTimer = 0, pushTimer = 0, suppress = false, pending = null, applyTimer = 0;
  const log = [];

  const note = (text, kind) => { log.unshift({ t: new Date(), text, kind: kind || "info" }); if (log.length > 8) log.pop(); paintLog(); };
  function setStatus(s, err) { status = s; lastError = err || ""; if (s === "ok") lastSync = now(); paintPill(); paintPanel(); }

  const readLocal = () => { try { const r = localStorage.getItem(DB_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
  function writeLocal(d) { suppress = true; try { localStorage.setItem(DB_KEY, JSON.stringify(d)); } catch {} setTimeout(() => { suppress = false; }, 140); }
  const stamp = (d) => { const t = Date.parse(d?.meta?.updatedAt || ""); return Number.isFinite(t) ? t : 0; };
  const valid = (d) => d && Array.isArray(d.devices) && Array.isArray(d.coils);

  function parseCatalog(text) {
    const s = String(text || "").trim();
    if (!s) throw new Error("Пустой файл");
    let o;
    try { o = JSON.parse(s); }
    catch {
      const a = s.indexOf("="), b = s.lastIndexOf(";");
      if (a === -1) throw new Error("Не найден CATALOG_DATA");
      o = JSON.parse(s.slice(a + 1, b === -1 ? undefined : b));
    }
    if (!valid(o)) throw new Error("Неверная структура базы");
    return o;
  }
  const serialize = (d) => `window.CATALOG_DATA = ${JSON.stringify(d, null, 2)};\n`;
  function b64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  const rawUrl = () => `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${cfg.path}?cb=${now()}`;
  const apiUrl = () => `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path.split("/").map(encodeURIComponent).join("/")}`;
  async function timed(url, opts, ms) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 9000);
    try { return await fetch(url, Object.assign({}, opts, { signal: c.signal, cache: "no-store" })); }
    finally { clearTimeout(t); }
  }
  async function fetchRemote(ms) {
    const r = await timed(rawUrl(), { method: "GET" }, ms);
    if (!r.ok) throw new Error(`Файл недоступен (${r.status})`);
    return parseCatalog(await r.text());
  }
  async function apiGet() {
    const r = await timed(`${apiUrl()}?ref=${encodeURIComponent(cfg.branch)}&cb=${now()}`, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" } });
    if (r.status === 404) return { sha: null, db: null };
    if (r.status === 401) throw new Error("Токен недействителен");
    if (r.status === 403) throw new Error("Нет прав или лимит запросов");
    if (!r.ok) throw new Error(`GitHub ответил ${r.status}`);
    const j = await r.json();
    let d = null;
    try {
      const bin = atob(String(j.content || "").replace(/\s/g, ""));
      d = parseCatalog(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    } catch {}
    return { sha: j.sha, db: d };
  }
  async function apiPut(d, sha, message) {
    const body = { message, content: b64(serialize(d)), branch: cfg.branch };
    if (sha) body.sha = sha;
    const r = await timed(apiUrl(), {
      method: "PUT",
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }, 15000);
    if (r.status === 401) throw new Error("Токен недействителен");
    if (r.status === 403) throw new Error("У токена нет права Contents: Read and write");
    if (r.status === 404) throw new Error("Репозиторий или ветка не найдены");
    if (r.status === 409) throw new Error("Конфликт версий");
    if (!r.ok) throw new Error(`Запись отклонена (${r.status})`);
    return r.json();
  }

  async function push(force) {
    if (!canWrite() || pushing) return;
    const local = readLocal();
    if (!valid(local)) return note("Нечего отправлять: база пуста", "warn");
    pushing = true; setStatus("syncing");
    try {
      let { sha, db: remote } = await apiGet();
      if (remote && cfg.strict && !force && stamp(remote) > stamp(local)) {
        pushing = false; setStatus("warn", "В репозитории более новая версия");
        note("Отправка остановлена: удалённая база новее", "warn");
        if (confirm("В репозитории база новее вашей локальной. Перезаписать её вашей версией?")) return push(true);
        return;
      }
      local.meta = local.meta || {};
      local.meta.updatedAt = new Date().toISOString();
      writeLocal(local);
      const counts = `${local.devices.length} устр. / ${local.coils.length} картр.`;
      try { await apiPut(local, sha, `V&H: обновление каталога · ${counts}`); }
      catch (e) {
        if (/Конфликт/.test(e.message)) { const a = await apiGet(); await apiPut(local, a.sha, `V&H: обновление каталога · ${counts}`); }
        else throw e;
      }
      setStatus("ok"); note(`Отправлено · ${counts}`, "ok");
    } catch (e) { setStatus("error", e.message); note(`Ошибка отправки: ${e.message}`, "err"); }
    finally { pushing = false; }
  }
  function queuePush() {
    if (!canWrite() || !cfg.autoPush || suppress) return;
    clearTimeout(pushTimer); setStatus("dirty");
    pushTimer = setTimeout(() => push(false), 1600);
  }

  const editing = () => {
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    const lb = $("lightbox"); if (lb && !lb.hidden) return true;
    const lo = $("loginOverlay"); if (lo && getComputedStyle(lo).display !== "none") return true;
    return false;
  };
  function rememberPlace() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ y: scrollY, tab: document.querySelector(".tab.active")?.dataset.tab || "", at: now() })); } catch {}
  }
  function restorePlace() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STATE_KEY);
      const s = JSON.parse(raw);
      if (now() - (s.at || 0) > 15000) return;
      if (s.tab) document.querySelector(`.tab[data-tab="${CSS.escape(s.tab)}"]`)?.click();
      requestAnimationFrame(() => scrollTo({ top: s.y || 0 }));
    } catch {}
  }
  function applyRemote(d, quiet) {
    writeLocal(d);
    lastSync = now();
    note(`Получена база · ${d.devices.length} устр. / ${d.coils.length} картр.`, "ok");
    if (quiet) return;
    if ($("btRoot")) { toast("Каталог обновлён", { label: "Обновить страницу", fn: () => { rememberPlace(); location.reload(); } }); return; }
    rememberPlace(); location.reload();
  }
  function offerRemote(d) {
    pending = d;
    toast("Каталог обновлён в репозитории", { label: "Применить", fn: () => { clearTimeout(applyTimer); const x = pending; pending = null; if (x) applyRemote(x); } });
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      if (!pending) return;
      if (editing()) return offerRemote(pending);
      const x = pending; pending = null; applyRemote(x);
    }, 9000);
  }

  async function pull(initial) {
    if (!canRead() || document.hidden) return;
    if (!initial && !cfg.autoPull) return;
    if (!initial) setStatus("syncing");
    try {
      const remote = await fetchRemote(initial ? 6000 : 9000);
      const local = readLocal();
      if (!valid(local)) { applyRemote(remote, true); setStatus("ok"); return; }
      const rs = stamp(remote), ls = stamp(local);
      if (rs > ls) { initial ? (applyRemote(remote, true), setStatus("ok")) : (setStatus("ok"), offerRemote(remote)); return; }
      setStatus("ok");
      if (ls > rs && canWrite() && cfg.autoPush) queuePush();
    } catch (e) {
      if (!navigator.onLine) { setStatus("offline", "Нет сети"); }
      else { setStatus(initial ? "local" : "error", e.message); if (!initial) note(`Проверка не удалась: ${e.message}`, "err"); }
    }
  }
  function watch() {
    clearInterval(pullTimer);
    if (!canRead() || !cfg.autoPull) return;
    pullTimer = setInterval(() => pull(false), clamp(Number(cfg.interval) || 120, 30, 600) * 1000);
  }

  const origSet = localStorage.setItem.bind(localStorage);
  const origDel = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function (k, v) { origSet(k, v); if (k === DB_KEY && !suppress) queuePush(); };
  localStorage.removeItem = function (k) { origDel(k); if (k === DB_KEY && !suppress) queuePush(); };

  let toastTimer = 0;
  function toast(text, action) {
    let n = $("vhCloudToast");
    if (!n) { n = document.createElement("div"); n.id = "vhCloudToast"; n.className = "toast"; n.style.bottom = "88px"; document.body.appendChild(n); }
    n.innerHTML = `<span>${esc(text)}</span>` + (action ? `<button class="toast-btn" type="button">${esc(action.label)}</button>` : "");
    if (action) n.querySelector("button").addEventListener("click", () => { action.fn(); n.classList.remove("show"); });
    n.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.classList.remove("show"), action ? 9000 : 3000);
  }

  function styles() {
    if ($("vhCloudStyles")) return;
    const s = document.createElement("style");
    s.id = "vhCloudStyles";
    s.textContent = `
      .cl-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;border:1px solid var(--border,#2b3037);
        background:var(--card,#121418);color:var(--muted,#8b929b);font:800 11px/1 system-ui,sans-serif;letter-spacing:.06em;
        text-transform:uppercase;cursor:pointer;flex-shrink:0;transition:.2s}
      .cl-pill:hover{border-color:var(--border-strong,#454c55);color:var(--text,#f4f6f8)}
      .cl-pill i{width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0}
      .cl-pill[data-s="ok"]{color:var(--text,#f4f6f8);border-color:var(--border-strong,#454c55)}
      .cl-pill[data-s="syncing"] i,.cl-pill[data-s="dirty"] i{animation:clSpin .9s linear infinite;border-radius:2px}
      .cl-pill[data-s="error"],.cl-pill[data-s="warn"]{border-style:dashed}
      @keyframes clSpin{to{transform:rotate(360deg)}}
      .cl-panel{border:1px solid var(--border,#2b3037);border-radius:20px;background:var(--card,#121418);padding:18px;margin-bottom:18px}
      .cl-top{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px}
      .cl-h{margin:0;font-size:17px;font-weight:900}
      .cl-sub{margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--muted,#8b929b);max-width:74ch}
      .cl-state{font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;padding:6px 11px;border-radius:999px;
        border:1px solid var(--border,#2b3037);background:var(--card2,#191c21)}
      .cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:12px}
      .cl-f label{display:block;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#8b929b);margin-bottom:6px}
      .cl-f input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border,#2b3037);background:var(--bg,#08090b);color:var(--text,#f4f6f8);font:inherit;font-size:13px}
      .cl-token{display:flex;gap:8px}
      .cl-token input{flex:1;min-width:0;font-family:ui-monospace,Menlo,monospace;font-size:12px}
      .cl-eye{padding:0 12px;border-radius:10px;border:1px solid var(--border,#2b3037);background:var(--card2,#191c21);color:var(--text,#f4f6f8);cursor:pointer}
      .cl-row{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:12px}
      .cl-tg{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:700;color:var(--muted,#8b929b)}
      .cl-tg button{width:34px;height:19px;border-radius:99px;padding:2px;border:1px solid var(--border,#2b3037);background:var(--card2,#191c21);cursor:pointer}
      .cl-tg button i{display:block;width:13px;height:13px;border-radius:50%;background:var(--muted,#8b929b);transition:.2s}
      .cl-tg button[aria-checked=true]{background:var(--accent,#fff);border-color:var(--accent,#fff)}
      .cl-tg button[aria-checked=true] i{transform:translateX(15px);background:var(--ink,#08090b)}
      .cl-int{display:flex;align-items:center;gap:10px;min-width:230px;flex:1}
      .cl-int span{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#8b929b)}
      .cl-int b{font-size:12px;min-width:52px;text-align:right}
      .cl-int input[type=range]{-webkit-appearance:none;appearance:none;flex:1;height:18px;background:none;cursor:pointer;margin:0}
      .cl-int input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:99px;background:var(--border-strong,#454c55)}
      .cl-int input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;margin-top:-5.5px;border-radius:50%;background:var(--accent,#fff);border:2px solid var(--bg,#08090b)}
      .cl-acts{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:12px}
      .cl-b{padding:10px 15px;border-radius:11px;font:800 12.5px/1 system-ui,sans-serif;cursor:pointer;border:1px solid var(--border-strong,#454c55);background:var(--card2,#191c21);color:var(--text,#f4f6f8)}
      .cl-b:hover{border-color:var(--accent,#fff)}
      .cl-b:disabled{opacity:.5;cursor:default}
      .cl-b.primary{background:var(--accent,#fff);color:var(--ink,#08090b);border-color:var(--accent,#fff)}
      .cl-log{max-height:150px;overflow-y:auto;border:1px solid var(--border,#2b3037);border-radius:12px;background:var(--bg,#08090b);padding:10px 12px;
        scrollbar-width:thin;scrollbar-color:var(--border-strong,#454c55) transparent}
      .cl-log::-webkit-scrollbar{width:8px}
      .cl-log::-webkit-scrollbar-thumb{background:var(--border-strong,#454c55);border-radius:8px}
      .cl-li{display:flex;gap:10px;font-size:12px;line-height:1.5;padding:4px 0;border-top:1px solid var(--border,#2b3037)}
      .cl-li:first-child{border-top:0}
      .cl-li time{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:var(--muted2,#6a717a);flex-shrink:0}
      .cl-empty{font-size:12px;color:var(--muted2,#6a717a)}
      .cl-help{margin:12px 0 0;font-size:11.5px;line-height:1.65;color:var(--muted2,#6a717a)}
      @media (max-width:560px){.cl-acts .cl-b{flex:1 1 46%}.cl-pill span{display:none}.cl-pill{padding:8px}}
    `;
    document.head.appendChild(s);
  }

  const TEXT = { idle: "Готово", local: "Локально", syncing: "Обмен", dirty: "Правки", ok: "Синхронно", warn: "Конфликт", error: "Ошибка", offline: "Офлайн" };
  let pill = null;
  function buildPill() {
    if ($("vhCloudPill")) { pill = $("vhCloudPill"); return; }
    pill = document.createElement("button");
    pill.id = "vhCloudPill"; pill.type = "button"; pill.className = "cl-pill";
    pill.innerHTML = `<i></i><span></span>`;
    const bar = document.querySelector(".tabs"), acts = document.querySelector(".header-actions"), head = document.querySelector(".header"), sw = $("vhThemeSwitch");
    if (bar) { bar.insertBefore(pill, sw && sw.parentElement === bar ? sw : null); pill.style.marginLeft = "auto"; if (sw) sw.style.marginLeft = "8px"; }
    else if (acts) acts.insertBefore(pill, acts.firstChild);
    else if (head) { pill.style.marginLeft = "auto"; head.appendChild(pill); }
    else { pill.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9990"; document.body.appendChild(pill); }
    pill.addEventListener("click", () => {
      const p = $("vhCloudPanel");
      if (p) return p.scrollIntoView({ behavior: "smooth", block: "center" });
      pull(false).then(() => toast(lastError ? `Проверка: ${lastError}` : "Каталог проверен"));
    });
    paintPill();
  }
  function paintPill() {
    if (!pill) return;
    pill.dataset.s = status;
    const ago = lastSync ? Math.round((now() - lastSync) / 1000) : 0;
    pill.querySelector("span").textContent = (TEXT[status] || status) + (status === "ok" && ago > 5 ? ` · ${ago < 60 ? ago + "с" : Math.round(ago / 60) + "м"}` : "");
    pill.title = lastError || (canWrite() ? "Автоотправка включена" : canRead() ? "Автообновление включено" : "Репозиторий не определён");
  }
  setInterval(paintPill, 6000);

  let panel = null;
  function buildPanel() {
    const admin = $("admin");
    if (!admin || $("vhCloudPanel")) { panel = $("vhCloudPanel"); return; }
    panel = document.createElement("div");
    panel.id = "vhCloudPanel"; panel.className = "cl-panel";
    panel.innerHTML = `
      <div class="cl-top">
        <div><h2 class="cl-h">Автосинхронизация с GitHub</h2>
        <p class="cl-sub">Сохранения уходят в <code>data/catalog.js</code> сами. Каталог открывается мгновенно из локальной базы, обновления приходят фоном.</p></div>
        <span class="cl-state" id="clState"></span>
      </div>
      <div class="cl-grid">
        <div class="cl-f"><label for="clOwner">Владелец</label><input id="clOwner" spellcheck="false"></div>
        <div class="cl-f"><label for="clRepo">Репозиторий</label><input id="clRepo" spellcheck="false"></div>
        <div class="cl-f"><label for="clBranch">Ветка</label><input id="clBranch" spellcheck="false"></div>
        <div class="cl-f"><label for="clPath">Путь к базе</label><input id="clPath" spellcheck="false"></div>
      </div>
      <div class="cl-f" style="margin-bottom:12px"><label for="clToken">Токен доступа · только у вас</label>
        <div class="cl-token"><input id="clToken" type="password" spellcheck="false" autocomplete="off" placeholder="github_pat_…"><button class="cl-eye" id="clEye" type="button">👁</button></div>
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
      <p class="cl-help">Токен: GitHub → Settings → Developer settings → Fine-grained tokens → доступ только к этому репозиторию, право <b>Contents: Read and write</b>. Хранится только в этом браузере.</p>`;
    const first = admin.querySelector(".panel");
    admin.insertBefore(panel, first || admin.firstChild);

    const map = { clOwner: "owner", clRepo: "repo", clBranch: "branch", clPath: "path", clToken: "token" };
    Object.keys(map).forEach((id) => $(id).addEventListener("input", () => { cfg[map[id]] = $(id).value.trim(); saveCfg(); paintPanel(); }));
    $("clEye").addEventListener("click", () => { const i = $("clToken"); i.type = i.type === "password" ? "text" : "password"; $("clEye").textContent = i.type === "password" ? "👁" : "🚫"; });
    const tg = (id, key, after) => $(id).addEventListener("click", () => { cfg[key] = !cfg[key]; saveCfg(); paintPanel(); after && after(); });
    tg("clPushTg", "autoPush"); tg("clPullTg", "autoPull", watch); tg("clStrictTg", "strict");
    $("clInterval").addEventListener("input", (e) => { cfg.interval = Number(e.target.value); saveCfg(); paintPanel(); watch(); });
    $("clConnect").addEventListener("click", async () => { if (!canWrite()) return toast("Заполните репозиторий и токен"); saveCfg(); await push(true); watch(); });
    $("clSend").addEventListener("click", () => push(false));
    $("clGet").addEventListener("click", async () => {
      if (!canRead()) return toast("Укажите репозиторий");
      setStatus("syncing");
      try { applyRemote(await fetchRemote(9000)); } catch (e) { setStatus("error", e.message); note(`Не удалось забрать: ${e.message}`, "err"); }
    });
    $("clTest").addEventListener("click", async () => {
      if (!canWrite()) return toast("Нужен токен");
      setStatus("syncing");
      try {
        const r = await timed(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" } });
        if (r.status === 401) throw new Error("Токен недействителен");
        if (r.status === 404) throw new Error("Репозиторий не найден");
        if (!r.ok) throw new Error(`GitHub ответил ${r.status}`);
        const j = await r.json();
        setStatus("ok"); note(`Доступ есть: ${j.full_name}`, "ok");
      } catch (e) { setStatus("error", e.message); note(`Проверка доступа: ${e.message}`, "err"); }
    });
    $("clOff").addEventListener("click", () => { cfg.token = ""; saveCfg(); paintPanel(); setStatus(canRead() ? "ok" : "local"); note("Токен удалён", "warn"); });
    paintPanel(); paintLog();
  }
  function paintPanel() {
    if (!panel) return;
    const map = { clOwner: "owner", clRepo: "repo", clBranch: "branch", clPath: "path", clToken: "token" };
    Object.entries(map).forEach(([id, k]) => { const el = $(id); if (el && document.activeElement !== el) el.value = cfg[k] || ""; });
    [["clPushTg", "autoPush"], ["clPullTg", "autoPull"], ["clStrictTg", "strict"]].forEach(([id, k]) => $(id)?.setAttribute("aria-checked", String(!!cfg[k])));
    const iv = $("clInterval"); if (iv && document.activeElement !== iv) iv.value = String(cfg.interval);
    const ivv = $("clIntV"); if (ivv) ivv.textContent = `${cfg.interval} с`;
    const s = $("clState"); if (s) s.textContent = (TEXT[status] || status) + (lastError ? ` · ${lastError}` : "");
    const send = $("clSend"), conn = $("clConnect");
    if (send) send.disabled = !canWrite() || pushing;
    if (conn) conn.disabled = !canWrite() || pushing;
  }
  function paintLog() {
    const b = $("clLog"); if (!b) return;
    b.innerHTML = log.length
      ? log.map((l) => `<div class="cl-li"><time>${l.t.toLocaleTimeString("ru-RU")}</time><span>${esc(l.text)}</span></div>`).join("")
      : `<div class="cl-empty">Журнал обмена пуст.</div>`;
  }

  function loadScript(src) {
    return new Promise((res) => {
      if (!src) return res();
      const s = document.createElement("script");
      s.src = src; s.async = false; s.onload = res; s.onerror = res;
      document.body.appendChild(s);
    });
  }
  function appList() {
    const main = me?.dataset.app || ($("itemRoot") ? "js/item.js" : "js/app.js");
    const extra = (me?.dataset.extra || "").split(",").map((s) => s.trim()).filter(Boolean);
    return [main, ...extra];
  }

  window.VHCloud = { push: () => push(true), pull: () => pull(false), get status() { return status; } };

  /* ---------- НЕБЛОКИРУЮЩИЙ СТАРТ ---------- */
  (async () => {
    styles(); buildPill();
    for (const src of appList()) await loadScript(src);
    buildPanel(); restorePlace();
    note(canWrite() ? "Автосинхронизация активна" : canRead() ? "Автообновление активно" : "Работа локально", canRead() ? "ok" : "warn");
    window.VHPerf ? window.VHPerf.idle(() => pull(true), 1200) : setTimeout(() => pull(true), 300);
    watch();
  })();

  document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(false); });
  window.addEventListener("online", () => { note("Сеть восстановлена", "ok"); pull(false); queuePush(); });
  window.addEventListener("offline", () => setStatus("offline", "Нет сети"));
  window.addEventListener("pagehide", () => { clearInterval(pullTimer); clearTimeout(pushTimer); clearTimeout(applyTimer); });
})();
