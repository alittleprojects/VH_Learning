(() => {
  "use strict";
  if (window.VHPerf) return;

  const de = document.documentElement;
  const DB = "vape_academy_catalog_v6";

  /* ---------- планировщик ---------- */
  let queue = [], rafId = 0;
  function flush() { rafId = 0; const q = queue; queue = []; for (const f of q) { try { f(); } catch {} } }
  const frame = (fn) => { queue.push(fn); if (!rafId) rafId = requestAnimationFrame(flush); };
  const idle = window.requestIdleCallback
    ? (fn, t) => requestIdleCallback(fn, { timeout: t || 400 })
    : (fn) => setTimeout(fn, 16);

  /* ---------- единый кэш базы ---------- */
  let raw, cache, rev = 0;
  function db() {
    let r = null;
    try { r = localStorage.getItem(DB); } catch {}
    if (r === raw && cache) return cache;
    raw = r; rev++;
    let d = null;
    try { d = r ? JSON.parse(r) : (window.CATALOG_DATA ? JSON.parse(JSON.stringify(window.CATALOG_DATA)) : null); } catch {}
    d = d || {};
    d.meta = d.meta || {};
    d.devices = Array.isArray(d.devices) ? d.devices : [];
    d.coils = Array.isArray(d.coils) ? d.coils : [];
    d.devices.forEach((x) => { x.coils = Array.isArray(x.coils) ? x.coils : []; x.price = Number(x.price || 0); x.type ||= "POD"; });
    d.coils.forEach((x) => { x.price = Number(x.price || 0); x.type ||= "картридж"; });
    cache = d;
    return cache;
  }

  let nT = 0;
  function notify() {
    clearTimeout(nT);
    nT = setTimeout(() => { db(); window.dispatchEvent(new CustomEvent("vh:db", { detail: { rev } })); }, 110);
  }
  const nSet = localStorage.setItem.bind(localStorage);
  const nDel = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function (k, v) { nSet(k, v); if (k === DB) notify(); };
  localStorage.removeItem = function (k) { nDel(k); if (k === DB) notify(); };
  window.addEventListener("storage", (e) => { if (e.key === DB) notify(); });
  document.addEventListener("visibilitychange", () => {
    window.dispatchEvent(new CustomEvent("vh:visibility", { detail: { hidden: document.hidden } }));
  });

  /* ---------- сеть ---------- */
  if (/\.github\.io$/i.test(location.hostname)) {
    ["https://raw.githubusercontent.com", "https://api.github.com"].forEach((h) => {
      const l = document.createElement("link");
      l.rel = "preconnect"; l.href = h; l.crossOrigin = "anonymous";
      document.head.appendChild(l);
    });
  }

  /* ---------- стили отдаются до первой отрисовки ---------- */
  const st = document.createElement("style");
  st.id = "btStyles";
  st.textContent = `
    html{scrollbar-width:thin;scrollbar-color:#fff #000}
    html::-webkit-scrollbar{width:13px;height:13px}
    html::-webkit-scrollbar-track{background:#000;border-left:1px solid #2a2a2a}
    html::-webkit-scrollbar-thumb{background:#fff;border:3px solid #000}
    html::-webkit-scrollbar-thumb:hover{background:#8a8a8a}
    :root[data-theme="light"]{scrollbar-color:#000 #fff}
    :root[data-theme="light"] ::-webkit-scrollbar-track{background:#fff;border-left:1px solid #d0d0d0}
    :root[data-theme="light"] ::-webkit-scrollbar-thumb{background:#000;border:3px solid #fff}
    :root[data-theme="light"] ::-webkit-scrollbar-thumb:hover{background:#6a6a6a}

    html.bt-boot #catalog{min-height:72vh}
    html.bt-boot #catalog>*{display:none!important}
    html.bt-boot #catalog::before{
      content:"ВЫБЕРИ\\A БРЕНД";display:block;white-space:pre-line;margin:0 0 26px;
      font:900 clamp(46px,9.2vw,112px)/.84 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
      letter-spacing:-.05em;text-transform:uppercase;color:var(--text,#fff)}
    html.bt-boot #catalog::after{
      content:"";display:block;height:262px;border-top:2px solid var(--border,#2a2a2a);
      background-image:repeating-linear-gradient(45deg,transparent 0 7px,rgba(128,128,128,.16) 7px 8px),
        linear-gradient(var(--card,#111),var(--card,#111));
      background-size:calc(20% - 10px) 100%,calc(20% - 10px) 100%;background-repeat:repeat-x,repeat-x;
      animation:btBootPulse 1.15s ease-in-out infinite}
    @keyframes btBootPulse{0%,100%{opacity:.34}50%{opacity:.8}}

    .bt-root{
      --bg:#000;--fg:#fff;--dim:#8c8c8c;--dim2:#5e5e5e;--line:#262626;--line2:#3d3d3d;
      --tile:#080808;--hatch:rgba(255,255,255,.055);
      --card:#fff;--cardfg:#000;--cardline:#000;--carddim:#5c5c5c;
      --invbg:#fff;--invfg:#000;--tabs:61px;--bar:66px;
      font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
      background:var(--bg);color:var(--fg);margin:-22px -22px 0;padding:22px 22px 0;
      border-top:2px solid var(--fg);overflow-x:clip;overflow-y:visible}
    :root[data-theme="light"] .bt-root{
      --bg:#fff;--fg:#000;--dim:#5c5c5c;--dim2:#8c8c8c;--line:#d6d6d6;--line2:#a8a8a8;
      --tile:#f2f2f2;--hatch:rgba(0,0,0,.06);--invbg:#000;--invfg:#fff}
    .bt-root *{box-sizing:border-box;border-radius:0}
    .bt-root button,.bt-root input,.bt-root select{font-family:inherit}
    .bt-root :focus-visible{outline:3px solid var(--fg);outline-offset:2px}
    .bt-root mark{background:var(--fg);color:var(--bg);padding:0 3px}
    .bt-root img{content-visibility:auto}

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

    .bt-head{margin-bottom:24px}
    .bt-head h2{margin:0;font-size:clamp(46px,9.2vw,112px);font-weight:900;line-height:.84;
      letter-spacing:-.05em;text-transform:uppercase}

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
    .bt-tile:active{transform:none;box-shadow:none}
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

    .bt-sechead{display:flex;align-items:center;gap:14px;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid var(--fg)}
    .bt-sechead h3{margin:0;font-size:15px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
    .bt-sechead span{margin-left:auto;font-size:10px;font-weight:900;letter-spacing:.14em;color:var(--dim)}

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

    .bt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(288px,1fr));gap:14px}
    .bt-card{position:relative;display:flex;flex-direction:column;background:var(--card);color:var(--cardfg);
      border:2px solid var(--cardline);text-decoration:none;overflow:hidden;
      content-visibility:auto;contain-intrinsic-size:288px 430px;
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
      font-size:11px;font-weight:900;letter-spacing:.16em;transition:.14s;white-space:nowrap}
    .bt-card:hover .bt-start{background:#fff;color:#000}

    .bt-list{display:flex;flex-direction:column;border:2px solid var(--fg)}
    .bt-row{display:flex;gap:14px;align-items:center;padding:11px 14px;background:var(--card);color:var(--cardfg);
      border-bottom:2px solid var(--cardline);text-decoration:none;transition:.14s;
      content-visibility:auto;contain-intrinsic-size:600px 82px}
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
      html.bt-boot #catalog{min-height:52vh}
      html.bt-boot #catalog::after{height:196px;background-size:calc(50% - 8px) 100%,calc(50% - 8px) 100%}
      .bt-root{margin:-14px -14px 0;padding:16px 14px 0}
      .bt-bar{position:static;padding:10px 0}
      .bt-search{min-width:100%;order:-1}
      .bt-cnt{margin-left:0;width:100%}
      .bt-sel{flex:1;max-width:none;min-width:0}
      .bt-brands{grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:9px}
      .bt-tile{min-height:196px;padding:15px 13px}
      .bt-tnum b{font-size:34px}
      .bt-grid{grid-template-columns:repeat(auto-fill,minmax(164px,1fr));gap:10px}
      .bt-card{contain-intrinsic-size:164px 330px}
      .bt-photo{height:158px}.bt-photo img{padding:12px}.bt-photo b{font-size:15px}
      .bt-cbody{padding:12px}.bt-ctitle{font-size:16px}.bt-cprice{font-size:14px}
      .bt-clinks{display:none}
      .bt-cfoot{flex-wrap:wrap;gap:7px}
      .bt-start{margin-left:0;width:100%;text-align:center;padding:11px}
      .bt-status{margin:26px -14px 0;padding:12px 14px;gap:9px}
      .bt-status span:nth-child(2){margin-left:0}
      .bt-rlinks{display:none}
    }
    @media (prefers-reduced-motion:reduce){
      .bt-tile,.bt-card,.bt-row{animation:none!important;transition:none!important}
      .bt-live i,html.bt-boot #catalog::after{animation:none}
    }
  `;
  document.head.appendChild(st);

  /* ---------- защита первого кадра ---------- */
  de.classList.add("bt-boot");
  let done = false, poll = 0;
  const guard = setTimeout(finish, 6000);
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(guard);
    cancelAnimationFrame(poll);
    de.classList.remove("bt-boot");
  }
  function check() {
    if (document.getElementById("btRoot")) return finish();
    poll = requestAnimationFrame(check);
  }
  window.addEventListener("vh:catalog-ready", finish);
  window.addEventListener("pageshow", (e) => { if (e.persisted) finish(); });
  const start = () => { if (!document.getElementById("catalog")) finish(); else check(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  function img(el, src) {
    if (!el || !src || el.getAttribute("src") === src) return;
    el.decoding = "async";
    el.loading = "lazy";
    el.src = src;
  }

  window.VHPerf = { db, frame, idle, img, finish, get rev() { db(); return rev; } };
  window.__btReady = finish;
})();
