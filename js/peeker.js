(() => {
  "use strict";

  if (document.getElementById("pkLayer")) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ================= ПЕРСОНАЖ ================= */
  const SVG = `
  <svg viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath id="pkLens">
        <circle cx="128" cy="126" r="19"/><circle cx="172" cy="126" r="19"/>
      </clipPath>
    </defs>

    <g id="pkRoot">
      <!-- ТОРС -->
      <g id="pkBody">
        <path d="M104,232 C104,206 118,196 132,192 L168,192 C182,196 196,206 196,232 Z"
              fill="var(--pk-hood2)" stroke="var(--pk-line)" stroke-width="4" stroke-linejoin="round"/>
        <path d="M62,320 C62,262 82,236 116,226 L184,226 C218,236 238,262 238,320 Z"
              fill="var(--pk-hood)" stroke="var(--pk-line)" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M116,226 C130,244 170,244 184,226" fill="none" stroke="var(--pk-line)" stroke-width="4" stroke-linecap="round"/>
        <path d="M104,304 C122,288 178,288 196,304" fill="none" stroke="var(--pk-line)" stroke-width="3.4" opacity=".65" stroke-linecap="round"/>
        <path d="M138,238 L146,266 M162,238 L154,266" fill="none" stroke="var(--pk-string)" stroke-width="4" stroke-linecap="round"/>
        <circle cx="150" cy="271" r="6.5" fill="var(--pk-string)"/>
        <path d="M147,277 L143,300 M153,277 L157,300" fill="none" stroke="var(--pk-string)" stroke-width="4" stroke-linecap="round"/>
      </g>

      <!-- РУКИ -->
      <g id="pkArmL">
        <path d="M100,238 L96,282 L98,316" fill="none" stroke="var(--pk-line)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M100,238 L96,282 L98,316" fill="none" stroke="var(--pk-hood)" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="98" cy="316" r="13" fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4"/>
      </g>

      <g id="pkArmR">
        <path d="M200,238 L204,282 L202,316" fill="none" stroke="var(--pk-line)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M200,238 L204,282 L202,316" fill="none" stroke="var(--pk-hood)" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
        <g id="pkHandR">
          <rect id="pkThumb" x="196" y="292" width="11" height="20" rx="5.5"
                fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4" opacity="0"/>
          <circle cx="202" cy="316" r="13" fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4"/>
        </g>
      </g>

      <!-- СОГНУТАЯ РУКА: УСТРОЙСТВО -->
      <g id="pkBentVape" opacity="0">
        <path d="M200,238 L216,208 L182,182" fill="none" stroke="var(--pk-line)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M200,238 L216,208 L182,182" fill="none" stroke="var(--pk-hood)" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
        <g transform="rotate(34 172 164)">
          <rect x="164" y="144" width="16" height="40" rx="5" fill="var(--pk-line)"/>
          <rect x="167" y="150" width="10" height="14" rx="2" fill="var(--pk-hood)"/>
          <rect x="167" y="138" width="10" height="8" rx="3" fill="var(--pk-face)"/>
        </g>
        <circle cx="182" cy="182" r="13" fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4"/>
      </g>

      <!-- СОГНУТАЯ РУКА: ОЧКИ -->
      <g id="pkBentFace" opacity="0">
        <path d="M200,238 L220,190 L186,132" fill="none" stroke="var(--pk-line)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M200,238 L220,190 L186,132" fill="none" stroke="var(--pk-hood)" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="186" cy="132" r="13" fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4"/>
      </g>

      <!-- ГОЛОВА -->
      <g id="pkHead">
        <rect x="132" y="188" width="36" height="36" rx="12" fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4"/>
        <ellipse cx="104" cy="132" rx="8.5" ry="11.5" fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4"/>
        <ellipse cx="196" cy="132" rx="8.5" ry="11.5" fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4"/>
        <path d="M106,84 L194,84 L194,146 C194,177 174,197 150,197 C126,197 106,177 106,146 Z"
              fill="var(--pk-face)" stroke="var(--pk-line)" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M100,74 C100,36 118,18 150,18 C182,18 200,36 200,74 Z"
              fill="var(--pk-cap)" stroke="var(--pk-line)" stroke-width="4.5" stroke-linejoin="round"/>
        <rect x="93" y="66" width="114" height="19" rx="9.5"
              fill="var(--pk-cap)" stroke="var(--pk-line)" stroke-width="4.5"/>
        <path d="M116,101 L140,97 M160,97 L184,101" fill="none" stroke="var(--pk-line)" stroke-width="5" stroke-linecap="round"/>
        <path d="M109,121 L104,118 M191,121 L196,118 M147,126 L153,126"
              fill="none" stroke="var(--pk-line)" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="128" cy="126" r="19" fill="var(--pk-lens)" stroke="var(--pk-line)" stroke-width="4"/>
        <circle cx="172" cy="126" r="19" fill="var(--pk-lens)" stroke="var(--pk-line)" stroke-width="4"/>
        <g clip-path="url(#pkLens)">
          <rect id="pkGlint" x="86" y="100" width="13" height="54" fill="#ffffff" opacity=".55" transform="skewX(-20)"/>
        </g>
        <path id="pkMouth" d="M136,168 Q150,175 164,168" fill="none" stroke="var(--pk-line)" stroke-width="4.5" stroke-linecap="round"/>
      </g>

      <!-- ПАР -->
      <g id="pkVapor" fill="var(--pk-line)" opacity="0"></g>
    </g>
  </svg>`;

  const layer = document.createElement("div");
  layer.id = "pkLayer";
  layer.innerHTML = `
    <div class="pk-slot" id="pkSlot">
      <div class="pk-move" id="pkMove">
        <div class="pk-rot" id="pkRot">${SVG}</div>
      </div>
    </div>
    <div class="pk-say" id="pkSay"></div>`;
  document.body.appendChild(layer);

  /* ================= СТИЛИ ================= */
  const style = document.createElement("style");
  style.id = "pkStyles";
  style.textContent = `
    #pkLayer{position:fixed;inset:0;z-index:9500;pointer-events:none;overflow:hidden;
      --pk-line:#f2f4f7;--pk-face:#f4f6f8;--pk-hood:#14171c;--pk-hood2:#262b32;
      --pk-cap:#0d0f12;--pk-lens:#08090b;--pk-string:#f2f4f7;--pk-halo:#08090b;--pk-ink:#f4f6f8}
    #pkLayer[data-theme="light"]{
      --pk-line:#101317;--pk-face:#ffffff;--pk-hood:#2a2f36;--pk-hood2:#3d444d;
      --pk-cap:#14171b;--pk-lens:#08090b;--pk-string:#ffffff;--pk-halo:#e4e8ed;--pk-ink:#101317}
    .pk-slot{position:absolute;overflow:hidden;opacity:0}
    .pk-move,.pk-rot{width:100%;height:100%}
    .pk-rot{transform-origin:50% 50%}
    .pk-slot svg{width:100%;height:100%;display:block;overflow:visible;
      filter:drop-shadow(0 8px 20px rgba(0,0,0,.45))}
    #pkLayer[data-theme="light"] .pk-slot svg{filter:drop-shadow(0 8px 18px rgba(20,26,34,.28))}
    #pkBody{transform-box:view-box;transform-origin:150px 320px;animation:pkBreath 3.4s ease-in-out infinite}
    @keyframes pkBreath{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.014)}}
    #pkHead{transform-box:view-box;transform-origin:150px 196px}
    #pkArmL{transform-box:view-box;transform-origin:100px 238px}
    #pkArmR{transform-box:view-box;transform-origin:200px 238px}
    #pkHandR{transform-box:view-box;transform-origin:202px 316px}
    #pkGlint{animation:pkGlint 5.2s ease-in-out infinite}
    @keyframes pkGlint{0%,72%{transform:skewX(-20deg) translateX(0)}
      86%{transform:skewX(-20deg) translateX(120px)}100%{transform:skewX(-20deg) translateX(120px)}}
    .pk-say{position:absolute;max-width:230px;text-align:center;opacity:0;
      font:800 13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.01em;
      color:var(--pk-ink);transform:translate(-50%,-50%);
      text-shadow:2px 0 0 var(--pk-halo),-2px 0 0 var(--pk-halo),0 2px 0 var(--pk-halo),0 -2px 0 var(--pk-halo),
        2px 2px 0 var(--pk-halo),-2px -2px 0 var(--pk-halo),2px -2px 0 var(--pk-halo),-2px 2px 0 var(--pk-halo),
        0 0 10px var(--pk-halo)}
    @media (prefers-reduced-motion:reduce){#pkBody,#pkGlint{animation:none}}
  `;
  document.head.appendChild(style);

  /* ================= ССЫЛКИ ================= */
  const $ = (id) => document.getElementById(id);
  const slot = $("pkSlot"), move = $("pkMove"), rot = $("pkRot"), say = $("pkSay");
  const svg = slot.querySelector("svg");
  const gHead = $("pkHead"), gArmL = $("pkArmL"), gArmR = $("pkArmR"), gHand = $("pkHandR");
  const gVape = $("pkBentVape"), gFace = $("pkBentFace"), gThumb = $("pkThumb");
  const gVapor = $("pkVapor"), gMouth = $("pkMouth"), gRoot = $("pkRoot");

  function theme() {
    layer.dataset.theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  theme();
  window.addEventListener("vh:theme", theme);

  for (let i = 0; i < 6; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(150 + i * 3));
    c.setAttribute("cy", "170");
    c.setAttribute("r", String(4 + i * 1.6));
    c.setAttribute("opacity", "0");
    gVapor.appendChild(c);
  }
  const puffs = [...gVapor.children];

  /* ================= РЕПЛИКИ ================= */
  const SAY = {
    peek: ["Я просто смотрю.", "Есть 18? Проходи.", "Продолжай, я не мешаю.", "Тут учат, а не впаривают."],
    wave: ["Здарова.", "Ну привет.", "На связи."],
    point: ["Смотри совместимость.", "Вот это берите.", "Картридж подобрали?"],
    thumbs: ["Хороший выбор.", "Одобряю.", "Вот это правильно."],
    vape: ["Плотненько.", "Ω ниже — пара больше.", "Только не на кассе."],
    shrug: ["А я почём знаю.", "Спроси у старшего.", "Ну такое."],
    glasses: ["Дай-ка присмотрюсь.", "Вижу всё.", "Проверяю."],
    slide: ["Мимо.", "Работаю.", "Обход делаю."]
  };

  /* ================= РАЗМЕРЫ И МЕСТА ================= */
  function size() {
    const small = innerWidth < 620;
    return { w: small ? 148 : 200, h: small ? 158 : 214 };
  }

  function places() {
    const { w, h } = size();
    const vw = innerWidth, vh = innerHeight;
    const out = [];
    const toastUp = !!document.querySelector(".toast.show");

    if (vw > w + 80) {
      const xs = [];
      for (let i = 0; i < 6; i++) {
        const x = rnd(20, vw - w - 20);
        if (toastUp && Math.abs(x + w / 2 - vw / 2) < 230) continue;
        xs.push(x);
      }
      if (xs.length) {
        out.push({ kind: "bottom", x: pick(xs), y: vh - h, w, h, axis: "y", from: 100, to: 32, angle: 0 });
        out.push({ kind: "top", x: pick(xs), y: 0, w, h, axis: "y", from: -100, to: -32, angle: 180 });
      }
    }
    if (vh > h + 160) {
      const y = rnd(90, vh - h - 60);
      out.push({ kind: "left", x: 0, y, w, h, axis: "x", from: -100, to: -30, angle: 7 });
      out.push({ kind: "right", x: vw - w, y, w, h, axis: "x", from: 100, to: 30, angle: -7 });
    }

    const anchors = document.querySelectorAll(".card, .panel, .mini-card, .question, .stage");
    const good = [];
    anchors.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 190 || r.height < 90) return;
      if (r.top < h * 0.72 + 30 || r.top > vh - 90) return;
      if (r.left < 8 || r.right > vw - 8) return;
      if (toastUp && r.top > vh - 220) return;
      good.push(r);
    });
    if (good.length) {
      const r = pick(good);
      const x = clamp(r.left + rnd(10, Math.max(12, r.width - w - 10)), 8, vw - w - 8);
      out.push({ kind: "anchor", x, y: r.top - h, w, h, axis: "y", from: 100, to: 32, angle: 0 });
      out.push({ kind: "anchor", x, y: r.top - h, w, h, axis: "y", from: 100, to: 32, angle: 0 });
    }
    return out;
  }

  /* ================= АНИМАЦИЯ ================= */
  let running = [];
  const anim = (el, frames, opts) => {
    if (!el) return Promise.resolve();
    const a = el.animate(frames, Object.assign({ fill: "forwards", easing: "ease" }, opts));
    running.push(a);
    return a.finished.catch(() => {});
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function clearAnims() {
    running.forEach((a) => { try { a.cancel(); } catch {} });
    running = [];
  }

  function resetPose() {
    clearAnims();
    [gHead, gArmL, gArmR, gHand, gRoot].forEach((el) => el && (el.style.transform = ""));
    gVape.setAttribute("opacity", "0");
    gFace.setAttribute("opacity", "0");
    gThumb.setAttribute("opacity", "0");
    gVapor.setAttribute("opacity", "0");
    puffs.forEach((p) => { p.setAttribute("opacity", "0"); p.style.transform = ""; });
    gMouth.setAttribute("d", "M136,168 Q150,175 164,168");
    say.style.opacity = "0";
    say.textContent = "";
  }

  function armPose(deg, ms) {
    return Promise.all([
      anim(gArmR, [{ transform: `rotate(${deg}deg)` }], { duration: ms, easing: "cubic-bezier(.3,1.3,.5,1)" }),
      anim(gHand, [{ transform: `rotate(${-deg}deg)` }], { duration: ms, easing: "cubic-bezier(.3,1.3,.5,1)" })
    ]);
  }

  async function gesture(kind) {
    if (reduced) { await wait(1800); return; }

    if (kind === "wave") {
      await armPose(-152, 420);
      for (let i = 0; i < 3; i++) {
        await Promise.all([
          anim(gArmR, [{ transform: "rotate(-152deg)" }, { transform: "rotate(-136deg)" }, { transform: "rotate(-160deg)" }, { transform: "rotate(-152deg)" }], { duration: 620 }),
          anim(gHand, [{ transform: "rotate(152deg)" }, { transform: "rotate(136deg)" }, { transform: "rotate(160deg)" }, { transform: "rotate(152deg)" }], { duration: 620 })
        ]);
      }
      await armPose(0, 380);
      return;
    }

    if (kind === "point") {
      await armPose(-96, 400);
      await anim(gArmR, [{ transform: "rotate(-96deg)" }, { transform: "rotate(-88deg)" }, { transform: "rotate(-96deg)" }], { duration: 700, iterations: 2 });
      await anim(gHand, [{ transform: "rotate(96deg)" }], { duration: 10 });
      await armPose(0, 380);
      return;
    }

    if (kind === "thumbs") {
      gThumb.setAttribute("opacity", "1");
      await armPose(-150, 430);
      await anim(gRoot, [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }, { transform: "translateY(0)" }], { duration: 620, iterations: 2 });
      await armPose(0, 360);
      gThumb.setAttribute("opacity", "0");
      return;
    }

    if (kind === "shrug") {
      await Promise.all([
        anim(gArmL, [{ transform: "rotate(0deg)" }, { transform: "rotate(38deg)" }], { duration: 380 }),
        anim(gArmR, [{ transform: "rotate(0deg)" }, { transform: "rotate(-38deg)" }], { duration: 380 }),
        anim(gHand, [{ transform: "rotate(0deg)" }, { transform: "rotate(38deg)" }], { duration: 380 }),
        anim(gHead, [{ transform: "rotate(0deg)" }, { transform: "rotate(-5deg)" }], { duration: 380 })
      ]);
      await wait(900);
      await Promise.all([
        anim(gArmL, [{ transform: "rotate(0deg)" }], { duration: 340 }),
        anim(gArmR, [{ transform: "rotate(0deg)" }], { duration: 340 }),
        anim(gHand, [{ transform: "rotate(0deg)" }], { duration: 340 }),
        anim(gHead, [{ transform: "rotate(0deg)" }], { duration: 340 })
      ]);
      return;
    }

    if (kind === "glasses") {
      gArmR.style.opacity = "0";
      gFace.setAttribute("opacity", "1");
      await anim(gFace, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 340 });
      await anim(gHead, [{ transform: "rotate(0deg)" }, { transform: "rotate(-3deg)" }, { transform: "rotate(0deg)" }], { duration: 900 });
      await wait(500);
      await anim(gFace, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
      gFace.setAttribute("opacity", "0");
      gArmR.style.opacity = "";
      return;
    }

    if (kind === "vape") {
      gArmR.style.opacity = "0";
      gVape.setAttribute("opacity", "1");
      await anim(gVape, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 340 });
      await anim(gMouth, [{ d: "M136,168 Q150,175 164,168" }, { d: "M138,166 Q150,182 162,166" }], { duration: 260 }).catch(() => {});
      await wait(420);
      gVapor.setAttribute("opacity", "1");
      puffs.forEach((p, i) => {
        anim(p, [
          { opacity: 0, transform: "translate(0,0) scale(.5)" },
          { opacity: 0.42, offset: 0.3, transform: `translate(${10 + i * 5}px,-${14 + i * 6}px) scale(1)` },
          { opacity: 0, transform: `translate(${26 + i * 12}px,-${52 + i * 16}px) scale(1.9)` }
        ], { duration: 1500 + i * 130, delay: i * 110, easing: "cubic-bezier(.2,.7,.3,1)" });
      });
      await wait(1500);
      await anim(gVape, [{ opacity: 1 }, { opacity: 0, transform: "translateY(12px)" }], { duration: 320 });
      gVape.setAttribute("opacity", "0");
      gVapor.setAttribute("opacity", "0");
      gArmR.style.opacity = "";
      gMouth.setAttribute("d", "M136,168 Q150,175 164,168");
      return;
    }

    if (kind === "slide") {
      await anim(gHead, [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(0)" }], { duration: 1400 });
      return;
    }

    await anim(gHead, [
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(-8px) rotate(-4deg)" },
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(8px) rotate(4deg)" },
      { transform: "translateX(0) rotate(0deg)" }
    ], { duration: 2200, easing: "ease-in-out" });
  }

  function sayWhere(p, text) {
    if (!text) return;
    const vw = innerWidth, vh = innerHeight;
    let x, y;
    if (p.kind === "top") { x = p.x + p.w / 2; y = p.h * 0.7 + 26; }
    else if (p.kind === "left") { x = p.w + 96; y = p.y + p.h * 0.34; }
    else if (p.kind === "right") { x = vw - p.w - 96; y = p.y + p.h * 0.34; }
    else { x = p.x + p.w / 2; y = p.y + p.h * 0.32 - 20; }
    say.textContent = text;
    say.style.left = clamp(x, 110, vw - 110) + "px";
    say.style.top = clamp(y, 26, vh - 26) + "px";
  }

  /* ================= ЦИКЛ ПОЯВЛЕНИЯ ================= */
  let timer = 0, busy = false, alive = true;

  function blocked() {
    if (document.hidden) return true;
    const lb = $("lightbox");
    if (lb && !lb.hidden) return true;
    const login = $("loginOverlay");
    if (login && !login.classList.contains("hidden") && getComputedStyle(login).display !== "none") return true;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    return false;
  }

  async function appear() {
    const list = places();
    if (!list.length) return;
    const p = pick(list);
    const act = p.kind === "top" ? pick(["peek", "glasses", "wave"])
      : (p.kind === "left" || p.kind === "right") ? pick(["peek", "point", "thumbs", "shrug"])
      : pick(["peek", "wave", "point", "thumbs", "vape", "shrug", "glasses", "slide"]);

    resetPose();
    slot.style.left = p.x + "px";
    slot.style.top = p.y + "px";
    slot.style.width = p.w + "px";
    slot.style.height = p.h + "px";
    rot.style.transform = `rotate(${p.angle}deg)`;

    const from = p.axis === "y" ? `translateY(${p.from}%)` : `translateX(${p.from}%)`;
    const to = p.axis === "y" ? `translateY(${p.to}%)` : `translateX(${p.to}%)`;
    move.style.transform = from;

    slot.style.opacity = "1";
    if (reduced) {
      move.style.transform = to;
      await anim(slot, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      sayWhere(p, pick(SAY[act] || SAY.peek));
      await anim(say, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      await wait(3200);
      await Promise.all([
        anim(say, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 }),
        anim(slot, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 })
      ]);
      slot.style.opacity = "0";
      return;
    }

    await anim(move, [{ transform: from }, { transform: to }], {
      duration: 720, easing: "cubic-bezier(.22,1.1,.3,1)"
    });

    sayWhere(p, pick(SAY[act] || SAY.peek));
    anim(say, [{ opacity: 0, transform: "translate(-50%,-40%)" }, { opacity: 1, transform: "translate(-50%,-50%)" }], { duration: 340 });

    if (act === "slide") {
      const dist = clamp(innerWidth * 0.32, 120, 420);
      const dir = p.x + p.w / 2 < innerWidth / 2 ? 1 : -1;
      const target = clamp(p.x + dist * dir, 8, innerWidth - p.w - 8);
      anim(slot, [{ left: p.x + "px" }, { left: target + "px" }], { duration: 2600, easing: "ease-in-out" });
      await gesture("slide");
    } else {
      await gesture(act);
    }

    await anim(say, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 });
    await anim(move, [{ transform: to }, { transform: from }], {
      duration: 560, easing: "cubic-bezier(.5,0,.75,.4)"
    });
    slot.style.opacity = "0";
    resetPose();
  }

  function schedule(first) {
    clearTimeout(timer);
    if (!alive) return;
    const gap = reduced ? rnd(26000, 44000) : first ? rnd(4000, 8000) : rnd(11000, 22000);
    timer = setTimeout(tick, gap);
  }

  async function tick() {
    if (!alive) return;
    if (busy || blocked()) { schedule(); return; }
    busy = true;
    try { await appear(); } catch {}
    busy = false;
    schedule();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(timer);
      resetPose();
      slot.style.opacity = "0";
      busy = false;
    } else {
      schedule(true);
    }
  });

  window.addEventListener("pagehide", () => {
    alive = false;
    clearTimeout(timer);
    resetPose();
  });

  window.VHPeeker = {
    stop() { alive = false; clearTimeout(timer); resetPose(); slot.style.opacity = "0"; },
    start() { if (!alive) { alive = true; schedule(true); } },
    now() { if (!busy && !blocked()) tick(); }
  };

  schedule(true);
})();
