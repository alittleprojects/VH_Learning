(() => {
  // ================= КОНСТАНТЫ =================
  const STORAGE_KEY = "vape_academy_catalog_v6";
  const MISTAKES_KEY = "vape_academy_mistakes_v6";

  // ================= УТИЛИТЫ =================
  const $ = (id) => document.getElementById(id);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const sample = (arr, n) => shuffle(arr).slice(0, n);

  const esc = (s = "") => String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));

  const money = (n) => {
    const num = Number(n || 0);
    return num ? `${num.toLocaleString("ru-RU")} ₽` : "цена не указана";
  };

  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;

  // Безопасный доступ к элементам (возвращает null если нет)
  const el = (id) => document.getElementById(id);

  // ================= СОСТОЯНИЕ =================
  let db = loadDb();
  let view = "devices";
  let currentBrand = "Все";
  let quiz = { questions: [], index: 0, score: 0, answered: false };

  // ================= РАБОТА С БАЗОЙ =================
  function normalize(data) {
    data = data || {};
    data.meta = data.meta || {};
    data.coils = Array.isArray(data.coils) ? data.coils : [];
    data.devices = Array.isArray(data.devices) ? data.devices : [];

    data.coils.forEach((c) => {
      c.id ||= uid("coil");
      c.brand ||= ""; c.name ||= ""; c.resistance ||= "";
      c.type ||= "картридж";
      c.price = Number(c.price || 0);
      c.image ||= "";
      c.description ||= "";
    });

    data.devices.forEach((d) => {
      d.id ||= uid("dev");
      d.brand ||= ""; d.model ||= ""; d.type ||= "POD";
      d.price = Number(d.price || 0);
      d.image ||= "";
      d.popular = Boolean(d.popular);
      d.coils = Array.isArray(d.coils) ? d.coils : [];
      d.description ||= "";
    });

    return data;
  }

  function loadDb() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalize(JSON.parse(saved));
    } catch (e) { console.warn(e); }
    return normalize(clone(window.CATALOG_DATA || { devices: [], coils: [] }));
  }

  function saveDb() {
    try {
      db.meta.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      alert("Не удалось сохранить. Возможно, переполнено хранилище браузера.");
      console.error(e);
    }
  }

  // ================= ХЕЛПЕРЫ =================
  const coilById = (id) => db.coils.find((c) => c.id === id);
  const deviceById = (id) => db.devices.find((d) => d.id === id);
  const coilLabel = (c) => c ? `${c.brand} ${c.name} ${c.resistance || ""}`.trim() : "Неизвестный картридж";
  const deviceLabel = (d) => d ? `${d.brand} ${d.model}`.trim() : "Неизвестное устройство";
  const compatibleCoils = (d) => (d.coils || []).map(coilById).filter(Boolean);
  const compatibleDevices = (c) => db.devices.filter((d) => (d.coils || []).includes(c.id));

  function toFullUrl(src) {
    if (!src) return "";
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    if (src.startsWith("images/")) {
      return "https://raw.githubusercontent.com/ilushka28/VH_Learning/main/" + src;
    }
    return src;
  }

  function imageBox(item, label) {
    const has = Boolean(item.image);
    const fullUrl = has ? toFullUrl(item.image) : "";
    return `
      <div class="photo ${has ? "has" : ""}">
        ${has ? `<img src="${esc(fullUrl)}" alt="${esc(label)}" onerror="this.closest('.photo').classList.remove('has');this.remove()">` : ""}
        <b>${esc(label)}</b>
      </div>
    `;
  }

  function setPreview(img, src) {
    if (!img) return;
    if (!src) {
      img.removeAttribute("src");
      img.hidden = true;
      return;
    }
    img.src = toFullUrl(src);
    img.hidden = false;
    img.onerror = () => {
      img.hidden = true;
      console.warn("Не удалось загрузить фото:", img.src);
    };
  }

  // ================= ВКЛАДКИ =================
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".page").forEach((p) => { p.classList.remove("active"); p.hidden = true; });
      btn.classList.add("active");
      const page = el(btn.dataset.tab);
      if (page) {
        page.hidden = false;
        page.classList.add("active");
      }
    });
  });

  // ================= КАТАЛОГ =================
  const searchInput = el("searchInput");
  const brandFilter = el("brandFilter");
  const viewDevices = el("viewDevices");
  const viewCoils = el("viewCoils");
  const catalogStats = el("catalogStats");
  const catalogGrid = el("catalogGrid");

  if (searchInput) searchInput.addEventListener("input", renderCatalog);
  if (brandFilter) brandFilter.addEventListener("change", () => {
    currentBrand = brandFilter.value;
    renderCatalog();
  });
  if (viewDevices) viewDevices.addEventListener("click", () => {
    view = "devices";
    viewDevices.classList.add("active");
    viewCoils?.classList.remove("active");
    renderCatalog();
  });
  if (viewCoils) viewCoils.addEventListener("click", () => {
    view = "coils";
    viewCoils.classList.add("active");
    viewDevices?.classList.remove("active");
    renderCatalog();
  });

  function renderBrandFilter() {
    if (!brandFilter) return;
    const brands = ["Все", ...new Set([
      ...db.devices.map((d) => d.brand),
      ...db.coils.map((c) => c.brand)
    ].filter(Boolean))].sort((a, b) => {
      if (a === "Все") return -1;
      if (b === "Все") return 1;
      return a.localeCompare(b);
    });
    brandFilter.innerHTML = brands.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
    brandFilter.value = brands.includes(currentBrand) ? currentBrand : "Все";
    currentBrand = brandFilter.value;
  }

  function renderCatalog() {
    if (!catalogGrid) return;
    const q = searchInput?.value.trim().toLowerCase() || "";

    if (view === "devices") {
      const list = db.devices.filter((d) => {
        const coilText = compatibleCoils(d).map(coilLabel).join(" ");
        const text = `${d.brand} ${d.model} ${d.type} ${d.price} ${d.description} ${coilText}`.toLowerCase();
        return (currentBrand === "Все" || d.brand === currentBrand) && (!q || text.includes(q));
      }).sort((a, b) => Number(b.popular) - Number(a.popular));

      if (catalogStats) catalogStats.textContent = `Устройств: ${list.length} из ${db.devices.length}`;
      catalogGrid.innerHTML = list.map(deviceCard).join("") || `<div class="empty">Ничего не найдено</div>`;
    } else {
      const list = db.coils.filter((c) => {
        const devicesText = compatibleDevices(c).map(deviceLabel).join(" ");
        const text = `${c.brand} ${c.name} ${c.resistance} ${c.type} ${c.price} ${c.description} ${devicesText}`.toLowerCase();
        return (currentBrand === "Все" || c.brand === currentBrand) && (!q || text.includes(q));
      });

      if (catalogStats) catalogStats.textContent = `Испарителей / картриджей: ${list.length} из ${db.coils.length}`;
      catalogGrid.innerHTML = list.map(coilCard).join("") || `<div class="empty">Ничего не найдено</div>`;
    }
  }

  function deviceCard(d) {
    const coils = compatibleCoils(d);
    return `
      <article class="card">
        ${d.popular ? `<div class="badge">ХИТ</div>` : ""}
        ${imageBox(d, d.model)}
        <div class="card-body">
          <div class="brand">${esc(d.brand)}</div>
          <div class="title">${esc(d.model)}</div>
          <div class="meta">
            <span class="pill">${esc(d.type || "POD")}</span>
            <span class="pill price">${money(d.price)}</span>
          </div>
          ${d.description ? `<div class="description">${esc(d.description)}</div>` : ""}
          <div class="compat">
            <h4>Подходящие картриджи / испарители:</h4>
            <div class="chips">
              ${coils.length
                ? coils.map((c) => `<span class="chip">${esc(coilLabel(c))} · ${money(c.price)}</span>`).join("")
                : `<span class="chip">Совместимость не заполнена</span>`}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function coilCard(c) {
    const devices = compatibleDevices(c);
    return `
      <article class="card">
        ${imageBox(c, `${c.name} ${c.resistance || ""}`)}
        <div class="card-body">
          <div class="brand">${esc(c.brand)}</div>
          <div class="title">${esc(c.name)} ${esc(c.resistance || "")}</div>
          <div class="meta">
            <span class="pill">${esc(c.type || "картридж")}</span>
            <span class="pill price">${money(c.price)}</span>
          </div>
          ${c.description ? `<div class="description">${esc(c.description)}</div>` : ""}
          <div class="compat">
            <h4>Подходит к устройствам:</h4>
            <div class="chips">
              ${devices.length
                ? devices.map((d) => `<span class="chip">${esc(deviceLabel(d))}</span>`).join("")
                : `<span class="chip">Нет привязанных устройств</span>`}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // ================= АДМИНКА (только если есть элементы) =================
  function renderAdmin() {
    const adminStats = el("adminStats");
    const deviceSelect = el("deviceSelect");
    const coilSelect = el("coilSelect");

    if (!deviceSelect && !coilSelect) return; // Админки нет на странице — выходим

    if (adminStats) {
      adminStats.textContent =
        `В базе: ${db.devices.length} устройств, ${db.coils.length} испарителей. ` +
        `Обновлено: ${db.meta.updatedAt || "не указано"}`;
    }

    if (deviceSelect) {
      deviceSelect.innerHTML =
        `<option value="">— новое устройство —</option>` +
        db.devices.map((d) => `<option value="${esc(d.id)}">${esc(deviceLabel(d))}</option>`).join("");
    }

    if (coilSelect) {
      coilSelect.innerHTML =
        `<option value="">— новый испаритель / картридж —</option>` +
        db.coils.map((c) => `<option value="${esc(c.id)}">${esc(coilLabel(c))}</option>`).join("");
    }

    renderCompatChecks([]);
    clearDeviceForm(false);
    clearCoilForm(false);
  }

  function renderCompatChecks(selected = [], filter = "") {
    const compatChecks = el("compatChecks");
    if (!compatChecks) return;

    const f = filter.toLowerCase();
    const list = db.coils.filter((c) => {
      if (!f) return true;
      return `${c.brand} ${c.name} ${c.resistance}`.toLowerCase().includes(f);
    });

    compatChecks.innerHTML = list.length
      ? list.map((c) => `
          <label>
            <input type="checkbox" value="${esc(c.id)}" ${selected.includes(c.id) ? "checked" : ""}>
            <span>${esc(c.name)} ${esc(c.resistance || "")}</span>
            <span class="coil-brand">${esc(c.brand)}</span>
          </label>
        `).join("")
      : `<div class="muted">Картриджи не найдены. ${db.coils.length ? "Попробуй другой запрос." : "Сначала добавь картриджи."}</div>`;
  }

  const coilSearch = el("coilSearch");
  if (coilSearch) {
    coilSearch.addEventListener("input", () => {
      const selected = [...el("compatChecks").querySelectorAll("input:checked")].map((i) => i.value);
      renderCompatChecks(selected, coilSearch.value);
    });
  }

  // --- Форма устройства ---
  const deviceSelect = el("deviceSelect");
  if (deviceSelect) {
    deviceSelect.addEventListener("change", () => {
      const id = deviceSelect.value;
      if (!id) return clearDeviceForm(false);
      const d = deviceById(id);
      if (!d) return;

      el("dBrand").value = d.brand;
      el("dModel").value = d.model;
      el("dType").value = d.type;
      el("dPrice").value = d.price || "";
      el("dDescription").value = d.description || "";
      el("dPopular").checked = Boolean(d.popular);
      el("dImagePath").value = d.image || "";
      setPreview(el("dPreview"), d.image);
      if (coilSearch) coilSearch.value = "";
      renderCompatChecks(d.coils || []);
    });
  }

  const dImagePath = el("dImagePath");
  if (dImagePath) {
    dImagePath.addEventListener("input", () => {
      setPreview(el("dPreview"), dImagePath.value.trim());
    });
  }

  const deviceForm = el("deviceForm");
  if (deviceForm) {
    deviceForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = deviceSelect?.value || uid("dev");
      const compatChecks = el("compatChecks");
      const selectedCoils = compatChecks
        ? [...compatChecks.querySelectorAll("input:checked")].map((i) => i.value)
        : [];

      const item = {
        id,
        brand: el("dBrand").value.trim(),
        model: el("dModel").value.trim(),
        type: el("dType").value.trim() || "POD",
        price: Number(el("dPrice").value || 0),
        description: el("dDescription").value.trim(),
        popular: el("dPopular").checked,
        image: el("dImagePath").value.trim(),
        coils: selectedCoils
      };

      const idx = db.devices.findIndex((d) => d.id === id);
      if (idx >= 0) db.devices[idx] = item;
      else db.devices.push(item);

      saveDb();
      renderAll();
      if (deviceSelect) {
        deviceSelect.value = id;
        deviceSelect.dispatchEvent(new Event("change"));
      }
    });
  }

  const newDevice = el("newDevice");
  if (newDevice) newDevice.addEventListener("click", () => clearDeviceForm(true));

  const deleteDevice = el("deleteDevice");
  if (deleteDevice) {
    deleteDevice.addEventListener("click", () => {
      const id = deviceSelect?.value;
      if (!id) return alert("Выбери устройство для удаления.");
      if (!confirm("Удалить устройство?")) return;
      db.devices = db.devices.filter((d) => d.id !== id);
      saveDb();
      renderAll();
    });
  }

  function clearDeviceForm(resetSelect = true) {
    if (resetSelect && deviceSelect) deviceSelect.value = "";
    const form = el("deviceForm");
    if (form) form.reset();
    const preview = el("dPreview");
    if (preview) preview.hidden = true;
    if (coilSearch) coilSearch.value = "";
    renderCompatChecks([]);
  }

  // --- Форма испарителя ---
  const coilSelect = el("coilSelect");
  if (coilSelect) {
    coilSelect.addEventListener("change", () => {
      const id = coilSelect.value;
      if (!id) return clearCoilForm(false);
      const c = coilById(id);
      if (!c) return;

      el("cBrand").value = c.brand;
      el("cName").value = c.name;
      el("cResistance").value = c.resistance;
      el("cType").value = c.type;
      el("cPrice").value = c.price || "";
      el("cDescription").value = c.description || "";
      el("cImagePath").value = c.image || "";
      setPreview(el("cPreview"), c.image);
    });
  }

  const cImagePath = el("cImagePath");
  if (cImagePath) {
    cImagePath.addEventListener("input", () => {
      setPreview(el("cPreview"), cImagePath.value.trim());
    });
  }

  const coilForm = el("coilForm");
  if (coilForm) {
    coilForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = coilSelect?.value || uid("coil");

      const item = {
        id,
        brand: el("cBrand").value.trim(),
        name: el("cName").value.trim(),
        resistance: el("cResistance").value.trim(),
        type: el("cType").value.trim() || "картридж",
        price: Number(el("cPrice").value || 0),
        description: el("cDescription").value.trim(),
        image: el("cImagePath").value.trim()
      };

      const idx = db.coils.findIndex((c) => c.id === id);
      if (idx >= 0) db.coils[idx] = item;
      else db.coils.push(item);

      saveDb();
      renderAll();
      if (coilSelect) {
        coilSelect.value = id;
        coilSelect.dispatchEvent(new Event("change"));
      }
    });
  }

  const newCoil = el("newCoil");
  if (newCoil) newCoil.addEventListener("click", () => clearCoilForm(true));

  const deleteCoil = el("deleteCoil");
  if (deleteCoil) {
    deleteCoil.addEventListener("click", () => {
      const id = coilSelect?.value;
      if (!id) return alert("Выбери испаритель для удаления.");
      if (!confirm("Удалить испаритель? Он будет убран из совместимости устройств.")) return;
      db.coils = db.coils.filter((c) => c.id !== id);
      db.devices.forEach((d) => { d.coils = (d.coils || []).filter((cid) => cid !== id); });
      saveDb();
      renderAll();
    });
  }

  function clearCoilForm(resetSelect = true) {
    if (resetSelect && coilSelect) coilSelect.value = "";
    const form = el("coilForm");
    if (form) form.reset();
    const preview = el("cPreview");
    if (preview) preview.hidden = true;
  }

  // --- Экспорт / Импорт / Сброс ---
  const exportBtn = el("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      db.meta.updatedAt = new Date().toISOString();
      const content = `window.CATALOG_DATA = ${JSON.stringify(db, null, 2)};\n`;
      const blob = new Blob([content], { type: "application/javascript;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "catalog.js";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const importFile = el("importFile");
  if (importFile) {
    importFile.addEventListener("change", async () => {
      const file = importFile.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const start = text.indexOf("=");
          const end = text.lastIndexOf(";");
          parsed = JSON.parse(text.slice(start + 1, end));
        }
        db = normalize(parsed);
        saveDb();
        renderAll();
        alert("База импортирована.");
      } catch (e) {
        alert("Не удалось импортировать файл. Проверьте формат.");
        console.error(e);
      }
    });
  }

  const resetBtn = el("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("Сбросить локальные изменения и вернуть демо-базу?")) return;
      localStorage.removeItem(STORAGE_KEY);
      db = normalize(clone(window.CATALOG_DATA || { devices: [], coils: [] }));
      renderAll();
    });
  }

  // ================= ТРЕНАЖЁР =================
  const startQuiz = el("startQuiz");
  if (startQuiz) {
    startQuiz.addEventListener("click", startQuizFn);
  }

  const clearMistakes = el("clearMistakes");
  if (clearMistakes) {
    clearMistakes.addEventListener("click", () => {
      localStorage.removeItem(MISTAKES_KEY);
      renderMistakes();
    });
  }

  function startQuizFn() {
    const mode = el("trainMode")?.value || "mix";
    const count = Number(el("trainCount")?.value || 10);
    const questions = [];
    for (let i = 0; i < count; i++) {
      const q = makeQuestion(mode);
      if (q) questions.push(q);
    }
    quiz = { questions, index: 0, score: 0, answered: false };
    renderQuestion();
  }

  function makeQuestion(mode) {
    const modes = ["device-coil", "coil-device", "price"];
    const realMode = mode === "mix" ? pick(modes) : mode;
    if (realMode === "device-coil") return questionDeviceCoil();
    if (realMode === "coil-device") return questionCoilDevice();
    return questionPrice();
  }

  function questionDeviceCoil() {
    const devices = db.devices.filter((d) => compatibleCoils(d).length);
    if (!devices.length || db.coils.length < 2) return null;
    const d = pick(devices);
    const correct = pick(compatibleCoils(d));
    const wrong = sample(db.coils.filter((c) => !(d.coils || []).includes(c.id)), 3);
    const options = shuffle([correct, ...wrong]).map((c) => ({
      id: c.id, label: `${coilLabel(c)} · ${money(c.price)}`
    }));
    return {
      text: `Какой картридж подходит к ${deviceLabel(d)}?`,
      options, correct: correct.id,
      explain: `Для ${deviceLabel(d)} подходят: ${compatibleCoils(d).map(coilLabel).join(", ")}.`
    };
  }

  function questionCoilDevice() {
    const coils = db.coils.filter((c) => compatibleDevices(c).length);
    if (!coils.length || db.devices.length < 2) return null;
    const c = pick(coils);
    const goodDevices = compatibleDevices(c);
    const correct = pick(goodDevices);
    const wrong = sample(db.devices.filter((d) => !(d.coils || []).includes(c.id)), 3);
    const options = shuffle([correct, ...wrong]).map((d) => ({ id: d.id, label: deviceLabel(d) }));
    return {
      text: `К какому устройству подходит ${coilLabel(c)}?`,
      options, correct: correct.id,
      explain: `${coilLabel(c)} подходит к: ${goodDevices.map(deviceLabel).join(", ")}.`
    };
  }

  function questionPrice() {
    const items = [
      ...db.devices.map((d) => ({ id: d.id, label: deviceLabel(d), price: Number(d.price || 0), kind: "устройство" })),
      ...db.coils.map((c) => ({ id: c.id, label: coilLabel(c), price: Number(c.price || 0), kind: "картридж" }))
    ].filter((x) => x.price > 0);
    if (items.length < 2) return null;
    const correct = pick(items);
    const otherPrices = [...new Set(items.filter((x) => x.price !== correct.price).map((x) => x.price))];
    const prices = sample(otherPrices, 3);
    while (prices.length < 3) {
      const v = Math.max(10, correct.price + pick([-300, -200, -100, 100, 200, 300]));
      if (v !== correct.price && !prices.includes(v)) prices.push(v);
    }
    const options = shuffle([correct.price, ...prices]).map((p) => ({ id: String(p), label: money(p) }));
    return {
      text: `Сколько стоит ${correct.label}?`,
      options, correct: String(correct.price),
      explain: `${correct.label} — ${correct.kind}. Цена: ${money(correct.price)}.`
    };
  }

  function renderQuestion() {
    const box = el("quizBox");
    if (!box) return;
    if (!quiz.questions.length) {
      box.innerHTML = `<div class="question">Не удалось создать тест. Добавь данные в админке.</div>`;
      return;
    }
    if (quiz.index >= quiz.questions.length) {
      const p = Math.round((quiz.score / quiz.questions.length) * 100);
      box.innerHTML = `
        <div class="question">
          <h3>Тест завершён</h3>
          <p>Результат: <b>${quiz.score}</b> из <b>${quiz.questions.length}</b> (${p}%)</p>
          <p>${p >= 80 ? "✅ Отлично. Можно допускать к консультации." : "❌ Нужно повторить материал."}</p>
        </div>
      `;
      return;
    }
    const q = quiz.questions[quiz.index];
    box.innerHTML = `
      <div class="question">
        <div class="muted">Вопрос ${quiz.index + 1} из ${quiz.questions.length}</div>
        <h3>${esc(q.text)}</h3>
        <div class="answers">
          ${q.options.map((o) => `<button class="answer" data-id="${esc(o.id)}">${esc(o.label)}</button>`).join("")}
        </div>
        <div id="answerInfo"></div>
      </div>
    `;
    box.querySelectorAll(".answer").forEach((btn) => {
      btn.addEventListener("click", () => answerQuestion(btn.dataset.id));
    });
  }

  function answerQuestion(selectedId) {
    if (quiz.answered) return;
    quiz.answered = true;
    const q = quiz.questions[quiz.index];
    const ok = selectedId === q.correct;
    if (ok) quiz.score++;
    else addMistake(q);
    document.querySelectorAll(".answer").forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.id === q.correct) btn.classList.add("right");
      if (btn.dataset.id === selectedId && !ok) btn.classList.add("wrong");
    });
    const info = el("answerInfo");
    if (info) {
      info.innerHTML = `
        <div class="explain"><b>${ok ? "Верно." : "Ошибка."}</b> ${esc(q.explain)}</div>
        <br><button id="nextQuestion" class="primary-btn">Дальше</button>
      `;
      el("nextQuestion")?.addEventListener("click", () => {
        quiz.index++;
        quiz.answered = false;
        renderQuestion();
      });
    }
    renderMistakes();
  }

  function getMistakes() {
    try { return JSON.parse(localStorage.getItem(MISTAKES_KEY) || "[]"); }
    catch { return []; }
  }

  function addMistake(q) {
    const mistakes = getMistakes();
    mistakes.unshift({ text: q.text, explain: q.explain, date: new Date().toLocaleString("ru-RU") });
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes.slice(0, 30)));
  }

  function renderMistakes() {
    const box = el("mistakesBox");
    if (!box) return;
    const mistakes = getMistakes();
    if (!mistakes.length) {
      box.innerHTML = `<p class="muted">Ошибок пока нет.</p>`;
      return;
    }
    box.innerHTML = mistakes.map((m) => `
      <div class="mistake">
        <b>${esc(m.text)}</b>
        <p>${esc(m.explain)}</p>
        <small class="muted">${esc(m.date)}</small>
      </div>
    `).join("");
  }

  // ================= ЗАПУСК =================
  function renderAll() {
    renderBrandFilter();
    renderCatalog();
    renderAdmin();
    renderMistakes();
  }

  renderAll();
})();
