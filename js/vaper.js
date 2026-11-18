(() => {
  "use strict";

  if (document.getElementById("vhFace")) return;
  const host = document.getElementById("catalog");
  if (!host) return;

  const KEY = "vh_face_v1";
  const DEF = {
    mood: "strict", size: 100, speech: 1, gaze: 55,
    scan: 60, grain: 45, glow: 45, light: false, track: true, auto: true
  };
  const LINES = [
    "Эй, брат, документы есть? Подтверди, что тебе есть 18, и проходи.",
    "Спокойно, я тут для вида. Каталог рядом — листай, никто не держит.",
    "Восемнадцать есть? Тогда без вопросов. Нет — только чай и разговоры.",
    "Паспорт не мни, брат. Я и так почти верю.",
    "Тут учат подбирать картриджи. Мне бы так разбираться в людях.",
    "Стой. Шучу. Проходи, я сегодня добрый.",
    "Документы… а, ладно. У нас обучение, а не ночной клуб.",
    "Смотри мне: XROS к XROS, Armour к Armour. Это я запомнил."
  ];
  const MOODS = {
    calm:    { brow: 0,  smirk: 0.2, tilt: 0,  label: "Спокойный" },
    strict:  { brow: -9, smirk: -0.5, tilt: -3, label: "Строгий" },
    kind:    { brow: 5,  smirk: 1,   tilt: 2,  label: "Добрый" },
    suspect: { brow: -4, smirk: -0.2, tilt: -7, label: "Подозрительный" }
  };
  const PAL = {
    dark:  { bg1:"#0b0c0e", bg2:"#171a1f", fig:"#14171c", line:"#f2f4f7", soft:"#79808b", shirt:"#f2f4f7", glass:"#08090b", metal:"#cfd4da" },
    light: { bg1:"#ffffff", bg2:"#e7eaee", fig:"#f4f6f9", line:"#0d0f13", soft:"#6b7280", shirt:"#ffffff", glass:"#14171b", metal:"#4a5058" }
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));

  let S = Object.assign({}, DEF);
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch {}
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) S.auto = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const pal = () => (S.light ? PAL.light : PAL.dark);

  /* ================= РАСКЛАДКА ================= */
  const layout = document.createElement("div");
  layout.className = "fc-layout";
  const mainCol = document.createElement("div");
  mainCol.className = "fc-main";
  [...host.children].filter((n) => n.id !== "vhVaper").forEach((n) => mainCol.appendChild(n));

  const rail = document.createElement("aside");
  rail.id = "vhFace";
  rail.className = "fc-rail";
  rail.innerHTML = `
    <div class="fc-card">
      <div class="fc-head">
        <span class="fc-kicker">Фейс-контроль</span>
        <span class="fc-18">18+</span>
      </div>

      <div class="fc-stage" id="fcStage" title="Нажми на охранника">
        <svg id="fcSvg" viewBox="0 0 300 340" preserveAspectRatio="xMidYMid meet" role="img"
             aria-label="Стилизованный охранник на входе со скрещёнными руками">
          <defs>
            <clipPath id="fcLens">
              <rect x="117" y="117" width="29" height="20" rx="6"/>
              <rect x="154" y="117" width="29" height="20" rx="6"/>
            </clipPath>
          </defs>

          <rect x="26" y="16" width="248" height="308" rx="12" data-p="bg2" data-paint="fill"/>
          <rect x="26" y="16" width="248" height="308" rx="12" fill="none" data-p="soft" data-paint="stroke" stroke-width="2" opacity=".45"/>
          <path d="M52,300 L52,262 M248,300 L248,262" fill="none" data-p="metal" data-paint="stroke" stroke-width="6" stroke-linecap="round" opacity=".8"/>
          <circle cx="52" cy="256" r="7" data-p="metal" data-paint="fill" opacity=".85"/>
          <circle cx="248" cy="256" r="7" data-p="metal" data-paint="fill" opacity=".85"/>
          <path d="M52,262 C110,286 190,286 248,262" fill="none" data-p="soft" data-paint="stroke" stroke-width="4" opacity=".7"/>

          <g id="fcFig">
            <g id="fcBody">
              <path d="M50,340 C50,266 74,230 112,218 L188,218 C226,230 250,266 250,340 Z" data-p="fig" data-paint="fill"/>
              <path d="M50,340 C50,266 74,230 112,218 L188,218 C226,230 250,266 250,340 Z" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
              <path d="M126,220 L150,272 L174,220 L164,214 L136,214 Z" data-p="shirt" data-paint="fill"/>
              <path d="M126,220 L150,272 L174,220" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <path d="M150,272 L142,304 L150,322 L158,304 Z" data-p="glass" data-paint="fill"/>
              <path d="M126,220 L150,272 L124,258 Z" data-p="fig" data-paint="fill"/>
              <path d="M174,220 L150,272 L176,258 Z" data-p="fig" data-paint="fill"/>
              <path d="M126,220 L150,272 L124,258 Z M174,220 L150,272 L176,258 Z" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <path d="M196,246 l14,-6 l14,6 v12 c0,9 -7,15 -14,18 c-7,-3 -14,-9 -14,-18 Z" data-p="metal" data-paint="fill" opacity=".9"/>
              <path d="M203,254 l6,6 l10,-11" fill="none" data-p="bg1" data-paint="stroke" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </g>

            <g id="fcHead">
              <rect x="132" y="182" width="36" height="46" rx="14" data-p="fig" data-paint="fill"/>
              <rect x="132" y="182" width="36" height="46" rx="14" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
              <circle cx="110" cy="134" r="8" data-p="fig" data-paint="fill"/>
              <circle cx="190" cy="134" r="8" data-p="fig" data-paint="fill"/>
              <circle cx="110" cy="134" r="8" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <circle cx="190" cy="134" r="8" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <path d="M112,110 C112,80 128,60 150,60 C172,60 188,80 188,110 L188,146 C188,174 172,192 150,192 C128,192 112,174 112,146 Z" data-p="fig" data-paint="fill"/>
              <path d="M112,110 C112,80 128,60 150,60 C172,60 188,80 188,110 L188,146 C188,174 172,192 150,192 C128,192 112,174 112,146 Z" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
              <path d="M110,106 C112,74 130,54 150,54 C172,54 190,74 190,106 C174,92 126,92 110,106 Z" data-p="glass" data-paint="fill"/>
              <path d="M110,106 C112,74 130,54 150,54 C172,54 190,74 190,106" fill="none" data-p="line" data-paint="stroke" stroke-width="3"/>
              <g opacity=".28" data-p="line" data-paint="fill">
                <circle cx="132" cy="172" r="1.5"/><circle cx="141" cy="177" r="1.5"/>
                <circle cx="150" cy="179" r="1.5"/><circle cx="159" cy="177" r="1.5"/>
                <circle cx="168" cy="172" r="1.5"/><circle cx="137" cy="167" r="1.5"/>
                <circle cx="163" cy="167" r="1.5"/>
              </g>
              <path id="fcBrowL" fill="none" data-p="line" data-paint="stroke" stroke-width="4.5" stroke-linecap="round"/>
              <path id="fcBrowR" fill="none" data-p="line" data-paint="stroke" stroke-width="4.5" stroke-linecap="round"/>
              <rect x="117" y="117" width="29" height="20" rx="6" data-p="glass" data-paint="fill"/>
              <rect x="154" y="117" width="29" height="20" rx="6" data-p="glass" data-paint="fill"/>
              <g clip-path="url(#fcLens)">
                <rect id="fcGlint" x="-40" y="110" width="16" height="36" data-p="line" data-paint="fill" opacity=".55" transform="skewX(-22)"/>
              </g>
              <rect x="117" y="117" width="29" height="20" rx="6" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <rect x="154" y="117" width="29" height="20" rx="6" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <path d="M146,126 L154,126 M112,124 L117,124 M183,124 L188,124" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <path id="fcMouth" fill="none" data-p="line" data-paint="stroke" stroke-width="3.2" stroke-linecap="round"/>
              <circle cx="190" cy="134" r="4.5" data-p="metal" data-paint="fill"/>
              <path d="M192,139 C204,152 198,172 188,184" fill="none" data-p="metal" data-paint="stroke" stroke-width="2.5" opacity=".9"/>
            </g>

            <g id="fcArms">
              <path d="M64,288 C104,264 196,264 236,288" fill="none" data-p="line" data-paint="stroke" stroke-width="30" stroke-linecap="round"/>
              <path d="M64,288 C104,264 196,264 236,288" fill="none" data-p="fig" data-paint="stroke" stroke-width="24" stroke-linecap="round"/>
              <path d="M74,306 C112,288 188,288 226,306" fill="none" data-p="line" data-paint="stroke" stroke-width="28" stroke-linecap="round"/>
              <path d="M74,306 C112,288 188,288 226,306" fill="none" data-p="fig" data-paint="stroke" stroke-width="22" stroke-linecap="round"/>
              <circle cx="236" cy="288" r="13" data-p="fig" data-paint="fill"/>
              <circle cx="236" cy="288" r="13" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
              <circle cx="74" cy="306" r="12" data-p="fig" data-paint="fill"/>
              <circle cx="74" cy="306" r="12" fill="none" data-p="line" data-paint="stroke" stroke-width="2.5"/>
            </g>
          </g>
        </svg>
        <div class="fc-scan" id="fcScan"></div>
        <div class="fc-grain" id="fcGrain"></div>
        <div class="fc-tap">нажми на охранника</div>
      </div>

      <div class="fc-bubble" id="fcBubble">
        <span id="fcText"></span><i class="fc-caret" id="fcCaret"></i>
      </div>

      <div class="fc-controls" id="fcControls">
        <div class="fc-ctl">
          <label for="fcMood">Настроение</label>
          <select id="fcMood">
            <option value="calm">Спокойный</option>
            <option value="strict">Строгий</option>
            <option value="kind">Добрый</option>
            <option value="suspect">Подозрительный</option>
          </select>
        </div>
        <div class="fc-ctl"><label for="fcSize">Размер <b id="fcSizeV"></b></label><input id="fcSize" type="range" min="70" max="130" step="1"></div>
        <div class="fc-ctl"><label for="fcSpeech">Скорость речи <b id="fcSpeechV"></b></label><input id="fcSpeech" type="range" min="0.4" max="2" step="0.05"></div>
        <div class="fc-ctl"><label for="fcGaze">Взгляд <b id="fcGazeV"></b></label><input id="fcGaze" type="range" min="0" max="100" step="1"></div>
        <div class="fc-ctl"><label for="fcScanR">Луч сканера <b id="fcScanV"></b></label><input id="fcScanR" type="range" min="0" max="100" step="1"></div>
        <div class="fc-ctl"><label for="fcGrainR">Зерно <b id="fcGrainV"></b></label><input id="fcGrainR" type="range" min="0" max="100" step="1"></div>
        <div class="fc-ctl"><label for="fcGlowR">Контровой свет <b id="fcGlowV"></b></label><input id="fcGlowR" type="range" min="0" max="100" step="1"></div>
        <div class="fc-ctl fc-row"><label for="fcLight">Инверсия</label><button id="fcLight" class="fc-toggle" type="button" role="switch"><i></i><span></span></button></div>
        <div class="fc-ctl fc-row"><label for="fcTrack">Следит за курсором</label><button id="fcTrack" class="fc-toggle" type="button" role="switch"><i></i><span></span></button></div>
        <div class="fc-ctl fc-row"><label for="fcAuto">Авто-реплики</label><button id="fcAuto" class="fc-toggle" type="button" role="switch"><i></i><span></span></button></div>
      </div>

      <div class="fc-actions">
        <button id="fcNext" class="fc-btn fc-primary" type="button">Ещё реплика</button>
        <button id="fcMain" class="fc-btn" type="button">Главная</button>
        <button id="fcRandom" class="fc-btn" type="button">Случайно</button>
        <button id="fcReset" class="fc-btn" type="button">Сброс</button>
        <button id="fcExport" class="fc-btn" type="button">PNG</button>
      </div>

      <p class="fc-note">Просто фишечка у каталога: вход не блокирует, ничего не подтверждает и никуда не отправляет.</p>
    </div>
  `;

  layout.appendChild(mainCol);
  layout.appendChild(rail);
  host.appendChild(layout);

  /* ================= СТИЛИ ================= */
  const style = document.createElement("style");
  style.id = "vhFaceStyles";
  style.textContent = `
    .fc-layout{display:grid;grid-template-columns:minmax(0,1fr) 332px;gap:18px;align-items:start}
    .fc-main{min-width:0}
    .fc-rail{position:sticky;top:78px;max-height:calc(100vh - 96px);overflow-y:auto;overflow-x:hidden;
      scrollbar-width:thin;scrollbar-color:#4a4a4a transparent;padding-right:2px}
    .fc-rail::-webkit-scrollbar{width:9px}
    .fc-rail::-webkit-scrollbar-track{background:rgba(255,255,255,.04);border-radius:9px}
    .fc-rail::-webkit-scrollbar-thumb{background:#3d434b;border-radius:9px;border:2px solid transparent;background-clip:padding-box}
    .fc-rail::-webkit-scrollbar-thumb:hover{background:#f2f4f7;background-clip:padding-box}
    .fc-card{--fbg1:${PAL.dark.bg1};--fbg2:${PAL.dark.bg2};
      position:relative;overflow:hidden;border:1px solid var(--border,#2a2a2a);border-radius:20px;
      background:radial-gradient(80% 60% at 20% 0%,rgba(255,255,255,.09),transparent 62%),
                 linear-gradient(165deg,var(--fbg2),var(--fbg1));
      box-shadow:0 18px 44px rgba(0,0,0,.45);animation:fcIn .55s cubic-bezier(.2,.7,.2,1) both}
    @keyframes fcIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    .fc-card.is-light{--fbg1:#fff;--fbg2:#e7eaee;color:#0d0f13;border-color:#c9ced6}
    .fc-card.is-light .fc-kicker,.fc-card.is-light .fc-note,.fc-card.is-light .fc-ctl label{color:#5b626c}
    .fc-card.is-light .fc-bubble{background:#f3f5f8;border-color:#d3d8e0;color:#14171b}
    .fc-card.is-light .fc-bubble::after{background:#f3f5f8;border-color:#d3d8e0}
    .fc-card.is-light .fc-ctl select,.fc-card.is-light .fc-btn,.fc-card.is-light .fc-toggle{background:#f3f5f8;border-color:#d3d8e0;color:#14171b}
    .fc-card.is-light .fc-tap{background:rgba(255,255,255,.86);color:#3a4048;border-color:#d3d8e0}
    .fc-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 15px 0}
    .fc-kicker{font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:var(--muted,#8f8f8f)}
    .fc-18{font-size:11px;font-weight:900;letter-spacing:.06em;padding:4px 9px;border-radius:999px;border:1px solid currentColor;opacity:.8}
    .fc-stage{position:relative;height:250px;margin:8px 0 0;cursor:pointer;overflow:hidden}
    .fc-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
    .fc-scan{position:absolute;left:0;right:0;height:74px;pointer-events:none;
      background:linear-gradient(180deg,transparent,rgba(255,255,255,.16) 45%,rgba(255,255,255,.34) 50%,rgba(255,255,255,.16) 55%,transparent);
      mix-blend-mode:screen}
    .fc-card.is-light .fc-scan{background:linear-gradient(180deg,transparent,rgba(20,23,27,.10) 45%,rgba(20,23,27,.22) 50%,rgba(20,23,27,.10) 55%,transparent);mix-blend-mode:multiply}
    .fc-grain{position:absolute;inset:0;pointer-events:none;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")}
    .fc-tap{position:absolute;left:12px;bottom:10px;font-size:10px;font-weight:800;letter-spacing:.05em;
      padding:5px 9px;border-radius:999px;border:1px solid var(--border,#2a2a2a);
      background:rgba(10,11,13,.72);color:var(--muted,#8f8f8f);backdrop-filter:blur(6px);pointer-events:none}
    .fc-bubble{position:relative;margin:14px 15px 0;padding:13px 14px;min-height:76px;
      border:1px solid var(--border,#2a2a2a);border-radius:14px;background:var(--card2,#1a1a1a);
      font-size:13.5px;line-height:1.55;font-weight:600}
    .fc-bubble::after{content:"";position:absolute;top:-7px;left:34px;width:12px;height:12px;
      background:var(--card2,#1a1a1a);border-left:1px solid var(--border,#2a2a2a);border-top:1px solid var(--border,#2a2a2a);transform:rotate(45deg)}
    .fc-bubble.is-shake{animation:fcShake .42s ease}
    @keyframes fcShake{0%,100%{transform:none}25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}
    .fc-caret{display:inline-block;width:7px;height:14px;margin-left:2px;vertical-align:-2px;background:currentColor;opacity:.85;animation:fcBlink 1s steps(1) infinite}
    .fc-caret.is-off{display:none}
    @keyframes fcBlink{50%{opacity:0}}
    .fc-controls{display:grid;gap:12px;padding:14px 15px}
    .fc-ctl label{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:6px;
      font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#8f8f8f)}
    .fc-ctl label b{font-size:11px;font-weight:900;color:var(--text,#f2f2f2);font-variant-numeric:tabular-nums}
    .fc-card.is-light .fc-ctl label b{color:#14171b}
    .fc-ctl select{width:100%;padding:8px 10px;border-radius:10px;font:inherit;font-size:12.5px;font-weight:700;
      background:var(--card,#121212);color:var(--text,#f2f2f2);border:1px solid var(--border,#2a2a2a)}
    .fc-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .fc-row label{margin:0}
    .fc-toggle{display:flex;align-items:center;gap:7px;padding:5px 9px;border-radius:999px;cursor:pointer;flex-shrink:0;
      border:1px solid var(--border,#2a2a2a);background:var(--card,#121212);color:var(--text,#f2f2f2);font:inherit;font-size:10px;font-weight:900}
    .fc-toggle i{width:28px;height:16px;border-radius:99px;background:#3a3f47;position:relative;transition:.2s;flex-shrink:0}
    .fc-toggle i::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:.2s}
    .fc-toggle[aria-checked=true] i{background:#fff}
    .fc-toggle[aria-checked=true] i::after{left:14px;background:#0b0c0e}
    .fc-ctl input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:20px;margin:0;background:transparent;cursor:pointer}
    .fc-ctl input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:99px;background:linear-gradient(90deg,#8b9199,#2c3037)}
    .fc-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;margin-top:-5.5px;border-radius:50%;
      background:#fff;border:2px solid #0b0c0e;box-shadow:0 0 0 1px #fff,0 2px 7px rgba(0,0,0,.5);transition:transform .15s}
    .fc-ctl input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.18)}
    .fc-ctl input[type=range]::-moz-range-track{height:4px;border-radius:99px;background:#3a3f47}
    .fc-ctl input[type=range]::-moz-range-progress{height:4px;border-radius:99px;background:#fff}
    .fc-ctl input[type=range]::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:#fff;border:2px solid #0b0c0e}
    .fc-card.is-light input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(90deg,#22262c,#c3c9d2)}
    .fc-card.is-light input[type=range]::-webkit-slider-thumb{background:#14171b;border-color:#fff;box-shadow:0 0 0 1px #14171b}
    .fc-actions{display:flex;flex-wrap:wrap;gap:7px;padding:0 15px 12px}
    .fc-btn{padding:8px 12px;border-radius:10px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;
      border:1px solid var(--border-strong,#4a4a4a);background:var(--card2,#1a1a1a);color:var(--text,#f2f2f2);transition:.16s}
    .fc-btn:hover{transform:translateY(-1px);border-color:#fff}
    .fc-primary{background:#fff;color:#0a0a0a;border-color:#fff}
    .fc-primary:hover{background:#d6d9de}
    .fc-card.is-light .fc-primary{background:#14171b;color:#fff;border-color:#14171b}
    .fc-note{margin:0;padding:0 15px 15px;font-size:10.5px;line-height:1.5;color:var(--muted2,#6a6a6a)}
    @media (max-width:1080px){
      .fc-layout{grid-template-columns:1fr}
      .fc-rail{position:static;max-height:none;overflow:visible;order:-1}
      .fc-card{display:grid;grid-template-columns:132px minmax(0,1fr);grid-template-areas:"head head" "stage bubble" "ctl ctl" "act act" "note note";align-items:center}
      .fc-head{grid-area:head}
      .fc-stage{grid-area:stage;height:150px;margin:6px 0 0}
      .fc-bubble{grid-area:bubble;margin:6px 12px 0;min-height:0;font-size:12.5px}
      .fc-bubble::after{top:22px;left:-7px;border:0;border-left:1px solid var(--border,#2a2a2a);border-bottom:1px solid var(--border,#2a2a2a)}
      .fc-controls{grid-area:ctl;display:flex;gap:12px;overflow-x:auto;padding:12px 15px;
        scrollbar-width:thin;scrollbar-color:#4a4a4a transparent}
      .fc-controls::-webkit-scrollbar{height:8px}
      .fc-controls::-webkit-scrollbar-track{background:rgba(255,255,255,.05);border-radius:8px}
      .fc-controls::-webkit-scrollbar-thumb{background:#3d434b;border-radius:8px}
      .fc-controls::-webkit-scrollbar-thumb:hover{background:#f2f4f7}
      .fc-ctl{min-width:158px;flex-shrink:0}
      .fc-row{min-width:186px}
      .fc-actions{grid-area:act}
      .fc-note{grid-area:note}
      .fc-tap{display:none}
    }
    @media (prefers-reduced-motion:reduce){.fc-card,.fc-caret,.fc-bubble.is-shake{animation:none}}
  `;
  document.head.appendChild(style);

  /* ================= ССЫЛКИ ================= */
  const $ = (id) => document.getElementById(id);
  const card = rail.querySelector(".fc-card");
  const stage = $("fcStage"), svg = $("fcSvg");
  const fig = $("fcFig"), bodyG = $("fcBody"), headG = $("fcHead"), armsG = $("fcArms");
  const browL = $("fcBrowL"), browR = $("fcBrowR"), mouth = $("fcMouth"), glint = $("fcGlint");
  const scanEl = $("fcScan"), grainEl = $("fcGrain");
  const textEl = $("fcText"), caret = $("fcCaret"), bubble = $("fcBubble");

  /* ================= ПАЛИТРА ================= */
  function paint() {
    const p = pal();
    card.classList.toggle("is-light", !!S.light);
    card.style.setProperty("--fbg1", p.bg1);
    card.style.setProperty("--fbg2", p.bg2);
    svg.querySelectorAll("[data-p]").forEach((n) => n.setAttribute(n.dataset.paint, p[n.dataset.p] || p.line));
  }

  /* ================= РЕПЛИКИ ================= */
  let lineIdx = 0, typed = 0, talking = false, idleTimer = 0;
  function say(i, shake) {
    lineIdx = ((i % LINES.length) + LINES.length) % LINES.length;
    typed = reduced ? LINES[lineIdx].length : 0;
    talking = !reduced;
    idleTimer = 0;
    textEl.textContent = LINES[lineIdx].slice(0, Math.floor(typed));
    caret.classList.toggle("is-off", reduced);
    if (shake && !reduced) {
      bubble.classList.remove("is-shake");
      void bubble.offsetWidth;
      bubble.classList.add("is-shake");
    }
    if (!running) applyVisual(0);
  }

  /* ================= ВИЗУАЛ ================= */
  let gx = 0, gy = 0, tx = 0, ty = 0, glintT = 3, scanP = 0, breath = 0, poke = 0;

  function applyVisual(dt) {
    const m = MOODS[S.mood] || MOODS.strict;
    const strength = S.gaze / 100;
    const followX = S.track ? tx * strength : 0;
    const followY = S.track ? ty * strength : 0;
    gx += (followX - gx) * (dt ? Math.min(1, dt * 7) : 1);
    gy += (followY - gy) * (dt ? Math.min(1, dt * 7) : 1);

    breath += dt * 1.5;
    const br = 1 + Math.sin(breath) * 0.014;
    const sc = S.size / 100;
    const lean = poke > 0 ? Math.sin(poke * Math.PI) * 5 : 0;

    fig.setAttribute("transform", `translate(150,340) scale(${sc}) translate(-150,-340) translate(${(gx * 5).toFixed(2)},${(-lean).toFixed(2)})`);
    bodyG.setAttribute("transform", `translate(150,340) scale(1,${br.toFixed(4)}) translate(-150,-340)`);
    armsG.setAttribute("transform", `translate(0,${(Math.sin(breath) * 1.2).toFixed(2)})`);
    headG.setAttribute("transform", `translate(${(gx * 7).toFixed(2)},${(gy * 4).toFixed(2)}) rotate(${(m.tilt + gx * 7).toFixed(2)} 150 192)`);

    const b = m.brow + (poke > 0 ? 6 * Math.sin(poke * Math.PI) : 0);
    browL.setAttribute("d", `M120,${(112 + b * 0.5).toFixed(1)} L142,${(110 - b * 0.5).toFixed(1)}`);
    browR.setAttribute("d", `M158,${(110 - b * 0.5).toFixed(1)} L180,${(112 + b * 0.5).toFixed(1)}`);

    const open = talking ? (0.45 + 0.55 * Math.abs(Math.sin(performance.now() / 62))) : 0;
    const smile = m.smirk * 3;
    const y0 = 168, dip = y0 + smile + open * 7;
    mouth.setAttribute("d", `M136,${y0} Q150,${dip.toFixed(1)} 164,${(y0 - (S.mood === "suspect" ? 2 : 0)).toFixed(1)}`);

    glintT -= dt;
    if (glintT <= 0) glintT = rnd(3.4, 6.2);
    const gp = clamp((0.62 - glintT) / 0.62, 0, 1);
    glint.setAttribute("x", String(-46 + gp * 250));
    glint.setAttribute("opacity", (gp > 0 && gp < 1 ? 0.5 : 0).toFixed(2));

    scanP = (scanP + dt * 0.3) % 1;
    scanEl.style.transform = `translateY(${(-80 + scanP * (stage.clientHeight + 160)).toFixed(1)}px)`;
    scanEl.style.opacity = (S.scan / 100 * 0.9).toFixed(2);
    grainEl.style.opacity = (S.grain / 100 * 0.09).toFixed(3);

    const g = S.glow / 100;
    fig.style.filter = g > 0.01
      ? `drop-shadow(0 0 ${(6 + g * 16).toFixed(1)}px rgba(${S.light ? "20,23,27" : "255,255,255"},${(0.1 + g * 0.35).toFixed(2)}))`
      : "none";

    if (poke > 0) poke = Math.max(0, poke - dt * 1.9);
  }

  /* ================= ЦИКЛ ================= */
  let running = false, raf = 0, last = 0, visible = true;

  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000) || 0;
    last = ts;

    if (talking) {
      typed += dt * 30 * S.speech;
      const full = LINES[lineIdx];
      if (typed >= full.length) { typed = full.length; talking = false; caret.classList.add("is-off"); }
      textEl.textContent = full.slice(0, Math.floor(typed));
    } else if (S.auto) {
      idleTimer += dt;
      if (idleTimer > 15) say(lineIdx + 1, false);
    }

    applyVisual(dt);
  }
  function start() {
    if (running || !visible || document.hidden || reduced) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function syncLoop() { (visible && !document.hidden && !reduced) ? start() : stop(); }

  /* ================= КОНТРОЛЫ ================= */
  const RANGES = [
    ["fcSize", "size", "fcSizeV", (v) => v + "%"],
    ["fcSpeech", "speech", "fcSpeechV", (v) => v.toFixed(2) + "×"],
    ["fcGaze", "gaze", "fcGazeV", (v) => v + "%"],
    ["fcScanR", "scan", "fcScanV", (v) => v + "%"],
    ["fcGrainR", "grain", "fcGrainV", (v) => v + "%"],
    ["fcGlowR", "glow", "fcGlowV", (v) => v + "%"]
  ];
  const TOGGLES = [["fcLight", "light", ["Светло", "Темно"]], ["fcTrack", "track", ["Да", "Нет"]], ["fcAuto", "auto", ["Да", "Нет"]]];

  function syncUI() {
    RANGES.forEach(([id, key, out, fmt]) => { $(id).value = S[key]; $(out).textContent = fmt(Number(S[key])); });
    $("fcMood").value = S.mood;
    TOGGLES.forEach(([id, key, words]) => {
      const b = $(id);
      b.setAttribute("aria-checked", String(!!S[key]));
      b.querySelector("span").textContent = S[key] ? words[0] : words[1];
    });
  }

  RANGES.forEach(([id, key, out, fmt]) => {
    $(id).addEventListener("input", (e) => {
      S[key] = Number(e.target.value);
      $(out).textContent = fmt(S[key]);
      save();
      if (!running) applyVisual(0);
    });
  });

  $("fcMood").addEventListener("change", (e) => {
    S.mood = e.target.value; save();
    if (!running) applyVisual(0);
  });

  TOGGLES.forEach(([id, key]) => {
    $(id).addEventListener("click", () => {
      S[key] = !S[key];
      if (key === "light") paint();
      if (key === "auto") idleTimer = 0;
      syncUI(); save();
      if (!running) applyVisual(0);
    });
  });

  $("fcNext").addEventListener("click", () => say(lineIdx + 1, true));
  $("fcMain").addEventListener("click", () => say(0, true));
  stage.addEventListener("click", () => { poke = 1; say(lineIdx + 1, true); });

  $("fcRandom").addEventListener("click", () => {
    const keys = Object.keys(MOODS);
    S.mood = keys[Math.floor(Math.random() * keys.length)];
    S.size = Math.round(rnd(80, 125));
    S.speech = Math.round(rnd(0.6, 1.8) * 20) / 20;
    S.gaze = Math.round(rnd(20, 100));
    S.scan = Math.round(rnd(15, 100));
    S.grain = Math.round(rnd(10, 90));
    S.glow = Math.round(rnd(15, 95));
    syncUI(); save(); poke = 1;
    say(Math.floor(Math.random() * LINES.length), true);
  });

  $("fcReset").addEventListener("click", () => {
    const light = S.light;
    S = Object.assign({}, DEF, { light });
    syncUI(); paint(); save();
    say(0, true);
    if (!running) applyVisual(0);
  });

  $("fcExport").addEventListener("click", async () => {
    const btn = $("fcExport"), old = btn.textContent;
    btn.textContent = "…"; btn.disabled = true;
    try {
      const w = 900, h = 1180;
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      const c = out.getContext("2d");
      const p = pal();
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, p.bg2); g.addColorStop(1, p.bg1);
      c.fillStyle = g; c.fillRect(0, 0, w, h);

      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", "780"); clone.setAttribute("height", "884");
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      c.drawImage(img, 60, 130, 780, 884);

      c.fillStyle = p.line;
      c.font = "900 34px system-ui, -apple-system, Segoe UI, sans-serif";
      c.fillText("V&H · ФЕЙС-КОНТРОЛЬ", 60, 78);
      c.font = "900 26px system-ui, -apple-system, Segoe UI, sans-serif";
      c.fillText("18+", w - 118, 78);

      c.font = "600 27px system-ui, -apple-system, Segoe UI, sans-serif";
      const words = LINES[lineIdx].split(" ");
      let line = "", y = 1058;
      words.forEach((word) => {
        const test = line ? line + " " + word : word;
        if (c.measureText(test).width > w - 120) { c.fillText(line, 60, y); y += 38; line = word; }
        else line = test;
      });
      if (line) c.fillText(line, 60, y);

      const a = document.createElement("a");
      a.download = "vh-face-control.png";
      a.href = out.toDataURL("image/png");
      a.click();
      btn.textContent = "✓";
    } catch { btn.textContent = "Ошибка"; }
    setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1500);
  });

  /* ================= ЖИЗНЕННЫЙ ЦИКЛ ================= */
  if (!reduced) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      ty = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
    });
    stage.addEventListener("pointerleave", () => { tx = 0; ty = 0; });
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    syncLoop();
  }, { threshold: 0.04 });
  io.observe(rail);

  document.addEventListener("visibilitychange", syncLoop);
  window.addEventListener("pagehide", () => { stop(); io.disconnect(); });

  /* ================= СТАРТ ================= */
  paint(); syncUI(); say(0, false); applyVisual(0); syncLoop();
})();
