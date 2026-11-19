/**
 * js/app.js
 * Script principal do frontend
 * - Gerencia interações dos formulários (login e cadastro via API)
 * - Fornece validação básica no cliente e feedback visual
 *
 * Estrutura:
 *  - initPasswordToggle()
 *  - initRegisterForm()
 *  - initLoginForm()
 */
(function () {
  "use strict";

  const PBKDF2_ITERATIONS = 250000;
  const EYE_OPEN_SVG =
    '<svg class="eye-open" width="20" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="#7b8aa3" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#7b8aa3" stroke-width="1.2"/></svg>';
  const EYE_CLOSED_SVG =
    '<svg class="eye-closed" width="20" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8 .837-1.55 2.03-3.356 3.5-4.77" stroke="#7b8aa3" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1l22 22" stroke="#7b8aa3" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  document.addEventListener("DOMContentLoaded", function () {
    initCustomAlerts();
    initPasswordToggle();
    initMarketplaceFilters();
    initRegisterForm();
    initLoginForm();
    initInteractiveCalendar();
  });

  const DEFAULT_RESERVED_NAMES = [
    "barbearia silva",
    "alfa beleza",
    "joao da silva",
    "agendly"
  ];

  const DEFAULT_RESERVED_DOCUMENTS = [
    "12345678909",
    "11111111111",
    "22222222222",
    "12345678901234",
    "11111111111111"
  ];

  const DEFAULT_RESERVED_EMAILS = [
    "admin@agendly.com",
    "contato@teste.com",
    "cliente@exemplo.com",
    "cliente.demo@agendly.test",
    "negocio.demo@agendly.test"
  ];
  function addShake(el) {
    if (!el) return;
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }

  function getAccountHomePaths() {
    const currentPath = window.location.pathname || "";
    const isCustomerArea = currentPath.includes("/cliente/") || currentPath.endsWith("/cliente/logincliente.html");
    const isBusinessArea = currentPath.includes("/loja/");

    if (isCustomerArea) {
      return {
        cliente: "../index.html",
        loja: "../loja/indexloja.html",
      };
    }

    if (isBusinessArea) {
      return {
        cliente: "../index.html",
        loja: "indexloja.html",
      };
    }

    return {
      cliente: "index.html",
      loja: "loja/indexloja.html",
    };
  }

  function normalizeText(value) {
    return (value || "").trim().toLowerCase();
  }

  function normalizeDocument(value) {
    return (value || "").replace(/\D/g, "");
  }

  function initCustomAlerts() {
    const toast = document.createElement("div");
    toast.className = "alert-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);

    function showAlert(message, type) {
      if (!message) return;

      const alertType = type || "info";
      toast.textContent = message;
      toast.className = `alert-toast show ${alertType}`;

      clearTimeout(toast.hideTimer);
      toast.hideTimer = setTimeout(function () {
        toast.classList.remove("show");
      }, 2600);
    }

    document.querySelectorAll("[data-alert]").forEach(function (element) {
      element.addEventListener("click", function (event) {
        const alertText = element.getAttribute("data-alert");
        const alertType = element.getAttribute("data-alert-type") || "info";

        if (element.tagName === "A" && element.getAttribute("href") && element.getAttribute("href") !== "#") {
          return;
        }

        if (alertText) {
          event.preventDefault();
          showAlert(alertText, alertType);
        }
      });
    });

    window.showAgendlyAlert = showAlert;
    const nativeAlert = window.alert;
    window.alert = function (message) {
      showAlert(String(message || ""), "info");
      return nativeAlert ? undefined : undefined;
    };
  }

  function initInteractiveCalendar() {
    const calendarGrid = document.querySelector(".calendar-grid");
    const monthSelect = document.querySelector(".calendar-month");
    const yearInput = document.querySelector(".calendar-year");
    const previousButton = document.querySelector(".calendar-nav.prev");
    const nextButton = document.querySelector(".calendar-nav.next");
    const previousMonthLabel = document.querySelector(".month-tag.month-left");
    const nextMonthLabel = document.querySelector(".month-tag.month-right");

    if (!calendarGrid || !monthSelect || !yearInput) return;

    const weekdayLabels = Array.from(calendarGrid.querySelectorAll(".weekday"));
    let lastValidYear = Number(yearInput.value);
    const dayStatuses = {
      "2026-01-06": "day-success",
      "2026-01-09": "day-success",
      "2026-01-19": "day-alert",
      "2026-01-20": "day-pending",
      "2026-01-21": "day-cancel",
      "2026-01-24": "day-warning",
    };

    function formatMonth(year, month) {
      return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(new Date(year, month, 1));
    }

    function renderCalendar() {
      const month = Number(monthSelect.value);
      const year = Number(yearInput.value);
      if (!Number.isInteger(year) || year < 1900 || year > 9999) return;
      lastValidYear = year;

      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      const cells = document.createDocumentFragment();

      for (let index = 0; index < firstWeekday; index += 1) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "day day-empty";
        emptyDay.setAttribute("aria-hidden", "true");
        cells.appendChild(emptyDay);
      }

      for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
        const day = document.createElement("div");
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
        const statusClass = dayStatuses[dateKey];
        const isToday =
          year === today.getFullYear() &&
          month === today.getMonth() &&
          dayNumber === today.getDate();

        day.className = `day ${statusClass || "day-muted"}${isToday ? " is-today" : ""}`;
        day.textContent = String(dayNumber);
        day.setAttribute("role", "gridcell");
        day.setAttribute(
          "aria-label",
          new Intl.DateTimeFormat("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(year, month, dayNumber))
        );
        if (isToday) {
          day.setAttribute("aria-current", "date");
        }
        cells.appendChild(day);
      }

      while (cells.childNodes.length < 42) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "day day-empty";
        emptyDay.setAttribute("aria-hidden", "true");
        cells.appendChild(emptyDay);
      }

      calendarGrid.replaceChildren(...weekdayLabels, cells);
      if (previousMonthLabel) {
        const previousDate = new Date(year, month - 1, 1);
        previousMonthLabel.textContent = formatMonth(
          previousDate.getFullYear(),
          previousDate.getMonth()
        );
      }
      if (nextMonthLabel) {
        const nextDate = new Date(year, month + 1, 1);
        nextMonthLabel.textContent = formatMonth(
          nextDate.getFullYear(),
          nextDate.getMonth()
        );
      }
      if (previousButton) {
        previousButton.disabled = year === 1900 && month === 0;
      }
      if (nextButton) {
        nextButton.disabled = year === 9999 && month === 11;
      }
    }

    function moveMonth(amount) {
      const date = new Date(
        Number(yearInput.value),
        Number(monthSelect.value) + amount,
        1
      );
      monthSelect.value = String(date.getMonth());
      yearInput.value = String(date.getFullYear());
      renderCalendar();
    }

    monthSelect.addEventListener("change", renderCalendar);
    yearInput.addEventListener("change", renderCalendar);
    yearInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        yearInput.blur();
      }
    });
    yearInput.addEventListener("blur", function () {
      const year = Number(yearInput.value);
      if (!Number.isInteger(year) || year < 1900 || year > 9999) {
        yearInput.value = String(lastValidYear);
      }
      renderCalendar();
    });

    if (previousButton) {
      previousButton.addEventListener("click", function () {
        moveMonth(-1);
      });
    }
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        moveMonth(1);
      });
    }

    renderCalendar();
  }

  function ensureStatusIndicator(input) {
    if (!input) return null;
    const field = input.closest(".form-field");
    if (!field) return null;
    let status = field.querySelector(".status-indicator");
    if (!status) {
      status = document.createElement("span");
      status.className = "status-indicator";
      field.appendChild(status);
    }
    return status;
  }

  function setFieldStatus(input, status, message) {
    if (!input) return;
    const field = input.closest(".form-field");
    if (!field) return;

    const indicator = ensureStatusIndicator(input);
    const validStatus = status || "neutral";
    const parent = input.closest(".grid-item");
    let feedback = parent ? parent.querySelector(".field-message") : null;

    if (!feedback && parent) {
      feedback = document.createElement("small");
      feedback.className = "field-message";
      parent.appendChild(feedback);
    }

    field.classList.remove("error", "success", "neutral");
    field.classList.add(validStatus);
    input.setAttribute("aria-invalid", validStatus === "error" ? "true" : "false");

    if (indicator) {
      indicator.className = "status-indicator " + validStatus;
      indicator.title = message || "";
      indicator.textContent = validStatus === "success" ? "✓" : validStatus === "error" ? "✕" : "";
    }

    if (feedback) {
      const shouldShow = validStatus === "error" || validStatus === "success";
      feedback.textContent = shouldShow ? (message || "") : "";
      feedback.classList.toggle("visible", shouldShow && Boolean(message));
      feedback.classList.toggle("error", validStatus === "error");
      feedback.classList.toggle("success", validStatus === "success");
    }
  }

  function getReservedNames() {
    try {
      const stored = JSON.parse(localStorage.getItem("agendly_reserved_names") || "null");
      return Array.isArray(stored) && stored.length ? stored : DEFAULT_RESERVED_NAMES;
    } catch (error) {
      return DEFAULT_RESERVED_NAMES;
    }
  }

  function getReservedDocuments() {
    try {
      const stored = JSON.parse(localStorage.getItem("agendly_reserved_documents") || "null");
      return Array.isArray(stored) && stored.length ? stored : DEFAULT_RESERVED_DOCUMENTS;
    } catch (error) {
      return DEFAULT_RESERVED_DOCUMENTS;
    }
  }

  function getReservedEmails() {
    try {
      const stored = JSON.parse(localStorage.getItem("agendly_reserved_emails") || "null");
      return Array.isArray(stored) && stored.length ? stored : DEFAULT_RESERVED_EMAILS;
    } catch (error) {
      return DEFAULT_RESERVED_EMAILS;
    }
  }

  function isNameAvailable(name) {
    const cleanName = normalizeText(name);
    if (!cleanName) return false;
    if (window.AgendlyApi && window.AgendlyApi.enabled) return true;
    const reserved = getReservedNames().map(function (item) {
      return normalizeText(item);
    });
    return !reserved.includes(cleanName);
  }

  function isDocumentAvailable(documentNumber, type) {
    const cleanDoc = normalizeDocument(documentNumber);
    if (!cleanDoc) return false;
    const matchType = type === "cnpj" ? 14 : 11;
    if (cleanDoc.length !== matchType) return false;
    if (window.AgendlyApi && window.AgendlyApi.enabled) return true;
    const reserved = getReservedDocuments().map(function (item) {
      return normalizeDocument(item);
    });
    return !reserved.includes(cleanDoc);
  }

  function isEmailAvailable(email) {
    const cleanEmail = normalizeText(email);
    if (!cleanEmail) return false;
    if (window.AgendlyApi && window.AgendlyApi.enabled) return true;
    const reserved = getReservedEmails().map(function (value) {
      return normalizeText(value);
    });
    return !reserved.includes(cleanEmail);
  }

  function validateEmail(email) {
    if (!email || typeof email !== "string") return false;
    const value = email.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!regex.test(value)) return false;
    const [local, domain] = value.split("@");
    return Boolean(local && domain && domain.includes(".") && !domain.startsWith(".") && !domain.endsWith("."));
  }

  function validatePassword(password) {
    if (!password || typeof password !== "string") return false;
    return password.length >= 8 && password.length <= 72;
  }

  function validateCpf(value) {
    const digits = normalizeDocument(value);
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    for (let turn = 9; turn < 11; turn += 1) {
      let sum = 0;
      for (let index = 0; index < turn; index += 1) {
        sum += Number(digits[index]) * (turn + 1 - index);
      }
      let checkDigit = (sum * 10) % 11;
      if (checkDigit === 10) checkDigit = 0;
      if (checkDigit !== Number(digits[turn])) return false;
    }
    return true;
  }

  function validateCnpj(value) {
    const digits = normalizeDocument(value);
    if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
    const weights = [
      [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    ];
    for (let turn = 12; turn < 14; turn += 1) {
      let sum = 0;
      weights[turn - 12].forEach(function (weight, index) {
        sum += Number(digits[index]) * weight;
      });
      const remainder = sum % 11;
      const checkDigit = remainder < 2 ? 0 : 11 - remainder;
      if (checkDigit !== Number(digits[turn])) return false;
    }
    return true;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function hexToBytes(hex) {
    const cleanHex = hex.replace(/\s+/g, "");
    const result = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      result.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    return Uint8Array.from(result);
  }

  async function hashPassword(password, saltHex) {
    const cryptoObj = window.crypto || crypto;
    if (!cryptoObj || !cryptoObj.subtle) {
      return {
        hash: btoa(unescape(encodeURIComponent(password))),
        salt: saltHex || "fallback-salt",
      };
    }

    const saltBytes = saltHex ? hexToBytes(saltHex) : cryptoObj.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder();
    const keyMaterial = await cryptoObj.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await cryptoObj.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    return {
      hash: bytesToHex(new Uint8Array(derivedBits)),
      salt: bytesToHex(saltBytes),
    };
  }

  function setFieldError(input, hasError) {
    if (!input) return;
    const field = input.closest(".form-field");
    if (!field) return;
    field.classList.toggle("error", hasError);
    if (!hasError) {
      field.classList.remove("success");
    }
  }

  function initPasswordToggle() {
    const eye = document.querySelector(".eye");
    if (!eye) return;
    const pwd = document.querySelector('.login-form input[type="password"]');
    if (!pwd) return;

    eye.innerHTML = EYE_OPEN_SVG;
    eye.setAttribute("aria-label", "Mostrar senha");

    eye.addEventListener("click", function () {
      const isPassword = pwd.type === "password";
      pwd.type = isPassword ? "text" : "password";
      eye.innerHTML = isPassword ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
      eye.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
    });
  }

  function initMarketplaceFilters() {
    const categoryItems = document.querySelectorAll(".category-item");
    const cards = document.querySelectorAll(".market-card");
    const searchInput = document.querySelector("#market-search");
    const resultsCount = document.querySelector(".results-count");
    const filterToggle = document.querySelector(".filter-toggle");
    const filterModal = document.querySelector(".filter-modal");
    const closeModal = document.querySelector(".filter-close");
    const applyFilterButton = document.querySelector(".filter-apply");
    const resetFilterButton = document.querySelector(".filter-reset");
    const minPriceInput = document.querySelector("#min-price");
    const maxPriceInput = document.querySelector("#max-price");
    const ratingFilter = document.querySelector("#rating-filter");
    const sortFilter = document.querySelector("#sort-filter");

    const state = {
      category: "all",
      search: "",
      minPrice: "",
      maxPrice: "",
      rating: 0,
      sort: "relevance",
    };

    function getCardText(card) {
      return (card.textContent || "").toLowerCase();
    }

    function updateResultsCount(visibleCards) {
      if (!resultsCount) return;
      const amount = visibleCards.length;
      const label = amount === 1 ? "resultado encontrado" : "resultados encontrados";
      resultsCount.textContent = `${amount} ${label}`;
    }

    function applyCardsFilter() {
      if (!cards.length) return;

      const visibleCards = Array.from(cards).filter(function (card) {
        const category = card.dataset.category || "";
        const priceValue = Number(card.dataset.price || 0);
        const ratingValue = Number(card.dataset.rating || 0);
        const text = getCardText(card);

        const matchesCategory = state.category === "all" || category === state.category;
        const matchesSearch = !state.search || text.includes(state.search);
        const matchesMinPrice = !state.minPrice || priceValue >= Number(state.minPrice);
        const matchesMaxPrice = !state.maxPrice || priceValue <= Number(state.maxPrice) || (Number(state.maxPrice) === 0 && priceValue === 0);
        const matchesRating = Number(state.rating) === 0 || ratingValue >= Number(state.rating);

        return matchesCategory && matchesSearch && matchesMinPrice && matchesMaxPrice && matchesRating;
      });

      const sortedCards = [...visibleCards];
      if (state.sort === "price-asc") {
        sortedCards.sort((a, b) => Number(a.dataset.price || 0) - Number(b.dataset.price || 0));
      } else if (state.sort === "price-desc") {
        sortedCards.sort((a, b) => Number(b.dataset.price || 0) - Number(a.dataset.price || 0));
      } else if (state.sort === "rating-desc") {
        sortedCards.sort((a, b) => Number(b.dataset.rating || 0) - Number(a.dataset.rating || 0));
      }

      cards.forEach(function (card) {
        card.classList.add("is-hidden");
      });

      sortedCards.forEach(function (card) {
        card.classList.remove("is-hidden");
      });

      updateResultsCount(sortedCards);
    }

    categoryItems.forEach(function (button) {
      button.addEventListener("click", function () {
        categoryItems.forEach(function (item) {
          item.classList.toggle("active", item === button);
        });

        state.category = button.dataset.category || "all";
        applyCardsFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", function (event) {
        state.search = (event.target.value || "").trim().toLowerCase();
        applyCardsFilter();
      });
    }

    function openFilters() {
      if (!filterModal) return;
      filterModal.classList.add("open");
      filterModal.setAttribute("aria-hidden", "false");
    }

    function closeFilters() {
      if (!filterModal) return;
      filterModal.classList.remove("open");
      filterModal.setAttribute("aria-hidden", "true");
    }

    if (filterToggle) {
      filterToggle.addEventListener("click", openFilters);
    }

    if (closeModal) {
      closeModal.addEventListener("click", closeFilters);
    }

    if (filterModal) {
      filterModal.addEventListener("click", function (event) {
        if (event.target === filterModal) {
          closeFilters();
        }
      });
    }

    function syncStateFromInputs() {
      state.minPrice = minPriceInput ? minPriceInput.value : "";
      state.maxPrice = maxPriceInput ? maxPriceInput.value : "";
      state.rating = ratingFilter ? Number(ratingFilter.value || 0) : 0;
      state.sort = sortFilter ? sortFilter.value : "relevance";
    }

    if (applyFilterButton) {
      applyFilterButton.addEventListener("click", function () {
        syncStateFromInputs();
        applyCardsFilter();
        closeFilters();
      });
    }

    if (resetFilterButton) {
      resetFilterButton.addEventListener("click", function () {
        if (minPriceInput) minPriceInput.value = "";
        if (maxPriceInput) maxPriceInput.value = "";
        if (ratingFilter) ratingFilter.value = "0";
        if (sortFilter) sortFilter.value = "relevance";
        state.minPrice = "";
        state.maxPrice = "";
        state.rating = 0;
        state.sort = "relevance";
        applyCardsFilter();
      });
    }

    applyCardsFilter();
  }

  function initRegisterForm() {
    const registerForm = document.querySelector(".register-form");
    if (!registerForm) return;
    const backendNotice = registerForm.querySelector("[data-backend-notice]");
    if (backendNotice && (!window.AgendlyApi || !window.AgendlyApi.enabled)) {
      backendNotice.hidden = false;
    }

    const nameInput = registerForm.querySelector('input[name="business"]');
    const cpfBtn = registerForm.querySelector(".toggle-cpf");
    const cnpjBtn = registerForm.querySelector(".toggle-cnpj");
    const cpfcnpjInput = registerForm.querySelector(".cpfcnpj");
    const emailInput = registerForm.querySelector('input[name="email"]');
    const phoneInput = registerForm.querySelector('input[name="phone"]');
    const passwordInput = registerForm.querySelector('input[name="password"]');
    const passwordConfirmInput = registerForm.querySelector('input[name="password_confirm"]');
    const submitButton = registerForm.querySelector('button[type="submit"]');

    function setType(type) {
      if (!cpfBtn || !cnpjBtn || !cpfcnpjInput) return;
      if (type === "cpf") {
        cpfBtn.classList.add("active");
        cnpjBtn.classList.remove("active");
        cpfcnpjInput.placeholder = "000.000.000-00";
        cpfcnpjInput.dataset.type = "cpf";
        cpfcnpjInput.maxLength = 14;
      } else {
        cpfBtn.classList.remove("active");
        cnpjBtn.classList.add("active");
        cpfcnpjInput.placeholder = "00.000.000/0000-00";
        cpfcnpjInput.dataset.type = "cnpj";
        cpfcnpjInput.maxLength = 18;
      }
      updateDocumentStatus();
    }

    function updateDocumentStatus() {
      if (!cpfcnpjInput) return;
      const value = cpfcnpjInput.value.trim();
      if (!value) {
        setFieldStatus(cpfcnpjInput, "neutral", "");
        return;
      }

      const type = cpfcnpjInput.dataset.type || "cpf";
      const digits = normalizeDocument(value);
      const valid = type === "cpf" ? validateCpf(digits) : validateCnpj(digits);
      if (!valid) {
        setFieldStatus(cpfcnpjInput, "error", type === "cpf" ? "CPF inválido" : "CNPJ inválido");
        return;
      }

      const available = isDocumentAvailable(digits, type);
      const label = type === "cpf" ? "CPF" : "CNPJ";
      const message = window.AgendlyApi && window.AgendlyApi.enabled
        ? label + " válido; a disponibilidade será confirmada ao cadastrar."
        : available ? label + " disponível" : label + " já cadastrado";
      setFieldStatus(cpfcnpjInput, available ? "success" : "error", message);
    }

    function updateNameStatus() {
      if (!nameInput) return;
      const value = nameInput.value.trim();
      if (!value) {
        setFieldStatus(nameInput, "neutral", "");
        return;
      }
      const available = isNameAvailable(value);
      const message = window.AgendlyApi && window.AgendlyApi.enabled
        ? "Nome válido."
        : available ? "Nome disponível para cadastro" : "Nome já está em uso";
      setFieldStatus(nameInput, available ? "success" : "error", message);
    }

    function updateEmailStatus() {
      if (!emailInput) return;
      const value = emailInput.value.trim();
      if (!value) {
        setFieldStatus(emailInput, "neutral", "");
        return;
      }
      const valid = validateEmail(value);
      if (!valid) {
        setFieldStatus(emailInput, "error", "E-mail inválido. Use um endereço com @");
        return;
      }

      const available = isEmailAvailable(value);
      const message = window.AgendlyApi && window.AgendlyApi.enabled
        ? "E-mail válido; a disponibilidade será confirmada ao cadastrar."
        : available ? "E-mail disponível" : "E-mail já cadastrado";
      setFieldStatus(emailInput, available ? "success" : "error", message);
    }

    function updatePhoneStatus() {
      if (!phoneInput) return;
      const digits = normalizeDocument(phoneInput.value);
      if (!digits) {
        setFieldStatus(phoneInput, "neutral", "");
        return;
      }
      if (digits.length > 11) {
        phoneInput.value = digits.slice(0, 11);
      }
      const valid = digits.length >= 10 && digits.length <= 11;
      setFieldStatus(phoneInput, valid ? "success" : "error", valid ? "Telefone válido" : "Telefone deve ter de 10 a 11 dígitos");
    }

    function updatePasswordStatus() {
      if (!passwordInput) return;
      const value = passwordInput.value;
      if (!value) {
        setFieldStatus(passwordInput, "neutral", "");
        return;
      }
      const valid = validatePassword(value);
      setFieldStatus(passwordInput, valid ? "success" : "error", valid ? "Senha válida" : "Senha deve ter de 8 a 72 caracteres");
    }

    function updatePasswordConfirmStatus() {
      if (!passwordConfirmInput) return;
      const value = passwordConfirmInput.value;
      if (!value) {
        setFieldStatus(passwordConfirmInput, "neutral", "");
        return;
      }
      const isSame = !!passwordInput && passwordInput.value === value;
      setFieldStatus(passwordConfirmInput, isSame ? "success" : "error", isSame ? "Senhas coincidem" : "As senhas precisam ser iguais");
    }

    if (nameInput) {
      nameInput.addEventListener("input", updateNameStatus);
    }

    if (cpfcnpjInput) {
      cpfcnpjInput.addEventListener("input", function () {
        const digits = normalizeDocument(cpfcnpjInput.value).slice(0, cpfcnpjInput.dataset.type === "cnpj" ? 14 : 11);
        const type = cpfcnpjInput.dataset.type || "cpf";
        const groups = type === "cpf" ? [3, 3, 3, 2] : [2, 3, 3, 4, 2];
        const separators = type === "cpf" ? [".", ".", "-"] : [".", ".", "/", "-"];
        let formatted = "";
        let position = 0;
        groups.forEach(function (size, index) {
          if (position >= digits.length) return;
          if (index > 0) formatted += separators[index - 1];
          formatted += digits.slice(position, position + size);
          position += size;
        });
        cpfcnpjInput.value = formatted;
        updateDocumentStatus();
      });
    }

    if (emailInput) {
      emailInput.addEventListener("input", updateEmailStatus);
    }

    if (phoneInput) {
      phoneInput.maxLength = 11;
      phoneInput.addEventListener("input", function () {
        phoneInput.value = normalizeDocument(phoneInput.value).slice(0, 11);
        updatePhoneStatus();
      });
    }

    if (passwordInput) {
      passwordInput.maxLength = 72;
      passwordInput.addEventListener("input", function () {
        updatePasswordStatus();
        if (passwordConfirmInput && passwordConfirmInput.value) {
          updatePasswordConfirmStatus();
        }
      });
    }

    if (passwordConfirmInput) {
      passwordConfirmInput.maxLength = 72;
      passwordConfirmInput.addEventListener("input", updatePasswordConfirmStatus);
    }

    cpfBtn && cpfBtn.addEventListener("click", function () {
      setType("cpf");
      updateDocumentStatus();
    });
    cnpjBtn && cnpjBtn.addEventListener("click", function () {
      setType("cnpj");
      updateDocumentStatus();
    });

    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formMessage = registerForm.querySelector("[data-register-message]");
      if (formMessage) {
        formMessage.textContent = "";
        formMessage.classList.remove("visible", "error", "success");
      }
      const nameValue = nameInput ? nameInput.value.trim() : "";
      const emailValue = emailInput ? emailInput.value.trim() : "";
      const phoneValue = phoneInput ? phoneInput.value.trim() : "";
      const docValue = cpfcnpjInput ? cpfcnpjInput.value.trim() : "";
      const passwordValue = passwordInput ? passwordInput.value : "";
      const confirmValue = passwordConfirmInput ? passwordConfirmInput.value : "";
      const selectedType = (cpfcnpjInput && cpfcnpjInput.dataset.type) || "cpf";

      let ok = true;

      if (!nameValue || !isNameAvailable(nameValue)) {
        ok = false;
        updateNameStatus();
      }

      if (!emailValue || !validateEmail(emailValue) || !isEmailAvailable(emailValue)) {
        ok = false;
        updateEmailStatus();
      }

      if (!docValue) {
        ok = false;
        setFieldStatus(cpfcnpjInput, "error", selectedType === "cpf" ? "CPF obrigatório" : "CNPJ obrigatório");
      } else {
        const cleanDoc = normalizeDocument(docValue);
        const valid = selectedType === "cpf" ? validateCpf(cleanDoc) : validateCnpj(cleanDoc);
        const available = isDocumentAvailable(cleanDoc, selectedType);
        if (!valid || !available) {
          ok = false;
          setFieldStatus(cpfcnpjInput, "error", !valid ? (selectedType === "cpf" ? "CPF inválido" : "CNPJ inválido") : (selectedType === "cpf" ? "CPF já cadastrado" : "CNPJ já cadastrado"));
        }
      }

      if (!phoneValue || normalizeDocument(phoneValue).length < 10 || normalizeDocument(phoneValue).length > 11) {
        ok = false;
        updatePhoneStatus();
      }

      if (!validatePassword(passwordValue)) {
        ok = false;
        updatePasswordStatus();
      }

      if (passwordConfirmInput && (!confirmValue || passwordValue !== confirmValue)) {
        ok = false;
        updatePasswordConfirmStatus();
      }

      if (!ok) {
        addShake(registerForm);
        return;
      }

      const accountType = selectedType === "cnpj" ? "loja" : "cliente";
      const submitLabel = submitButton && submitButton.querySelector(".label");
      const originalSubmitLabel = submitLabel ? submitLabel.textContent : "Cadastrar-se";
      if (submitButton) {
        submitButton.classList.add("is-loading");
        submitButton.disabled = true;
      }
      if (submitLabel) {
        submitLabel.textContent = "Cadastrando...";
      }

      try {
        if (window.AgendlyApi && window.AgendlyApi.enabled) {
          await window.AgendlyApi.request("register", "POST", {
            tipo: accountType,
            nome: nameValue,
            email: emailValue,
            telefone: phoneValue,
            documento: docValue,
            senha: passwordValue,
          });
          window.location.href = registerForm.dataset.loginUrl ||
            (accountType === "loja" ? "loja/loginloja.html" : "cliente/logincliente.html");
          return;
        }
        throw new Error('O cadastro exige que a API da Vercel e o banco Turso estejam configurados.');
      } catch (error) {
        console.error("Erro ao salvar cadastro:", error);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove("is-loading");
        }
        if (submitLabel) {
          submitLabel.textContent = originalSubmitLabel;
        }
        const message = registerForm.querySelector("[data-register-message]");
        if (message) {
          message.textContent = error.message || "Não foi possível concluir o cadastro agora.";
          message.classList.add("visible", "error");
        } else {
          alert(error.message || "Não foi possível concluir o cadastro agora.");
        }
        return;
      }

      window.setTimeout(function () {
        if (submitButton) {
          submitButton.classList.remove("is-loading");
          submitButton.disabled = false;
        }
        window.location.href = "login.html";
      }, 1200);
    });

    updateNameStatus();
    updateEmailStatus();
    updatePhoneStatus();
    updatePasswordStatus();
    updatePasswordConfirmStatus();
    setType("cpf");
  }

  function initLoginForm() {
    const form = document.querySelector(".login-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const emailInput = form.querySelector('input[name="email"]');
      const passwordInput = form.querySelector('input[name="password"]');
      const emailValue = emailInput ? emailInput.value.trim() : "";
      const passwordValue = passwordInput ? passwordInput.value : "";

      let ok = true;

      if (!validateEmail(emailValue)) {
        ok = false;
        setFieldError(emailInput, true);
      } else {
        setFieldError(emailInput, false);
      }

      if (!validatePassword(passwordValue)) {
        ok = false;
        setFieldError(passwordInput, true);
      } else {
        setFieldError(passwordInput, false);
      }

      if (!ok) {
        addShake(form);
        return;
      }

      try {
        if (window.AgendlyApi && window.AgendlyApi.enabled) {
          const result = await window.AgendlyApi.request("login", "POST", {
            email: emailValue,
            senha: passwordValue,
            tipo: form.dataset.accountType || "",
          });
          sessionStorage.setItem("agendly_user", result.user.email);
          sessionStorage.setItem("agendly_account_type", result.user.tipo);
          window.location.href = getAccountHomePaths()[result.user.tipo] || getAccountHomePaths().cliente;
          return;
        }
        throw new Error('O login exige que a API da Vercel e o banco Turso estejam configurados.');
      } catch (error) {
        console.error("Erro ao autenticar cliente:", error);
        alert(error.message || "Não foi possível realizar o login neste momento.");
      }
    });
  }
})();
