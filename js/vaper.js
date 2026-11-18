(() => {
  "use strict";

  if (document.getElementById("vhFace")) return;
  const host = document.getElementById("catalog");
  if (!host) return;

  const LINES = [
    "Эй, брат, документы есть? Подтверди, что тебе есть 18, и проходи.",
    "Спокойно, я тут для вида. Каталог рядом — листай, никто не держит.",
    "Восемнадцать есть? Тогда без вопросов. Нет — только чай и разговоры.",
    "Паспорт не мни, брат. Я и так почти верю.",
    "Тут учат подбирать картриджи. Мне бы так разбираться в людях.",
    "Стой. Шучу. Проходи, я сегодня добрый.",
    "Документы… а, ладно. У нас обучение, а не ночной клуб.",
    "Смотри мне: XROS к XROS, Armour к Armour. Это я запомнил.",
    "Я на тебя смотрю. Ты пока正确地 листаешь каталог.",
    "Взглядом провожу каждого. Профессиональная привычка.",
    "Ты давно стоишь. Определяйся, брат, я не вечный.",
    "Свет, камера, фейс-контроль. Порядок."
  ].map((s) => s.replace("правильно", "правильно"));

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

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
        <span class="fc-live"><i></i>на посту</span>
        <span class="fc-18">18+</span>
      </div>

      <div class="fc-stage" id="fcStage" title="Нажми — скажет ещё">
        <svg id="fcSvg" viewBox="0 0 300 340" preserveAspectRatio="xMidYMid meet" role="img"
             aria-label="Стилизованный охранник на входе, следит за курсором">
          <defs>
            <clipPath id="fcLens">
              <rect x="117" y="117" width="29" height="20" rx="6"/>
              <rect x="154" y="117" width="29" height="20" rx="6"/>
            </clipPath>
            <linearGradient id="fcBeam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity=".13"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </linearGradient>
            <radialGradient id="fcPool">
              <stop offset="0%" stop-color="#ffffff" stop-opacity=".12"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </radialGradient>
          </defs>

          <rect x="26" y="16" width="248" height="308" rx="12" fill="#171a1f"/>
          <rect x="26" y="16" width="248" height="308" rx="12" fill="none" stroke="#79808b" stroke-width="2" opacity=".4"/>
          <path d="M42,32 h216 M42,308 h216" stroke="#79808b" stroke-width="1.5" opacity=".22"/>
          <polygon points="150,14 54,330 246,330" fill="url(#fcBeam)"/>
          <ellipse cx="150" cy="330" rx="112" ry="18" fill="url(#fcPool)"/>

          <path d="M52,300 L52,262 M248,300 L248,262" fill="none" stroke="#cfd4da" stroke-width="6" stroke-linecap="round" opacity=".75"/>
          <circle cx="52" cy="256" r="7" fill="#cfd4da" opacity=".8"/>
          <circle cx="248" cy="256" r="7" fill="#cfd4da" opacity=".8"/>
          <path d="M52,262 C110,286 190,286 248,262" fill="none" stroke="#79808b" stroke-width="4" opacity=".65"/>

          <g id="fcDust" fill="#f2f4f7"></g>

          <g id="fcFig">
            <g id="fcBody">
              <path d="M50,340 C50,266 74,230 112,218 L188,218 C226,230 250,266 250,340 Z" fill="#14171c"/>
              <path d="M50,340 C50,266 74,230 112,218 L188,218 C226,230 250,266 250,340 Z" fill="none" stroke="#f2f4f7" stroke-width="3"/>
              <path d="M126,220 L150,272 L174,220 L164,214 L136,214 Z" fill="#f2f4f7"/>
              <path d="M126,220 L150,272 L174,220" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <path d="M150,272 L142,304 L150,322 L158,304 Z" fill="#08090b"/>
              <path d="M126,220 L150,272 L124,258 Z" fill="#14171c"/>
              <path d="M174,220 L150,272 L176,258 Z" fill="#14171c"/>
              <path d="M126,220 L150,272 L124,258 Z M174,220 L150,272 L176,258 Z" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <path d="M196,246 l14,-6 l14,6 v12 c0,9 -7,15 -14,18 c-7,-3 -14,-9 -14,-18 Z" fill="#cfd4da" opacity=".9"/>
              <path d="M203,254 l6,6 l10,-11" fill="none" stroke="#0b0c0e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </g>

            <g id="fcHead">
              <rect x="132" y="182" width="36" height="46" rx="14" fill="#14171c"/>
              <rect x="132" y="182" width="36" height="46" rx="14" fill="none" stroke="#f2f4f7" stroke-width="3"/>
              <circle cx="110" cy="134" r="8" fill="#14171c"/>
              <circle cx="190" cy="134" r="8" fill="#14171c"/>
              <circle cx="110" cy="134" r="8" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <circle cx="190" cy="134" r="8" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <path d="M112,110 C112,80 128,60 150,60 C172,60 188,80 188,110 L188,146 C188,174 172,192 150,192 C128,192 112,174 112,146 Z" fill="#14171c"/>
              <path d="M112,110 C112,80 128,60 150,60 C172,60 188,80 188,110 L188,146 C188,174 172,192 150,192 C128,192 112,174 112,146 Z" fill="none" stroke="#f2f4f7" stroke-width="3"/>
              <path d="M110,106 C112,74 130,54 150,54 C172,54 190,74 190,106 C174,92 126,92 110,106 Z" fill="#08090b"/>
              <path d="M110,106 C112,74 130,54 150,54 C172,54 190,74 190,106" fill="none" stroke="#f2f4f7" stroke-width="3"/>
              <g opacity=".26" fill="#f2f4f7">
                <circle cx="132" cy="172" r="1.5"/><circle cx="141" cy="177" r="1.5"/>
                <circle cx="150" cy="179" r="1.5"/><circle cx="159" cy="177" r="1.5"/>
                <circle cx="168" cy="172" r="1.5"/><circle cx="137" cy="167" r="1.5"/>
                <circle cx="163" cy="167" r="1.5"/>
              </g>
              <path id="fcBrowL" fill="none" stroke="#f2f4f7" stroke-width="4.5" stroke-linecap="round"/>
              <path id="fcBrowR" fill="none" stroke="#f2f4f7" stroke-width="4.5" stroke-linecap="round"/>
              <rect x="117" y="117" width="29" height="20" rx="6" fill="#08090b"/>
              <rect x="154" y="117" width="29" height="20" rx="6" fill="#08090b"/>
              <g clip-path="url(#fcLens)">
                <circle id="fcEyeL" cx="131" cy="127" r="2.8" fill="#f2f4f7" opacity=".42"/>
                <circle id="fcEyeR" cx="168" cy="127" r="2.8" fill="#f2f4f7" opacity=".42"/>
                <rect id="fcGlint" x="-46" y="108" width="15" height="40" fill="#f2f4f7" opacity="0" transform="skewX(-22)"/>
              </g>
              <rect x="117" y="117" width="29" height="20" rx="6" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <rect x="154" y="117" width="29" height="20" rx="6" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <path d="M146,126 L154,126 M112,124 L117,124 M183,124 L188,124" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <path id="fcMouth" fill="none" stroke="#f2f4f7" stroke-width="3.2" stroke-linecap="round"/>
              <circle cx="190" cy="134" r="4.5" fill="#cfd4da"/>
              <path d="M192,139 C204,152 198,172 188,184" fill="none" stroke="#cfd4da" stroke-width="2.5" opacity=".85"/>
            </g>

            <g id="fcArms">
              <path d="M64,288 C104,264 196,264 236,288" fill="none" stroke="#f2f4f7" stroke-width="30" stroke-linecap="round"/>
              <path d="M64,288 C104,264 196,264 236,288" fill="none" stroke="#14171c" stroke-width="24" stroke-linecap="round"/>
              <path d="M74,306 C112,288 188,288 226,306" fill="none" stroke="#f2f4f7" stroke-width="28" stroke-linecap="round"/>
              <path d="M74,306 C112,288 188,288 226,306" fill="none" stroke="#14171c" stroke-width="22" stroke-linecap="round"/>
              <circle cx="236" cy="288" r="13" fill="#14171c"/>
              <circle cx="236" cy="288" r="13" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
              <circle cx="74" cy="306" r="12" fill="#14171c"/>
              <circle cx="74" cy="306" r="12" fill="none" stroke="#f2f4f7" stroke-width="2.5"/>
            </g>
          </g>
        </svg>
        <div class="fc-scan" id="fcScan"></div>
        <div class="fc-grain"></div>
        <div class="fc-tap">нажми — скажет ещё</div>
      </div>

      <div class="fc-bubble" id="fcBubble" aria-live="off">
        <span id="fcText"></span><i class="fc-caret" id="fcCaret"></i>
      </div>

      <p class="fc-note">Фишечка у каталога: вход не блокирует, ничего не подтверждает и никуда не отправляет.</p>
    </div>
  `;

  layout.appendChild(mainCol);
  layout.appendChild(rail);
  host.appendChild(layout);

  /* ================= СТИЛИ ================= */
  const style = document.createElement("style");
  style.id = "vhFaceStyles";
  style.textContent = `
    .fc-layout{display:grid;grid-template-columns:minmax(0,1fr) 322px;gap:18px;align-items:start}
    .fc-main{min-width:0}
    .fc-rail{position:sticky;top:78px;max-height:calc(100vh - 96px);overflow-y:auto;overflow-x:hidden;
      scrollbar-width:thin;scrollbar-color:#3d434b rgba(255,255,255,.05)}
    .fc-rail::-webkit-scrollbar{width:9px}
    .fc-rail::-webkit-scrollbar-track{background:rgba(255,255,255,.05);border-radius:9px}
    .fc-rail::-webkit-scrollbar-thumb{background:#3d434b;border-radius:9px;border:2px solid transparent;background-clip:padding-box}
    .fc-rail::-webkit-scrollbar-thumb:hover{background:#f2f4f7;background-clip:padding-box}
    .fc-card{position:relative;overflow:hidden;border:1px solid var(--border,#2a2a2a);border-radius:20px;
      background:radial-gradient(80% 60% at 22% 0%,rgba(255,255,255,.10),transparent 62%),
                 linear-gradient(165deg,#171a1f,#0b0c0e);
      box-shadow:0 18px 44px rgba(0,0,0,.5);animation:fcIn .55s cubic-bezier(.2,.7,.2,1) both}
    @keyframes fcIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    .fc-head{display:flex;align-items:center;gap:9px;padding:14px 15px 0}
    .fc-kicker{font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:var(--muted,#8f8f8f)}
    .fc-live{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:9.5px;font-weight:900;
      letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#8f8f8f)}
    .fc-live i{width:7px;height:7px;border-radius:50%;background:#f2f4f7;animation:fcPulse 2.2s ease-out infinite}
    @keyframes fcPulse{0%{box-shadow:0 0 0 0 rgba(242,244,247,.5)}70%{box-shadow:0 0 0 8px rgba(242,244,247,0)}100%{box-shadow:0 0 0 0 rgba(242,244,247,0)}}
    .fc-18{font-size:11px;font-weight:900;letter-spacing:.06em;padding:4px 9px;border-radius:999px;
      border:1px solid var(--border-strong,#4a4a4a);color:var(--text,#f2f2f2)}
    .fc-stage{position:relative;height:272px;margin:8px 0 0;cursor:pointer;overflow:hidden}
    .fc-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
    .fc-scan{position:absolute;left:0;right:0;height:76px;pointer-events:none;mix-blend-mode:screen;opacity:.5;
      background:linear-gradient(180deg,transparent,rgba(255,255,255,.14) 45%,rgba(255,255,255,.32) 50%,rgba(255,255,255,.14) 55%,transparent)}
    .fc-grain{position:absolute;inset:0;pointer-events:none;opacity:.05;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")}
    .fc-tap{position:absolute;left:12px;bottom:10px;font-size:10px;font-weight:800;letter-spacing:.05em;
      padding:5px 9px;border-radius:999px;border:1px solid var(--border,#2a2a2a);
      background:rgba(10,11,13,.72);color:var(--muted,#8f8f8f);backdrop-filter:blur(6px);pointer-events:none;
      transition:opacity .3s}
    .fc-stage:hover .fc-tap{opacity:.35}
    .fc-bubble{position:relative;margin:14px 15px 0;padding:13px 14px;min-height:88px;
      border:1px solid var(--border,#2a2a2a);border-radius:14px;background:var(--card2,#1a1a1a);
      font-size:13.5px;line-height:1.55;font-weight:600;color:var(--text,#f2f2f2)}
    .fc-bubble::after{content:"";position:absolute;top:-7px;left:34px;width:12px;height:12px;
      background:var(--card2,#1a1a1a);border-left:1px solid var(--border,#2a2a2a);border-top:1px solid var(--border,#2a2a2a);transform:rotate(45deg)}
    .fc-bubble.is-shake{animation:fcShake .42s ease}
    @keyframes fcShake{0%,100%{transform:none}25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}
    .fc-caret{display:inline-block;width:7px;height:14px;margin-left:2px;vertical-align:-2px;background:currentColor;opacity:.85;animation:fcBlink 1s steps(1) infinite}
    .fc-caret.is-off{display:none}
    @keyframes fcBlink{50%{opacity:0}}
    .fc-note{margin:0;padding:12px 15px 15px;font-size:10.5px;line-height:1.5;color:var(--muted2,#6a6a6a)}
    @media (max-width:1080px){
      .fc-layout{grid-template-columns:1fr}
      .fc-rail{position:static;max-height:none;overflow:visible;order:-1}
      .fc-card{display:grid;grid-template-columns:138px minmax(0,1fr);
        grid-template-areas:"head head" "stage bubble" "note note";align-items:center}
      .fc-head{grid-area:head}
      .fc-stage{grid-area:stage;height:158px;margin:6px 0 0}
      .fc-bubble{grid-area:bubble;margin:6px 12px 0;min-height:0;font-size:12.5px}
      .fc-bubble::after{top:24px;left:-7px;border:0;border-left:1px solid var(--border,#2a2a2a);border-bottom:1px solid var(--border,#2a2a2a)}
      .fc-note{grid-area:note;padding-top:10px}
      .fc-tap{display:none}
    }
    @media (prefers-reduced-motion:reduce){
      .fc-card,.fc-caret,.fc-bubble.is-shake,.fc-live i{animation:none}
      .fc-scan{display:none}
    }
  `;
  document.head.appendChild(style);

  /* ================= ССЫЛКИ ================= */
  const $ = (id) => document.getElementById(id);
  const stage = $("fcStage");
  const fig = $("fcFig"), bodyG = $("fcBody"), headG = $("fcHead"), armsG = $("fcArms");
  const browL = $("fcBrowL"), browR = $("fcBrowR"), mouth = $("fcMouth");
  const eyeL = $("fcEyeL"), eyeR = $("fcEyeR"), glint = $("fcGlint");
  const scanEl = $("fcScan"), dustG = $("fcDust");
  const textEl = $("fcText"), caret = $("fcCaret"), bubble = $("fcBubble");

  /* ================= ПЫЛИНКИ ================= */
  const dust = [];
  for (let i = 0; i < 14; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const d = { x: rnd(34, 266), y: rnd(30, 320), r: rnd(0.7, 2.1), sp: rnd(4, 13), ph: rnd(0, 6.28), a: rnd(0.1, 0.3) };
    c.setAttribute("r", d.r.toFixed(2));
    c.setAttribute("opacity", d.a.toFixed(2));
    dustG.appendChild(c);
    d.el = c; dust.push(d);
  }

  /* ================= РЕПЛИКИ ================= */
  let idx = 0, typed = 0, talking = false, nextIn = rnd(9, 14);

  function pickNext() {
    if (LINES.length < 2) return 0;
    let n = idx;
    while (n === idx) n = Math.floor(Math.random() * LINES.length);
    return n;
  }

  function say(i, shake) {
    idx = ((i % LINES.length) + LINES.length) % LINES.length;
    const full = LINES[idx];
    typed = reduced ? full.length : 0;
    talking = !reduced;
    nextIn = rnd(9, 14);
    textEl.textContent = full.slice(0, Math.floor(typed));
    caret.classList.toggle("is-off", reduced);
    bubble.setAttribute("aria-label", full);
    if (shake && !reduced) {
      bubble.classList.remove("is-shake");
      void bubble.offsetWidth;
      bubble.classList.add("is-shake");
      poke = 1;
    }
    if (!running) render(0);
  }

  /* ================= ВЗГЛЯД ПО ВСЕЙ СТРАНИЦЕ ================= */
  let rect = stage.getBoundingClientRect();
  let px = 0, py = 0, hasPointer = false, idleFor = 99;
  let tx = 0, ty = 0, gx = 0, gy = 0, poke = 0;

  function measure() { rect = stage.getBoundingClientRect(); }

  function onPointer(e) {
    px = e.clientX; py = e.clientY;
    hasPointer = true; idleFor = 0;
  }

  function updateTarget(dt) {
    idleFor += dt;
    if (hasPointer && idleFor < 4) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.42;
      tx = clamp((px - cx) / (window.innerWidth * 0.5), -1, 1);
      ty = clamp((py - cy) / (window.innerHeight * 0.5), -1, 1);
    } else {
      const t = performance.now() / 1000;
      tx = Math.sin(t * 0.32) * 0.55;
      ty = Math.sin(t * 0.21 + 1.2) * 0.3;
    }
    const k = dt ? Math.min(1, dt * 5.5) : 1;
    gx += (tx - gx) * k;
    gy += (ty - gy) * k;
  }

  /* ================= ОТРИСОВКА ================= */
  let breath = 0, glintT = 2.6, scanP = 0;

  function render(dt) {
    updateTarget(dt);
    breath += dt * 1.5;
    const br = 1 + Math.sin(breath) * 0.014;
    const lean = poke > 0 ? Math.sin(poke * Math.PI) * 5 : 0;

    fig.setAttribute("transform", `translate(${(gx * 4).toFixed(2)},${(-lean).toFixed(2)})`);
    bodyG.setAttribute("transform", `translate(150,340) scale(1,${br.toFixed(4)}) translate(-150,-340)`);
    armsG.setAttribute("transform", `translate(${(gx * 1.6).toFixed(2)},${(Math.sin(breath) * 1.2).toFixed(2)})`);
    headG.setAttribute("transform", `translate(${(gx * 9).toFixed(2)},${(gy * 5).toFixed(2)}) rotate(${(-3 + gx * 13).toFixed(2)} 150 192)`);

    const ex = gx * 4.6, ey = gy * 2.6;
    eyeL.setAttribute("cx", (131 + ex).toFixed(2)); eyeL.setAttribute("cy", (127 + ey).toFixed(2));
    eyeR.setAttribute("cx", (168 + ex).toFixed(2)); eyeR.setAttribute("cy", (127 + ey).toFixed(2));

    const b = -8 + (poke > 0 ? 9 * Math.sin(poke * Math.PI) : 0);
    browL.setAttribute("d", `M120,${(112 + b * 0.5).toFixed(1)} L142,${(110 - b * 0.5).toFixed(1)}`);
    browR.setAttribute("d", `M158,${(110 - b * 0.5).toFixed(1)} L180,${(112 + b * 0.5).toFixed(1)}`);

    const open = talking ? (0.45 + 0.55 * Math.abs(Math.sin(performance.now() / 62))) : 0;
    mouth.setAttribute("d", `M136,168 Q150,${(166.5 + open * 8).toFixed(1)} 164,168`);

    glintT -= dt;
    if (glintT <= 0) glintT = rnd(3.2, 6);
    const gp = clamp((0.6 - glintT) / 0.6, 0, 1);
    glint.setAttribute("x", (-46 + gp * 250).toFixed(1));
    glint.setAttribute("opacity", gp > 0 && gp < 1 ? "0.5" : "0");

    scanP = (scanP + dt * 0.28) % 1;
    scanEl.style.transform = `translateY(${(-80 + scanP * (stage.clientHeight + 160)).toFixed(1)}px)`;

    for (let i = 0; i < dust.length; i++) {
      const d = dust[i];
      d.y -= d.sp * dt;
      if (d.y < 22) { d.y = 326; d.x = rnd(34, 266); }
      d.el.setAttribute("cx", (d.x + Math.sin(performance.now() / 1400 + d.ph) * 5).toFixed(2));
      d.el.setAttribute("cy", d.y.toFixed(2));
    }

    if (poke > 0) poke = Math.max(0, poke - dt * 1.9);
  }

  /* ================= ЦИКЛ ================= */
  let running = false, raf = 0, last = 0, visible = true, measureT = 0;

  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000) || 0;
    last = ts;

    measureT += dt;
    if (measureT > 0.5) { measureT = 0; measure(); }

    if (talking) {
      typed += dt * 32;
      const full = LINES[idx];
      if (typed >= full.length) { typed = full.length; talking = false; caret.classList.add("is-off"); }
      textEl.textContent = full.slice(0, Math.floor(typed));
    } else {
      nextIn -= dt;
      if (nextIn <= 0) say(pickNext(), false);
    }

    render(dt);
  }

  function start() {
    if (running || !visible || document.hidden || reduced) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function syncLoop() { (visible && !document.hidden && !reduced) ? start() : stop(); }

  /* ================= СОБЫТИЯ ================= */
  const onScroll = () => measure();
  const onLeave = () => { hasPointer = false; };

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
  stage.addEventListener("click", () => say(pickNext(), true));

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) measure();
    syncLoop();
  }, { threshold: 0.04 });
  io.observe(rail);

  document.addEventListener("visibilitychange", syncLoop);

  let autoTimer = 0;
  if (reduced) {
    autoTimer = setInterval(() => { if (visible && !document.hidden) say(pickNext(), false); }, 14000);
  }

  window.addEventListener("pagehide", () => {
    stop(); io.disconnect(); clearInterval(autoTimer);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("pointerdown", onPointer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
  });

  /* ================= СТАРТ ================= */
  measure();
  say(0, false);
  render(0);
  syncLoop();
})();
