(() => {
  "use strict";

  const KEY = "vh_theme";
  const MODES = ["auto", "light", "dark"];
  const LABEL = { auto: "Авто", light: "Светлая", dark: "Тёмная" };
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: light)");

  let mode = "dark";
  try {
    const saved = localStorage.getItem(KEY);
    if (MODES.includes(saved)) mode = saved;
  } catch {}

  const resolve = () => (mode === "auto" ? (mq.matches ? "light" : "dark") : mode);

  function meta(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  let live = null;

  function apply(announce) {
    const theme = resolve();
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-mode", mode);
    root.style.colorScheme = theme;
    meta("theme-color", theme === "light" ? "#e4e8ed" : "#08090b");
    meta("color-scheme", theme);

    const sw = document.getElementById("vhThemeSwitch");
    if (sw) {
      sw.style.setProperty("--i", String(MODES.indexOf(mode)));
      sw.querySelectorAll(".vh-ts__b").forEach((b) => {
        b.setAttribute("aria-checked", String(b.dataset.mode === mode));
        b.tabIndex = b.dataset.mode === mode ? 0 : -1;
      });
    }
    if (announce && live) {
      live.textContent = mode === "auto" ? `Тема: авто, сейчас ${LABEL[theme].toLowerCase()}` : `Тема: ${LABEL[mode].toLowerCase()}`;
    }
    try { window.dispatchEvent(new CustomEvent("vh:theme", { detail: { theme, mode } })); } catch {}
  }

  function set(next, announce = true) {
    mode = MODES.includes(next) ? next : "dark";
    try { localStorage.setItem(KEY, mode); } catch {}
    apply(announce);
  }

  function cycle() {
    set(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
  }

  apply(false);

  const ICON = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 8.2a3.8 3.8 0 0 1 0 7.6z" fill="currentColor" stroke="none"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.6M12 19v2.6M2.4 12h2.6M19 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.6A8.7 8.7 0 0 1 9.4 3.5a8.8 8.8 0 1 0 11.1 11.1z"/></svg>'
  };

  function build() {
    if (document.getElementById("vhThemeSwitch")) return;

    const sw = document.createElement("div");
    sw.id = "vhThemeSwitch";
    sw.className = "vh-ts";
    sw.setAttribute("role", "radiogroup");
    sw.setAttribute("aria-label", "Тема оформления");
    sw.innerHTML =
      `<span class="vh-ts__ind" aria-hidden="true"></span>` +
      MODES.map((m) => `
        <button class="vh-ts__b" type="button" role="radio" data-mode="${m}"
                aria-checked="false" title="${LABEL[m]} тема (Alt+T)">
          ${ICON[m]}<span>${LABEL[m]}</span>
        </button>`).join("");

    const bar = document.querySelector(".tabs");
    const actions = document.querySelector(".header-actions");
    const header = document.querySelector(".header");

    if (bar) {
      sw.classList.add("vh-ts--bar");
      bar.appendChild(sw);
    } else if (actions) {
      actions.insertBefore(sw, actions.firstChild);
    } else if (header) {
      sw.classList.add("vh-ts--bar");
      header.appendChild(sw);
    } else {
      sw.style.position = "fixed";
      sw.style.right = "16px";
      sw.style.bottom = "16px";
      sw.style.zIndex = "9990";
      sw.style.boxShadow = "var(--shadow)";
      document.body.appendChild(sw);
    }

    live = document.createElement("span");
    live.className = "vh-sr";
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);

    sw.addEventListener("click", (e) => {
      const btn = e.target.closest(".vh-ts__b");
      if (btn) set(btn.dataset.mode);
    });

    sw.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = MODES[(MODES.indexOf(mode) + dir + MODES.length) % MODES.length];
      set(next);
      sw.querySelector(`.vh-ts__b[data-mode="${next}"]`)?.focus();
    });

    apply(false);
  }

  document.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "t" || e.key === "T" || e.code === "KeyT")) {
      e.preventDefault();
      cycle();
    }
  });

  const onSystem = () => { if (mode === "auto") apply(true); };
  if (mq.addEventListener) mq.addEventListener("change", onSystem);
  else if (mq.addListener) mq.addListener(onSystem);

  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const next = MODES.includes(e.newValue) ? e.newValue : "dark";
    if (next !== mode) { mode = next; apply(true); }
  });

  window.VHTheme = {
    get mode() { return mode; },
    get theme() { return resolve(); },
    set,
    cycle
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build, { once: true });
  } else {
    build();
  }
})();
