(() => {
  "use strict";

  if (document.getElementById("vhVaper")) return;
  const host = document.getElementById("catalog");
  if (!host) return;

  const KEY = "vh_vaper_v1";
  const DEF = {
    preset: "RDL", ohm: 0.6, watt: 28, density: 60, cloud: 110,
    speed: 1, wind: 12, glow: 70, scale: 100, light: false, paused: false
  };
  const PRESETS = {
    MTL: { ohm: 1.0, watt: 12, density: 34, cloud: 72 },
    RDL: { ohm: 0.6, watt: 28, density: 60, cloud: 112 },
    DTL: { ohm: 0.2, watt: 65, density: 86, cloud: 168 }
  };
  const PAL = {
    dark:  { bg1:"#0b0c0e", bg2:"#171a1f", fig:"#191c22", line:"#f2f4f7", soft:"#79808b", dev:"#f2f4f7", screen:"#0a0b0d", led:"#ffffff", vap:"255,255,255" },
    light: { bg1:"#ffffff", bg2:"#e8ebef", fig:"#f5f7f9", line:"#0d0f13", soft:"#6b7280", dev:"#15181d", screen:"#f2f4f7", led:"#0d0f13", vap:"26,29,34" }
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));

  let S = Object.assign({}, DEF);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = Object.assign(S, JSON.parse(raw));
  } catch {}
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) S.paused = true;

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const pal = () => (S.light ? PAL.light : PAL.dark);
  const intensity = () => clamp((S.watt / 40) * (0.6 / Math.max(0.12, S.ohm)), 0.14, 2.3);

  /* ================= РАЗМЕТКА ================= */
  const hero = document.createElement("section");
  hero.id = "vhVaper";
  hero.className = "vh-hero";
  hero.innerHTML = `
    <div class="vh-top">
      <div>
        <div class="vh-kicker">V&amp;H · тренажёр затяжки</div>
        <h2 class="vh-title">Как Ω и мощность меняют пар</h2>
        <p class="vh-sub">Ниже сопротивление и выше мощность — плотнее облако и свободнее затяжка. Выше сопротивление и ниже мощность — тугая MTL и экономный расход. Крути ползунки: персонаж парит по-настоящему.</p>
      </div>
      <div class="vh-age">18+</div>
    </div>

    <div class="vh-stage" id="vhStage" title="Клик по сцене — затяжка">
      <svg id="vhSvg" viewBox="0 0 520 420" preserveAspectRatio="xMidYMid meet" aria-label="Анимированный вейпер с POD-устройством">
        <defs>
          <radialGradient id="vhLedGrad">
            <stop offset="0%" stop-color="#fff" stop-opacity=".95"/>
            <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <g id="vhRoot">
          <ellipse cx="262" cy="406" rx="126" ry="15" data-p="soft" data-paint="fill" opacity=".2"/>
          <g id="vhBody">
            <path d="M150,420 C150,332 176,286 216,268 L300,268 C344,286 370,332 370,420 Z" data-p="fig" data-paint="fill"/>
            <path d="M150,420 C150,332 176,286 216,268 L300,268 C344,286 370,332 370,420 Z" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
            <path d="M214,272 C198,244 202,214 226,200 L298,200 C322,214 326,246 310,272 Z" data-p="fig" data-paint="fill"/>
            <path d="M214,272 C198,244 202,214 226,200 L298,200 C322,214 326,246 310,272 Z" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
            <path d="M244,276 L240,330" fill="none" data-p="soft" data-paint="stroke" stroke-width="4" stroke-linecap="round"/>
            <path d="M272,276 L278,326" fill="none" data-p="soft" data-paint="stroke" stroke-width="4" stroke-linecap="round"/>
            <path d="M196,352 C230,338 292,338 326,352" fill="none" data-p="soft" data-paint="stroke" stroke-width="3" opacity=".7"/>
          </g>
          <g id="vhHead">
            <rect x="248" y="196" width="44" height="58" rx="16" data-p="fig" data-paint="fill"/>
            <rect x="248" y="196" width="44" height="58" rx="16" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
            <path d="M226,92 C268,86 300,112 304,148 C306,162 300,170 302,178 C304,186 296,190 296,196 C296,206 286,214 272,216 L246,216 C220,214 206,194 206,166 C204,128 208,98 226,92 Z" data-p="fig" data-paint="fill"/>
            <path d="M226,92 C268,86 300,112 304,148 C306,162 300,170 302,178 C304,186 296,190 296,196 C296,206 286,214 272,216 L246,216 C220,214 206,194 206,166 C204,128 208,98 226,92 Z" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
            <path d="M204,142 C206,104 228,82 258,82 C292,82 312,106 312,140 L306,150 C288,132 248,126 210,150 Z" data-p="fig" data-paint="fill"/>
            <path d="M204,142 C206,104 228,82 258,82 C292,82 312,106 312,140 L306,150 C288,132 248,126 210,150 Z" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
            <path d="M208,146 C246,126 288,130 308,148" fill="none" data-p="soft" data-paint="stroke" stroke-width="4"/>
            <path d="M240,168 C232,166 230,178 238,182" fill="none" data-p="soft" data-paint="stroke" stroke-width="3"/>
            <ellipse id="vhEye" cx="280" cy="160" rx="5" ry="6.5" data-p="line" data-paint="fill"/>
            <path d="M268,146 L292,143" fill="none" data-p="line" data-paint="stroke" stroke-width="4" stroke-linecap="round"/>
            <path id="vhMouth" d="M286,193 C292,196 297,196 301,192" fill="none" data-p="line" data-paint="stroke" stroke-width="3" stroke-linecap="round"/>
          </g>
          <g id="vhArmG">
            <path id="vhArmOuter" fill="none" data-p="line" data-paint="stroke" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
            <path id="vhArmInner" fill="none" data-p="fig" data-paint="stroke" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
            <circle id="vhHand" r="15" data-p="fig" data-paint="fill"/>
            <circle id="vhHandLine" r="15" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
            <g id="vhDevice">
              <circle id="vhGlow" cx="0" cy="-16" r="20" fill="url(#vhLedGrad)" opacity="0"/>
              <rect x="-13" y="-58" width="26" height="62" rx="7" data-p="dev" data-paint="fill"/>
              <rect x="-8" y="-46" width="16" height="22" rx="3" data-p="screen" data-paint="fill"/>
              <rect x="-6" y="-65" width="12" height="9" rx="3" data-p="soft" data-paint="fill"/>
              <circle id="vhLed" cx="0" cy="-16" r="3.4" data-p="led" data-paint="fill"/>
            </g>
          </g>
        </g>
      </svg>
      <canvas id="vhCanvas"></canvas>
      <div class="vh-hint">Клик по сцене — затяжка</div>
    </div>

    <div class="vh-readouts" id="vhRead"></div>

    <div class="vh-controls">
      <div class="vh-ctl">
        <label for="vhPreset">Тип затяжки</label>
        <select id="vhPreset">
          <option value="MTL">MTL · тугая</option>
          <option value="RDL">RDL · средняя</option>
          <option value="DTL">DTL · свободная</option>
          <option value="CUSTOM">Свой режим</option>
        </select>
      </div>
      <div class="vh-ctl"><label for="vhOhm">Сопротивление <b id="vhOhmV"></b></label><input id="vhOhm" type="range" min="0.15" max="1.4" step="0.05"></div>
      <div class="vh-ctl"><label for="vhWatt">Мощность <b id="vhWattV"></b></label><input id="vhWatt" type="range" min="5" max="80" step="1"></div>
      <div class="vh-ctl"><label for="vhDensity">Плотность пара <b id="vhDensityV"></b></label><input id="vhDensity" type="range" min="0" max="100" step="1"></div>
      <div class="vh-ctl"><label for="vhCloud">Размер облака <b id="vhCloudV"></b></label><input id="vhCloud" type="range" min="40" max="200" step="1"></div>
      <div class="vh-ctl"><label for="vhSpeed">Скорость <b id="vhSpeedV"></b></label><input id="vhSpeed" type="range" min="0.4" max="2" step="0.05"></div>
      <div class="vh-ctl"><label for="vhWind">Поток воздуха <b id="vhWindV"></b></label><input id="vhWind" type="range" min="-100" max="100" step="1"></div>
      <div class="vh-ctl"><label for="vhGlowR">Свечение LED <b id="vhGlowV"></b></label><input id="vhGlowR" type="range" min="0" max="100" step="1"></div>
      <div class="vh-ctl"><label for="vhScale">Масштаб <b id="vhScaleV"></b></label><input id="vhScale" type="range" min="70" max="130" step="1"></div>
      <div class="vh-ctl vh-switch">
        <label for="vhLight">Инверсия сцены</label>
        <button id="vhLight" class="vh-toggle" type="button" role="switch"><i></i><span></span></button>
      </div>
    </div>

    <div class="vh-actions">
      <button id="vhPuff" class="vh-btn vh-primary" type="button">Затянуться</button>
      <button id="vhPause" class="vh-btn" type="button">Пауза</button>
      <button id="vhRandom" class="vh-btn" type="button">Случайно</button>
      <button id="vhReset" class="vh-btn" type="button">Сброс</button>
      <button id="vhExport" class="vh-btn" type="button">Скачать PNG</button>
    </div>
  `;
  host.insertBefore(hero, host.firstChild);

  /* ================= СТИЛИ ================= */
  const style = document.createElement("style");
  style.id = "vhVaperStyles";
  style.textContent = `
    .vh-hero{
      --vbg1:${PAL.dark.bg1}; --vbg2:${PAL.dark.bg2};
      position:relative; margin-bottom:20px; overflow:hidden;
      border:1px solid var(--border,#2a2a2a); border-radius:22px;
      background:
        radial-gradient(70% 60% at 18% 0%, rgba(255,255,255,.09), transparent 60%),
        radial-gradient(60% 60% at 88% 20%, rgba(255,255,255,.06), transparent 62%),
        linear-gradient(160deg, var(--vbg2), var(--vbg1));
      box-shadow:0 20px 50px rgba(0,0,0,.45);
      animation:vhIn .6s cubic-bezier(.2,.7,.2,1) both;
    }
    .vh-hero.is-light{ --vbg1:#ffffff; --vbg2:#e8ebef; color:#0d0f13; border-color:#c9ced6; }
    .vh-hero.is-light .vh-sub,.vh-hero.is-light .vh-kicker,.vh-hero.is-light .vh-ctl label{color:#5b626c}
    .vh-hero.is-light .vh-chip{background:#f3f5f8;border-color:#d3d8e0;color:#22262c}
    .vh-hero.is-light .vh-ctl select,.vh-hero.is-light .vh-btn{background:#f3f5f8;border-color:#d3d8e0;color:#14171b}
    .vh-hero.is-light .vh-controls{border-top-color:#d8dce3}
    .vh-hero.is-light .vh-hint{background:rgba(255,255,255,.85);color:#3a4048;border-color:#d3d8e0}
    @keyframes vhIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    .vh-hero::after{
      content:"";position:absolute;inset:0;pointer-events:none;opacity:.05;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    .vh-top{position:relative;z-index:2;display:flex;gap:16px;justify-content:space-between;align-items:flex-start;padding:20px 20px 0}
    .vh-kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:800;color:var(--muted,#8f8f8f)}
    .vh-title{margin:8px 0 6px;font-size:clamp(20px,2.6vw,30px);font-weight:900;letter-spacing:-.02em}
    .vh-sub{margin:0;max-width:70ch;font-size:13px;line-height:1.6;color:var(--muted,#8f8f8f)}
    .vh-age{flex-shrink:0;border:1px solid currentColor;border-radius:999px;padding:6px 11px;font-size:12px;font-weight:900;opacity:.75}
    .vh-stage{position:relative;z-index:1;height:clamp(250px,34vw,392px);margin-top:10px;cursor:pointer}
    .vh-stage svg,.vh-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .vh-stage canvas{pointer-events:none;z-index:2}
    .vh-hint{position:absolute;left:16px;bottom:12px;z-index:3;font-size:11px;font-weight:700;letter-spacing:.04em;
      padding:6px 11px;border-radius:999px;border:1px solid var(--border,#2a2a2a);
      background:rgba(10,11,13,.7);color:var(--muted,#8f8f8f);backdrop-filter:blur(6px);pointer-events:none}
    .vh-readouts{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:8px;padding:4px 20px 14px}
    .vh-chip{display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:700;
      padding:6px 11px;border-radius:999px;border:1px solid var(--border,#2a2a2a);
      background:var(--card2,#1a1a1a);color:var(--accent2,#cfcfcf)}
    .vh-chip b{font-weight:900;color:inherit}
    .vh-controls{position:relative;z-index:2;display:grid;gap:14px;
      grid-template-columns:repeat(auto-fit,minmax(186px,1fr));
      padding:16px 20px;border-top:1px solid var(--border,#2a2a2a)}
    .vh-ctl label{display:flex;justify-content:space-between;gap:8px;align-items:baseline;
      font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#8f8f8f);margin-bottom:7px}
    .vh-ctl label b{font-size:12px;font-weight:900;color:var(--text,#f2f2f2);font-variant-numeric:tabular-nums}
    .vh-hero.is-light .vh-ctl label b{color:#14171b}
    .vh-ctl select{width:100%;padding:9px 11px;border-radius:10px;font:inherit;font-size:13px;font-weight:700;
      background:var(--card,#121212);color:var(--text,#f2f2f2);border:1px solid var(--border,#2a2a2a)}
    .vh-ctl input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:22px;background:transparent;cursor:pointer;margin:0}
    .vh-ctl input[type=range]::-webkit-slider-runnable-track{height:5px;border-radius:99px;background:linear-gradient(90deg,#8b9199,#2c3037)}
    .vh-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;margin-top:-6px;border-radius:50%;
      background:#fff;border:2px solid #0b0c0e;box-shadow:0 0 0 1px #fff,0 3px 8px rgba(0,0,0,.5);transition:transform .15s}
    .vh-ctl input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.16)}
    .vh-ctl input[type=range]::-moz-range-track{height:5px;border-radius:99px;background:#3a3f47}
    .vh-ctl input[type=range]::-moz-range-progress{height:5px;border-radius:99px;background:#fff}
    .vh-ctl input[type=range]::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:#fff;border:2px solid #0b0c0e}
    .vh-hero.is-light input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(90deg,#22262c,#c3c9d2)}
    .vh-hero.is-light input[type=range]::-webkit-slider-thumb{background:#14171b;border-color:#fff;box-shadow:0 0 0 1px #14171b}
    .vh-switch{display:flex;flex-direction:column}
    .vh-toggle{display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:999px;cursor:pointer;
      border:1px solid var(--border,#2a2a2a);background:var(--card,#121212);color:var(--text,#f2f2f2);font:inherit;font-size:12px;font-weight:800}
    .vh-toggle i{width:32px;height:18px;border-radius:99px;background:#3a3f47;position:relative;transition:.2s;flex-shrink:0}
    .vh-toggle i::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:.2s}
    .vh-toggle[aria-checked=true] i{background:#fff}
    .vh-toggle[aria-checked=true] i::after{left:16px;background:#0b0c0e}
    .vh-actions{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:9px;padding:0 20px 20px}
    .vh-btn{padding:10px 15px;border-radius:11px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;
      border:1px solid var(--border-strong,#4a4a4a);background:var(--card2,#1a1a1a);color:var(--text,#f2f2f2);transition:.18s}
    .vh-btn:hover{transform:translateY(-1px);border-color:#fff}
    .vh-primary{background:#fff;color:#0a0a0a;border-color:#fff}
    .vh-primary:hover{background:#d6d9de}
    .vh-hero.is-light .vh-primary{background:#14171b;color:#fff;border-color:#14171b}
    @media (max-width:560px){
      .vh-top{flex-direction:column}
      .vh-controls{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));padding:14px}
      .vh-readouts,.vh-actions{padding-left:14px;padding-right:14px}
      .vh-actions .vh-btn{flex:1 1 44%}
    }
    @media (prefers-reduced-motion:reduce){.vh-hero{animation:none}}
  `;
  document.head.appendChild(style);

  /* ================= ССЫЛКИ ================= */
  const $ = (id) => document.getElementById(id);
  const stage = $("vhStage"), svg = $("vhSvg"), cv = $("vhCanvas");
  const ctx = cv.getContext("2d", { alpha: true });
  const root = $("vhRoot"), body = $("vhBody"), head = $("vhHead");
  const armO = $("vhArmOuter"), armI = $("vhArmInner");
  const hand = $("vhHand"), handL = $("vhHandLine"), dev = $("vhDevice");
  const led = $("vhLed"), glow = $("vhGlow"), eye = $("vhEye"), mouth = $("vhMouth");

  const SHOULDER = { x: 300, y: 278 };
  const IDLE = { ex: 344, ey: 352, hx: 352, hy: 318, rot: 26 };
  const VAPE = { ex: 334, ey: 306, hx: 306, hy: 246, rot: -4 };
  const MOUTH = { x: 300, y: 190 };

  /* ================= ПАЛИТРА ================= */
  function paint() {
    const p = pal();
    hero.classList.toggle("is-light", !!S.light);
    hero.style.setProperty("--vbg1", p.bg1);
    hero.style.setProperty("--vbg2", p.bg2);
    svg.querySelectorAll("[data-p]").forEach((n) => {
      n.setAttribute(n.dataset.paint, p[n.dataset.p] || p.line);
    });
    buildSprite();
  }

  /* ================= СПРАЙТ ПАРА ================= */
  let sprite = document.createElement("canvas");
  function buildSprite() {
    const s = 128;
    sprite.width = sprite.height = s;
    const c = sprite.getContext("2d");
    c.clearRect(0, 0, s, s);
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    const rgb = pal().vap;
    g.addColorStop(0, `rgba(${rgb},.95)`);
    g.addColorStop(0.45, `rgba(${rgb},.42)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.beginPath(); c.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); c.fill();
  }

  /* ================= ЧАСТИЦЫ ================= */
  const CAP = 300;
  const pool = [];
  let emitAcc = 0;

  function spawn(mx, my, k) {
    let p = null;
    for (let i = 0; i < pool.length; i++) if (!pool[i].on) { p = pool[i]; break; }
    if (!p) { if (pool.length >= CAP) return; p = {}; pool.push(p); }
    const I = intensity();
    const cl = S.cloud / 100;
    p.on = true; p.age = 0;
    p.life = rnd(1.5, 2.3) + I * 1.2;
    p.x = mx + rnd(-5, 5) * k;
    p.y = my + rnd(-4, 4) * k;
    p.vx = (30 + I * 60) * k * rnd(0.55, 1.15);
    p.vy = -(16 + I * 26) * k * rnd(0.5, 1.1);
    p.r0 = (5 + I * 7) * k * cl;
    p.gr = (24 + I * 46) * k * cl;
    p.a0 = 0.13 + (S.density / 100) * 0.24;
    p.seed = Math.random() * 6.28;
  }

  function stepParticles(dt, k) {
    const wind = S.wind * 0.7 * k;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { p.on = false; continue; }
      p.vx += wind * dt + Math.sin(p.age * 2.6 + p.seed) * 11 * k * dt;
      p.vy -= 15 * k * dt;
      p.vx *= 0.992; p.vy *= 0.994;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = S.light ? "source-over" : "lighter";
    const dpr = DPR;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.on) continue;
      const t = p.age / p.life;
      const r = (p.r0 + p.gr * t) * dpr;
      const a = p.a0 * Math.sin(Math.PI * Math.min(1, t * 1.05));
      if (a <= 0.002 || r <= 0.4) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, p.x * dpr - r, p.y * dpr - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ================= РАЗМЕРЫ ================= */
  let W = 0, H = 0, DPR = 1, K = 1, OX = 0, OY = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const s = Math.min(W / 520, H / 420) * (S.scale / 100);
    K = s;
    OX = (W - 520 * s) / 2; OY = (H - 420 * s) / 2;
    if (!looping) drawParticles();
  }
  function mouthWorld() {
    const cx = 260, cy = 420, sc = S.scale / 100;
    const bx = cx + (MOUTH.x - cx) * sc, by = cy + (MOUTH.y - cy) * sc;
    const base = Math.min(W / 520, H / 420);
    return { x: (W - 520 * base) / 2 + bx * base, y: (H - 420 * base) / 2 + by * base };
  }

  /* ================= АНИМАЦИЯ ================= */
  const PH = ["rest", "raise", "inhale", "lower", "exhale"];
  let phase = 0, pt = 0, puffs = 0, blink = 0, nextBlink = rnd(2, 5);
  let looping = false, raf = 0, last = 0, visible = true, tilt = 0, tiltT = 0;

  function dur(i) {
    const I = intensity(), sp = S.speed;
    switch (PH[i]) {
      case "rest": return 2.1 / sp;
      case "raise": return 0.55 / sp;
      case "inhale": return (0.65 + I * 0.5) / sp;
      case "lower": return 0.45 / sp;
      default: return (0.9 + I * 1.05) / sp;
    }
  }
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  function pose() {
    const name = PH[phase];
    const t = clamp(pt / dur(phase), 0, 1);
    let m = 0;
    if (name === "raise") m = ease(t);
    else if (name === "inhale") m = 1;
    else if (name === "lower") m = 1 - ease(t);

    const ex = lerp(IDLE.ex, VAPE.ex, m), ey = lerp(IDLE.ey, VAPE.ey, m);
    const hx = lerp(IDLE.hx, VAPE.hx, m), hy = lerp(IDLE.hy, VAPE.hy, m);
    const rot = lerp(IDLE.rot, VAPE.rot, m);
    const d = `M${SHOULDER.x},${SHOULDER.y} L${ex.toFixed(1)},${ey.toFixed(1)} L${hx.toFixed(1)},${hy.toFixed(1)}`;
    armO.setAttribute("d", d); armI.setAttribute("d", d);
    hand.setAttribute("cx", hx); hand.setAttribute("cy", hy);
    handL.setAttribute("cx", hx); handL.setAttribute("cy", hy);
    dev.setAttribute("transform", `translate(${hx.toFixed(1)},${hy.toFixed(1)}) rotate(${rot.toFixed(1)})`);

    const I = intensity();
    let lit = 0.12;
    if (name === "inhale") lit = 0.55 + 0.45 * Math.abs(Math.sin(pt * 9));
    else if (name === "raise") lit = 0.3;
    else if (name === "exhale") lit = 0.2 * (1 - t);
    const g = S.glow / 100;
    led.setAttribute("opacity", (0.35 + lit * 0.65).toFixed(3));
    glow.setAttribute("opacity", (lit * g * 0.95).toFixed(3));
    glow.setAttribute("r", (14 + lit * 16 * g).toFixed(1));

    const breathe = 1 + Math.sin(performance.now() / 900) * 0.012;
    body.setAttribute("transform", `translate(260,420) scale(1,${breathe.toFixed(4)}) translate(-260,-420)`);
    const ht = name === "inhale" ? -4 : name === "exhale" ? 2.5 : 0;
    tilt += (ht - tilt) * 0.12;
    head.setAttribute("transform", `rotate(${tilt.toFixed(2)} 252 220)`);

    mouth.setAttribute("d", name === "exhale"
      ? "M287,190 C292,199 298,199 302,190"
      : "M286,193 C292,196 297,196 301,192");

    const sc = S.scale / 100;
    root.setAttribute("transform", `translate(${(260 + tiltT * 6).toFixed(2)},${(420).toFixed(2)}) scale(${sc}) translate(-260,-420)`);
    return name;
  }

  function frame(ts) {
    if (!looping) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000) || 0;
    last = ts;

    blink -= dt; nextBlink -= dt;
    if (nextBlink <= 0) { blink = 0.13; nextBlink = rnd(2.4, 6); }
    eye.setAttribute("ry", blink > 0 ? "0.9" : "6.5");

    tiltT += ((pointerT) - tiltT) * 0.06;

    const name = pose();
    pt += dt;

    if (name === "exhale") {
      const I = intensity();
      const rate = (9 + S.density * 0.62) * (0.45 + I * 0.85) * S.speed;
      emitAcc += rate * dt;
      const m = mouthWorld();
      let guard = 0;
      while (emitAcc >= 1 && guard++ < 14) { spawn(m.x, m.y, Math.min(W / 520, H / 420)); emitAcc -= 1; }
    } else emitAcc = 0;

    if (pt >= dur(phase)) {
      pt = 0;
      if (PH[phase] === "exhale") { puffs++; readouts(); }
      phase = (phase + 1) % PH.length;
    }

    stepParticles(dt, Math.min(W / 520, H / 420));
    drawParticles();
  }

  function start() {
    if (looping || S.paused || !visible || document.hidden) return;
    looping = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { looping = false; cancelAnimationFrame(raf); }
  function sync() { (S.paused || !visible || document.hidden) ? stop() : start(); }

  /* ================= ПОКАЗАТЕЛИ ================= */
  function readouts() {
    const I = intensity();
    const cloud = I < 0.45 ? "лёгкое" : I < 1.1 ? "среднее" : "плотное";
    const draw = S.ohm >= 0.9 ? "тугая MTL" : S.ohm >= 0.5 ? "полу-свободная" : "свободная DTL";
    const heat = S.watt < 20 ? "прохладный" : S.watt < 45 ? "тёплый" : "горячий";
    const ml = (0.6 + I * 2.4).toFixed(1);
    $("vhRead").innerHTML = [
      ["Ω", S.ohm.toFixed(2)], ["W", String(S.watt)],
      ["облако", cloud], ["затяжка", draw], ["пар", heat],
      ["расход", `${ml} мл / 100 затяжек`], ["затяжек", String(puffs)]
    ].map(([k, v]) => `<span class="vh-chip">${esc(k)} <b>${esc(v)}</b></span>`).join("");
  }

  /* ================= КОНТРОЛЫ ================= */
  const R = [
    ["vhOhm", "ohm", "vhOhmV", (v) => v.toFixed(2) + " Ω", true],
    ["vhWatt", "watt", "vhWattV", (v) => v + " W", true],
    ["vhDensity", "density", "vhDensityV", (v) => v + "%", false],
    ["vhCloud", "cloud", "vhCloudV", (v) => v + "%", false],
    ["vhSpeed", "speed", "vhSpeedV", (v) => v.toFixed(2) + "×", false],
    ["vhWind", "wind", "vhWindV", (v) => (v > 0 ? "→ " : v < 0 ? "← " : "") + Math.abs(v), false],
    ["vhGlowR", "glow", "vhGlowV", (v) => v + "%", false],
    ["vhScale", "scale", "vhScaleV", (v) => v + "%", false]
  ];

  function syncUI() {
    R.forEach(([id, key, out, fmt]) => {
      const el = $(id); el.value = S[key]; $(out).textContent = fmt(Number(S[key]));
    });
    $("vhPreset").value = S.preset;
    $("vhLight").setAttribute("aria-checked", String(!!S.light));
    $("vhLight").querySelector("span").textContent = S.light ? "Светлая" : "Тёмная";
    $("vhPause").textContent = S.paused ? "Продолжить" : "Пауза";
    readouts();
  }

  R.forEach(([id, key, out, fmt, core]) => {
    $(id).addEventListener("input", (e) => {
      S[key] = Number(e.target.value);
      $(out).textContent = fmt(S[key]);
      if (core) { S.preset = "CUSTOM"; $("vhPreset").value = "CUSTOM"; }
      if (key === "scale") resize();
      readouts(); save();
      if (!looping) { pose(); drawParticles(); }
    });
  });

  $("vhPreset").addEventListener("change", (e) => {
    const v = e.target.value;
    S.preset = v;
    if (PRESETS[v]) Object.assign(S, PRESETS[v]);
    syncUI(); resize(); save();
    if (!looping) { pose(); drawParticles(); }
  });

  $("vhLight").addEventListener("click", () => {
    S.light = !S.light; paint(); syncUI(); save();
    if (!looping) drawParticles();
  });

  function puffNow() {
    if (S.paused) { S.paused = false; syncUI(); }
    phase = 1; pt = 0; emitAcc = 0;
    sync();
  }
  $("vhPuff").addEventListener("click", puffNow);
  stage.addEventListener("click", puffNow);

  $("vhPause").addEventListener("click", () => { S.paused = !S.paused; syncUI(); save(); sync(); });

  $("vhRandom").addEventListener("click", () => {
    S.ohm = Math.round(rnd(0.15, 1.4) * 20) / 20;
    S.watt = Math.round(rnd(8, 78));
    S.density = Math.round(rnd(25, 95));
    S.cloud = Math.round(rnd(60, 190));
    S.wind = Math.round(rnd(-70, 70));
    S.glow = Math.round(rnd(20, 100));
    S.speed = Math.round(rnd(0.6, 1.7) * 20) / 20;
    S.preset = "CUSTOM";
    syncUI(); resize(); save(); puffNow();
  });

  $("vhReset").addEventListener("click", () => {
    S = Object.assign({}, DEF, { light: S.light, paused: false });
    pool.forEach((p) => p.on = false);
    puffs = 0; phase = 0; pt = 0;
    paint(); syncUI(); resize(); save(); sync();
  });

  $("vhExport").addEventListener("click", async () => {
    const btn = $("vhExport"), old = btn.textContent;
    btn.textContent = "Готовлю…"; btn.disabled = true;
    try {
      const w = 1200, h = 900;
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      const c = out.getContext("2d");
      const p = pal();
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, p.bg2); g.addColorStop(1, p.bg1);
      c.fillStyle = g; c.fillRect(0, 0, w, h);

      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", "1040"); clone.setAttribute("height", "808");
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      c.drawImage(img, 80, 60, 1040, 808);
      c.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, w, h);

      c.fillStyle = p.line;
      c.font = "900 44px system-ui, -apple-system, Segoe UI, sans-serif";
      c.fillText("V&H", 56, 76);
      c.font = "700 22px system-ui, -apple-system, Segoe UI, sans-serif";
      c.globalAlpha = 0.75;
      c.fillText(`${S.ohm.toFixed(2)} Ω · ${S.watt} W · ${S.preset}`, 56, 110);
      c.globalAlpha = 1;

      const a = document.createElement("a");
      a.download = `vh-vaper-${S.ohm.toFixed(2)}ohm-${S.watt}w.png`;
      a.href = out.toDataURL("image/png");
      a.click();
      btn.textContent = "Скачано ✓";
    } catch {
      btn.textContent = "Не удалось";
    }
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1600);
  });

  /* ================= ПАРАЛЛАКС / ЖИЗНЕННЫЙ ЦИКЛ ================= */
  let pointerT = 0;
  if (!reduced) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      pointerT = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
    });
    stage.addEventListener("pointerleave", () => { pointerT = 0; });
  }

  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  }, { threshold: 0.05 });
  io.observe(hero);

  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", () => { stop(); ro.disconnect(); io.disconnect(); });

  /* ================= СТАРТ ================= */
  paint(); syncUI(); resize(); pose();
  if (reduced) {
    const m = mouthWorld();
    for (let i = 0; i < 26; i++) {
      spawn(m.x + i * 5, m.y - i * 4, Math.min(W / 520, H / 420));
      const p = pool[pool.length - 1];
      if (p) { p.age = rnd(0.2, 1.2); p.x += rnd(0, 90); p.y -= rnd(0, 70); }
    }
    stepParticles(0.01, Math.min(W / 520, H / 420));
  }
  drawParticles();
  sync();
})();
