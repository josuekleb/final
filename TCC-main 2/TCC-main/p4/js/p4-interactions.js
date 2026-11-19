(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const rootUrl = new URL("../", document.currentScript.src);
  const apiUrl = new URL("api", rootUrl);
  window.AgendlyApi = window.AgendlyApi || {
    enabled: window.location.protocol === "http:" || window.location.protocol === "https:",
    request: async function (action, method, data, query) {
      const url = new URL(apiUrl.href);
      url.searchParams.set("action", action);
      Object.keys(query || {}).forEach(function (key) {
        if (query[key] !== undefined && query[key] !== null) url.searchParams.set(key, query[key]);
      });
      const response = await fetch(url.href, {
        method: method || "GET",
        credentials: "same-origin",
        headers: Object.assign(data ? { "Content-Type": "application/json" } : {}, method && method !== "GET" && sessionStorage.getItem("agendly_csrf") ? { "X-CSRF-Token": sessionStorage.getItem("agendly_csrf") } : {}),
        body: data ? JSON.stringify(data) : undefined,
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("A API do Agendly não está disponível. Confira a configuração da Vercel e do banco Turso.");
      }
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
      if (result.csrf) sessionStorage.setItem("agendly_csrf", result.csrf);
      return result;
    },
  };

  function localUrl(path) {
    return new URL(path, rootUrl).href;
  }

  function ensureToast() {
    let toast = document.querySelector(".p4-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "p4-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    return toast;
  }

  function showToast(message) {
    const toast = ensureToast();
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 2600);
  }

  function getAccountNavigation() {
    let accountType = "";
    let userEmail = "";
    try {
      accountType = window.sessionStorage.getItem("agendly_account_type") || "";
      userEmail = window.sessionStorage.getItem("agendly_user") || "";
    } catch (error) {
      accountType = "";
      userEmail = "";
    }
    const pathSuggestsBusiness = window.location.pathname.toLowerCase().includes("/loja/");
    if (accountType !== "loja" && accountType !== "cliente") accountType = pathSuggestsBusiness ? "loja" : "cliente";
    const business = accountType === "loja";
    return {
      type: accountType,
      loggedIn: Boolean(userEmail && (accountType === "loja" || accountType === "cliente")),
      login: business ? "loja/loginloja.html" : "cliente/logincliente.html",
      agenda: business ? "loja/agendaloja.html" : "cliente/agenda.html",
      profile: business ? "loja/perfilloja.html" : "cliente/perfilcliente.html",
    };
  }

  function syncAccountNavigation() {
    const account = getAccountNavigation();
    document.querySelectorAll(".p4-global-nav a").forEach(function (link) {
      const label = link.textContent.trim().toLocaleLowerCase("pt-BR");
      if (label.includes("agenda")) link.href = localUrl(account.agenda);
      if (label.includes("perfil")) link.href = localUrl(account.profile);
    });

    const actions = document.querySelectorAll(".p4-global-actions a");
    if (actions.length) {
      const entry = actions[0];
      entry.textContent = account.loggedIn ? "Sair" : "Entrar";
      entry.href = localUrl(account.login);
      entry.dataset.accountLogout = account.loggedIn ? "true" : "false";
      if (actions[1]) {
        actions[1].href = localUrl(account.agenda);
        actions[1].textContent = "Minha agenda ↗";
      }
      if (account.loggedIn && entry.dataset.logoutBound !== "true") {
        entry.dataset.logoutBound = "true";
        entry.addEventListener("click", async function (event) {
          event.preventDefault();
          if (window.AgendlyApi.enabled) { try { await window.AgendlyApi.request("logout", "POST"); } catch (error) { console.error(error); } }
          try {
            window.sessionStorage.removeItem("agendly_user");
            window.sessionStorage.removeItem("agendly_account_type");
            window.sessionStorage.removeItem("agendly_registered");
          } catch (error) {
            console.error("Não foi possível encerrar a sessão.", error);
          }
          window.location.href = entry.href;
        });
      }
    }

    document.querySelectorAll(".logout").forEach(function (button) {
      if (button.dataset.accountLogoutBound === "true") return;
      button.dataset.accountLogoutBound = "true";
      button.addEventListener("click", async function (event) {
        event.preventDefault();
        if (window.AgendlyApi.enabled) { try { await window.AgendlyApi.request("logout", "POST"); } catch (error) { console.error(error); } }
        try {
          window.sessionStorage.removeItem("agendly_user");
          window.sessionStorage.removeItem("agendly_account_type");
          window.sessionStorage.removeItem("agendly_registered");
        } catch (error) {
          console.error("Não foi possível encerrar a sessão.", error);
        }
        window.location.href = localUrl(account.login);
      });
    });
  }

  function enforceSession() {
    const rootPath = decodeURIComponent(rootUrl.pathname).toLowerCase();
    const pathname = decodeURIComponent(window.location.pathname).toLowerCase();
    const relativePath = pathname.startsWith(rootPath)
      ? pathname.slice(rootPath.length)
      : pathname.replace(/^\/+/, "");
    const path = relativePath.replace(/\/+$/, "") || "index.html";
    const draftPreview = path === "cliente/loja-online.html" &&
      new URLSearchParams(window.location.search).get("preview") === "draft";
    const publicPages = [
      "login.html",
      "cadastro.html",
      "recuperarsenha.html",
      "redefinirsenha.html",
      "cliente/logincliente.html",
      "cliente/cadastrocliente.html",
      "loja/loginloja.html",
      "loja/cadastroloja.html",
      "cliente/termos de uso.html",
      "cliente/privacidade.html",
    ];
    if (publicPages.includes(path)) return;
    const expected = path.startsWith("loja/") ? "loja" : "cliente";
    if (!window.AgendlyApi.enabled) {
      const loginPath = expected === "loja" ? "loja/loginloja.html" : "cliente/logincliente.html";
      window.location.replace(localUrl(loginPath));
      return;
    }
    window.AgendlyApi.request("me", "GET").then(function (result) {
      const isOfficialHome = path.endsWith("/") || path.endsWith("/index.html");
      if (result.user && result.user.tipo === "loja" && expected === "cliente" && isOfficialHome) {
        window.location.replace(localUrl("loja/indexloja.html"));
        return;
      }
      if (!result.user || (!draftPreview && result.user.tipo !== expected)) {
        window.location.replace(localUrl(expected === "loja" ? "loja/loginloja.html" : "cliente/logincliente.html"));
        return;
      }
      sessionStorage.setItem("agendly_user", result.user.email);
      sessionStorage.setItem("agendly_account_type", result.user.tipo);
      syncAccountNavigation();
    }).catch(function () {
      window.location.replace(localUrl(expected === "loja" ? "loja/loginloja.html" : "cliente/logincliente.html"));
    });
  }

  function createHeader() {
    if (
      document.body.classList.contains("auth-page") ||
      document.querySelector(".login-form, .register-form")
    ) return;
    if (
      document.body.classList.contains("storefront-body") &&
      new URLSearchParams(window.location.search).get("preview") === "draft"
    ) return;
    if (
      document.querySelector(
        ".p4-header, .p4-global-header, .topbar, .services-body .services-header, .agenda-loja-topbar"
      )
    ) return;

    const account = getAccountNavigation();

    const header = document.createElement("header");
    header.className = "p4-global-header";
    header.innerHTML =
      '<a class="p4-global-brand" href="' +
      localUrl("index.html") +
      '" aria-label="Agendly, página inicial">' +
      '<span class="p4-global-brand-mark" aria-hidden="true">◷</span>' +
      "<span>agendly<span class=\"brand-dot\">.</span></span></a>" +
      '<nav class="p4-global-nav" aria-label="Navegação principal">' +
      '<a href="' +
      localUrl("index.html") +
      '">Experiências</a><a href="' +
      localUrl(account.agenda) +
      '">Sua agenda</a><a href="' +
      localUrl(account.profile) +
      '">Perfil</a></nav>' +
      '<div class="p4-global-actions"><a href="' +
      localUrl(account.login) +
      '">' + (account.loggedIn ? "Sair" : "Entrar") + '</a><a href="' +
      localUrl(account.agenda) +
      '">Minha agenda ↗</a></div>' +
      '<button class="p4-global-menu" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span></button>';

    document.body.insertBefore(header, document.body.firstChild);
    if (window.AgendlyApi.enabled && document.body.classList.contains("services-body")) {
      window.location.replace(localUrl("index.html#profissionais"));
      return;
    }
    const menuButton = header.querySelector(".p4-global-menu");
    const navigation = header.querySelector(".p4-global-nav");

    menuButton.addEventListener("click", function () {
      const expanded = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!expanded));
      menuButton.setAttribute(
        "aria-label",
        expanded ? "Abrir menu" : "Fechar menu"
      );
      navigation.classList.toggle("open", !expanded);
    });

    navigation.addEventListener("click", function (event) {
      if (!event.target.closest("a")) return;
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menu");
      navigation.classList.remove("open");
    });
  }

  function addSkipLink() {
    const main = document.querySelector("main");
    if (!main || document.querySelector(".p4-skip-link")) return;

    if (!main.id) main.id = "p4-main-content";
    const skipLink = document.createElement("a");
    skipLink.className = "p4-skip-link";
    skipLink.href = "#" + main.id;
    skipLink.textContent = "Pular para o conteúdo";
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  function initHistoryBack() {
    document.querySelectorAll("[data-history-back]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (!document.referrer || window.history.length < 2) return;
        const previousPage = new URL(document.referrer);
        if (
          previousPage.protocol !== window.location.protocol ||
          previousPage.origin !== window.location.origin
        ) {
          return;
        }
        event.preventDefault();
        window.history.back();
      });
    });
  }

  function createPageIntro() {
    if (
      document.body.classList.contains("auth-page") ||
      document.querySelector(
        ".p4-home, .p4-page-intro, .services-body, .store-body, .storefront-body"
      )
    ) return;

    const main =
      document.querySelector("main") ||
      document.querySelector(".support-container");
    if (!main) return;

    const heading =
      main.querySelector("h1") ||
      document.querySelector("main h2") ||
      document.querySelector(".shop-profile-name");
    const title = heading
      ? heading.textContent.trim().replace(/\s+/g, " ")
      : document.title.split(/[—|]/)[0].trim();

    const pageCopy = [
      [".marketpage", "01 / DESCOBERTA", "Seu próximo momento começa aqui."],
      [".services-main", "02 / EXPERIÊNCIA", "Escolha o que faz bem para você."],
      [".booking-page", "03 / RESERVA", "Seu horário, no seu ritmo."],
      [".sched-main", "04 / SUA ROTINA", "Cada compromisso no seu tempo."],
      [".profile-main", "05 / SEU ESPAÇO", "Tudo sobre você, em um só lugar."],
      [".store-main", "01 / ESTÚDIO", "Apresente seu trabalho ao mundo."],
      [".shop-profile-main", "02 / SEU NEGÓCIO", "A identidade do seu espaço."],
      [".agenda-loja-main", "03 / AGENDA", "Uma visão clara do seu dia."],
      [".notification-main", "04 / ATUALIZAÇÕES", "O que acontece, no momento certo."],
      [".faq-main", "01 / CENTRAL DE AJUDA", "Respostas para seguir tranquilo."],
      [".support-container", "02 / CUIDADO AGENDLY", "Estamos aqui quando precisar."],
      [".content-wrap", "03 / TRANSPARÊNCIA", "Informação clara, sempre."],
      ["#register-title", "01 / SUA CONTA", "Um começo simples, feito para você."],
      ["#login-title", "02 / BEM-VINDO DE VOLTA", "Seu tempo continua por aqui."],
      [".main-area", "03 / ACESSO SEGURO", "Retome sua rotina com tranquilidade."],
      [".page > .card", "04 / AGENDLY", "Seu tempo merece cuidado."],
    ];
    const copy = pageCopy.find(function (item) {
      return main.matches(item[0]) || main.querySelector(item[0]);
    });
    const introLogoPath = localUrl("img/Design sem nome 1.png");

    const intro = document.createElement("section");
    intro.className = "p4-page-intro";
    intro.setAttribute("aria-label", "Seção atual");
    intro.innerHTML =
      '<div class="p4-page-intro-copy"><small></small><h2></h2><p></p></div>' +
      '<div class="p4-intro-product"><span class="p4-intro-index">AGENDLY · 01 — 03</span>' +
      '<img class="p4-intro-logo" src="' + introLogoPath + '" alt="Agendly" />' +
      '<span class="p4-intro-caption">SEU PRÓXIMO MOMENTO</span></div>';
    intro.querySelector("small").textContent = copy?.[1] || "AGENDLY / SEU TEMPO, DO SEU JEITO";
    intro.querySelector("h2").textContent = title;
    intro.querySelector("p").textContent =
      copy?.[2] || "Uma experiência mais leve para organizar o que importa.";
    let insertionPoint = main;
    while (insertionPoint.parentElement !== document.body) {
      insertionPoint = insertionPoint.parentElement;
    }
    document.body.insertBefore(intro, insertionPoint);
  }

  function addProductSidePanel() {
    if (document.body.classList.contains("auth-page")) return;
    const page = document.querySelector("main.page, main.main-area");
    if (!page || page.querySelector(".p4-product-aside")) return;

    const panel = document.createElement("aside");
    panel.className = "p4-product-aside";
    panel.setAttribute("aria-label", "Apresentação da empresa");
    panel.innerHTML =
      "<small>SEU TEMPO, BEM CUIDADO</small>" +
      '<img class="p4-side-logo" src="' +
      localUrl("img/0.png") +
      '" alt="Logo da empresa" />' +
      "<p>Uma agenda mais leve começa com o horário certo.</p>" +
      '<span class="p4-aside-note"><i></i> Reservas validadas na agenda</span>';
    page.appendChild(panel);
  }

  function initHomeSearch() {
    const form = document.querySelector(".p4-search");
    const input = document.querySelector("#p4-service-search");
    const categoryButtons = Array.from(
      document.querySelectorAll(".p4-collection[data-category]")
    );
    if (!form || !input || !document.querySelector(".p4-professional-card")) return;
    let activeCategory = null;

    function filterCards(shouldScroll) {
      const query = input.value.trim().toLocaleLowerCase("pt-BR");
      let visible = 0;
      const cards = Array.from(
        document.querySelectorAll(".p4-professional-card")
      );
      cards.forEach(function (card) {
        const matchesCategory =
          !activeCategory || card.dataset.category === activeCategory;
        const matchesSearch =
          !query ||
          (card.dataset.search || "")
            .toLocaleLowerCase("pt-BR")
            .includes(query);
        card.hidden = !matchesCategory || !matchesSearch;
        if (!card.hidden) visible += 1;
      });

      const empty = document.querySelector(".p4-empty-state");
      if (empty) empty.hidden = visible > 0;
      if (shouldScroll) {
        document.querySelector("#profissionais").scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      }
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      filterCards(true);
    });
    input.addEventListener("input", function () {
      filterCards(false);
    });

    categoryButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const isActive = activeCategory === button.dataset.category;
        activeCategory = isActive ? null : button.dataset.category;
        if (!isActive) input.value = "";

        categoryButtons.forEach(function (item) {
          const active = item.dataset.category === activeCategory;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        filterCards(true);
      });
    });
  }

  function initHomeMenu() {
    const button = document.querySelector(
      ".p4-menu-toggle, body.p4-home .p4-global-menu"
    );
    const navigation = document.querySelector(
      ".p4-nav, body.p4-home .p4-global-nav"
    );
    if (!button || !navigation) return;

    button.addEventListener("click", function () {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.setAttribute(
        "aria-label",
        expanded ? "Abrir menu" : "Fechar menu"
      );
      navigation.classList.toggle("open", !expanded);
    });

    navigation.addEventListener("click", function (event) {
      if (!event.target.closest("a")) return;
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Abrir menu");
      navigation.classList.remove("open");
    });
  }

  function initBookingSelections() {
    document.querySelectorAll(".booking-page").forEach(function (booking) {
      const serviceOptions = Array.from(
        booking.querySelectorAll(".service-list .service-option")
      );
      const dateOptions = Array.from(booking.querySelectorAll(".day-option"));
      const timeOptions = Array.from(
        booking.querySelectorAll(".time-option, .time-slot")
      );
      const summary = booking.querySelector(".summary-copy strong");

      function selectOptions(options, selected, activeClass) {
        options.forEach(function (option) {
          const active = option === selected;
          option.classList.toggle(activeClass, active);
          option.setAttribute("aria-pressed", String(active));
          const action = option.querySelector(".service-action");
          if (action) {
            action.classList.toggle("selected", active);
            action.textContent = active ? "Selecionado" : "Selecionar";
          }
        });
      }

      function updateSummary() {
        if (!summary) return;
        const service = booking.querySelector(
          ".service-list .service-option.selected .service-copy h4"
        );
        const date = booking.querySelector(".day-option.is-active .day-label");
        const time = booking.querySelector(
          ".time-option.is-selected, .time-slot.selected"
        );
        if (service && date && time) {
          summary.textContent =
            service.textContent.trim() +
            " • " +
            date.textContent.trim() +
            " às " +
            time.textContent.trim();
        }
      }

      serviceOptions.forEach(function (option) {
        option.addEventListener("click", function () {
          selectOptions(serviceOptions, option, "selected");
          updateSummary();
        });
      });
      dateOptions.forEach(function (option) {
        option.addEventListener("click", function () {
          selectOptions(dateOptions, option, "is-active");
          updateSummary();
        });
      });
      timeOptions.forEach(function (option) {
        option.addEventListener("click", function () {
          selectOptions(timeOptions, option, "is-selected");
          timeOptions.forEach(function (time) {
            time.classList.toggle("selected", time === option);
          });
          updateSummary();
        });
      });
    });
  }

  function initFaq() {
    document.querySelectorAll(".faq-item").forEach(function (item, index) {
      const question = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      if (!question || !answer) return;

      const answerId = "p4-faq-answer-" + (index + 1);
      question.setAttribute("aria-controls", answerId);
      answer.id = answerId;
      const initiallyOpen = item.classList.contains("open");
      question.setAttribute("aria-expanded", String(initiallyOpen));
      answer.setAttribute("aria-hidden", String(!initiallyOpen));
      question.addEventListener("click", function () {
        const open = item.classList.toggle("open");
        question.setAttribute("aria-expanded", String(open));
        answer.setAttribute("aria-hidden", String(!open));
        const toggle = question.querySelector(".faq-toggle");
        if (toggle) toggle.textContent = open ? "⌃" : "⌄";
      });
    });
  }

  function initStoreCalendar() {
    const calendar = document.querySelector(".agenda-loja-calendar-card");
    if (!calendar) return;

    const title = calendar.querySelector(".agenda-calendar-head h2");
    const grid = calendar.querySelector(".agenda-calendar-grid");
    if (!title || !grid) return;
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const headingParts = title.textContent.trim().split(/\s+/);
    const initialMonth = Math.max(monthNames.indexOf(headingParts[0]), 0);
    const initialYear = Number(headingParts[1]) || new Date().getFullYear();
    const initialDay = Number(calendar.querySelector(".calendar-day.selected")?.textContent) || 1;
    let selectedDate = window.AgendlyApi && window.AgendlyApi.enabled
      ? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12)
      : new Date(initialYear, initialMonth, initialDay, 12);
    let view = "month";
    const weekdays = Array.from(grid.querySelectorAll(".weekday")).map(
      function (day) {
        return day.textContent.trim();
      }
    );

    function dateKey(date) {
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    }

    function capitalized(value) {
      return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
    }

    function renderTitle() {
      if (view === "month") {
        title.textContent = monthNames[selectedDate.getMonth()] + " " + selectedDate.getFullYear();
        return;
      }
      const start = new Date(selectedDate);
      start.setDate(selectedDate.getDate() - selectedDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startMonth = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(start);
      const endMonth = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(end);
      let range;
      if (start.getFullYear() !== end.getFullYear()) {
        range = start.getDate() + " de " + startMonth + " de " + start.getFullYear() + " a " + end.getDate() + " de " + endMonth + " de " + end.getFullYear();
      } else if (start.getMonth() !== end.getMonth()) {
        range = start.getDate() + " de " + startMonth + " a " + end.getDate() + " de " + endMonth + " de " + end.getFullYear();
      } else {
        range = start.getDate() + " a " + end.getDate() + " de " + endMonth + " de " + end.getFullYear();
      }
      title.textContent = "Semana de " + range;
    }

    function renderCalendar() {
      renderTitle();
      calendar.querySelector(".calendar-nav.left")?.setAttribute("aria-label", view === "week" ? "Semana anterior" : "Mês anterior");
      calendar.querySelector(".calendar-nav.right")?.setAttribute("aria-label", view === "week" ? "Próxima semana" : "Próximo mês");
      const cells = document.createDocumentFragment();

      weekdays.forEach(function (weekday) {
        const label = document.createElement("div");
        label.className = "weekday";
        label.textContent = weekday;
        cells.appendChild(label);
      });

      let dates = [];
      if (view === "week") {
        const start = new Date(selectedDate);
        start.setDate(selectedDate.getDate() - selectedDate.getDay());
        dates = Array.from({ length: 7 }, function (_, index) {
          const date = new Date(start);
          date.setDate(start.getDate() + index);
          return date;
        });
      } else {
        const firstWeekday = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
        for (let index = 0; index < firstWeekday; index += 1) dates.push(null);
        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
          dates.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNumber, 12));
        }
        while (dates.length < 42) dates.push(null);
      }

      dates.forEach(function (date) {
        if (!date) {
          const empty = document.createElement("span");
          empty.className = "calendar-day muted";
          empty.setAttribute("aria-hidden", "true");
          cells.appendChild(empty);
          return;
        }
        const dayNumber = date.getDate();
        const isSelected = dateKey(date) === dateKey(selectedDate);
        const day = document.createElement("button");
        day.type = "button";
        day.className = "calendar-day" + (isSelected ? " selected" : "");
        day.textContent = String(dayNumber);
        day.setAttribute("aria-pressed", String(isSelected));
        day.setAttribute(
          "aria-label",
          new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(date)
        );
        day.addEventListener("click", function () {
          selectedDate = new Date(date);
          updateSelectedDate();
          renderCalendar();
        });
        const hasAppointments = Array.from(document.querySelectorAll(".agenda-loja-item[data-date]"))
          .some(function (item) { return item.dataset.date === dateKey(date) && !item.classList.contains("empty-slot") && !item.querySelector(".status-tag.cancel"); });
        if (hasAppointments) day.classList.add("has-appointments");
        cells.appendChild(day);
      });
      grid.replaceChildren(cells);
    }

    function updateSelectedDate() {
      const date = new Date(selectedDate);
      window.agendlySelectedDate = dateKey(date);
      const heading = calendar
        .closest("main")
        ?.querySelector(".agenda-loja-day-title h3");
      if (!heading) return;
      const weekday = capitalized(new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date));
      const monthName = capitalized(new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date));
      heading.textContent =
        "Programação de " +
        weekday +
        ", " +
        selectedDate.getDate() +
        " de " +
        monthName +
        " de " +
        selectedDate.getFullYear();
      calendar.dispatchEvent(new CustomEvent("agendly:agenda-date", { detail: { date: dateKey(date) } }));
    }

    window.addEventListener("agendly:select-date", function (event) {
      const parts = String(event.detail?.date || "").split("-").map(Number);
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return;
      selectedDate = new Date(parts[0], parts[1] - 1, parts[2], 12);
      renderCalendar();
      updateSelectedDate();
    });
    calendar.addEventListener("agendly:refresh-calendar", renderCalendar);

    function changeMonth(offset) {
      if (view === "week") {
        selectedDate.setDate(selectedDate.getDate() + offset * 7);
      } else {
        const day = selectedDate.getDate();
        selectedDate.setDate(1);
        selectedDate.setMonth(selectedDate.getMonth() + offset);
        selectedDate.setDate(Math.min(day, new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()));
      }
      renderCalendar();
      updateSelectedDate();
    }

    calendar
      .querySelector(".calendar-nav.left")
      ?.addEventListener("click", function () {
        changeMonth(-1);
      });
    calendar
      .querySelector(".calendar-nav.right")
      ?.addEventListener("click", function () {
        changeMonth(1);
      });

    calendar.closest("main")?.querySelectorAll("[data-calendar-view]").forEach(function (button) {
      button.addEventListener("click", function () {
        view = button.dataset.calendarView;
        calendar.closest("main").querySelectorAll("[data-calendar-view]").forEach(function (tab) {
          const active = tab === button;
          tab.classList.toggle("active", active);
          tab.setAttribute("aria-pressed", String(active));
        });
        renderCalendar();
      });
    });

    const yearSelect = calendar.querySelector("#agenda-year");
    yearSelect?.addEventListener("change", function () {
      const day = selectedDate.getDate();
      selectedDate.setFullYear(Number(yearSelect.value) || selectedDate.getFullYear());
      selectedDate.setDate(Math.min(day, new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()));
      renderCalendar();
      updateSelectedDate();
    });
    updateSelectedDate();
    renderCalendar();
  }

  function initFaqTabsAndFilters() {
    document
      .querySelectorAll(".agenda-loja-view-switch, .notification-tabs")
      .forEach(function (group) {
        group.addEventListener("click", function (event) {
          const button = event.target.closest("button");
          if (!button || !group.contains(button)) return;
          if (button.classList.contains("calendar-nav")) return;
          group.querySelectorAll("button").forEach(function (item) {
            item.classList.toggle("active", item === button);
          });
        });
      });

    document.querySelectorAll(".notification-tabs button").forEach(function (tab) {
      tab.addEventListener("click", function () {
        const text = tab.textContent.toLocaleLowerCase("pt-BR");
        const cards = document.querySelectorAll(".notification-card");
        cards.forEach(function (card) {
          const showAll = text.startsWith("todas");
          const status = card.dataset.appointmentStatus || "";
          const isCancellation = status === "cancelado" || card.classList.contains("is-cancelled");
          const isPending = status === "pendente";
          card.hidden = !showAll && (text.includes("cancel") ? !isCancellation : text.includes("pendente") ? !isPending : isCancellation);
        });
      });
    });

    const scrollTopButton = document.querySelector(".floating-scroll");
    scrollTopButton?.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
    });

    document.querySelector(".notification-bell")?.addEventListener("click", function () {
      document.querySelector(".notification-panel")?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    });
  }

  function initStoreAgendaActions() {
    const panel = document.querySelector(".agenda-loja-day-panel");
    if (!panel) return;
    const calendar = document.querySelector(".agenda-loja-calendar-card");
    const apiEnabled = Boolean(window.AgendlyApi && window.AgendlyApi.enabled);
    if (apiEnabled) {
      panel.querySelectorAll(".agenda-loja-item").forEach(function (item) { item.remove(); });
    }

    let items = [];
    let bookings = [];
    const today = new Date();
    let selectedDate = [today.getFullYear(), String(today.getMonth()+1).padStart(2,"0"), String(today.getDate()).padStart(2,"0")].join("-");
    let activeFilter = "all";
    const filters = Array.from(panel.querySelectorAll("[data-agenda-filter]"));

    function statusOf(item) {
      const tag = item.querySelector(".status-tag");
      if (!tag) return "confirmed";
      if (tag.classList.contains("cancel")) return "cancelled";
      if (tag.classList.contains("attended")) return "attended";
      if (tag.classList.contains("pending")) return "pending";
      return "confirmed";
    }

    function updateCounts() {
      const counts = {
        all: bookings.length,
        confirmed: bookings.filter(function (item) { return ["confirmed", "pending"].includes(statusOf(item)); }).length,
        attended: bookings.filter(function (item) { return statusOf(item) === "attended"; }).length,
        cancelled: bookings.filter(function (item) { return statusOf(item) === "cancelled"; }).length,
      };
      filters.forEach(function (button) {
        const key = button.dataset.agendaFilter;
        const label = key === "all" ? "Todos" : key === "confirmed" ? "Confirmados" : key === "attended" ? "Atendidos" : "Cancelados";
        button.textContent = label + " (" + counts[key] + ")";
      });
      const subtitle = panel.querySelector(".agenda-day-summary");
      const openSlots = items.filter(function (item) {
        return item.dataset.date === selectedDate && item.classList.contains("empty-slot");
      }).length;
      if (subtitle) subtitle.textContent = counts.confirmed + " confirmados · " + openSlots + " horários disponíveis";
    }

    function applyFilter(key) {
      activeFilter = key;
      items.forEach(function (item) {
        const sameDate = item.dataset.date === selectedDate;
        const matches = item.classList.contains("empty-slot")
          ? key === "all"
          : key === "all" || (key === "confirmed" ? ["confirmed", "pending"].includes(statusOf(item)) : statusOf(item) === key);
        item.hidden = !sameDate || !matches;
      });
    }

    function refreshItems() {
      items = Array.from(panel.querySelectorAll(".agenda-loja-item"));
      bookings = items.filter(function (item) {
        return !item.classList.contains("empty-slot") && item.dataset.date === selectedDate;
      });
      let emptyState = panel.querySelector(".agenda-date-empty");
      if (!bookings.length && !emptyState) {
        emptyState = document.createElement("p");
        emptyState.className = "agenda-date-empty";
        emptyState.textContent = "Nenhum agendamento para este dia. Escolha outra data ou registre um atendimento manual.";
        panel.querySelector(".agenda-loja-list")?.appendChild(emptyState);
      } else if (bookings.length && emptyState) {
        emptyState.remove();
      }
      updateCounts();
      applyFilter(activeFilter);
    }

    function appendAppointment(appointment) {
      if (panel.querySelector('[data-appointment-id="' + appointment.id + '"]')) return;
      const appointmentStart = new Date(appointment.date + "T" + appointment.time);
      const canChange = ["confirmed", "pending"].includes(appointment.status) && appointmentStart > new Date();
      const item = document.createElement("article");
      item.className = "agenda-loja-item manual-appointment";
      item.dataset.date = appointment.date;
      item.dataset.appointmentId = appointment.id;
      const timeBox = document.createElement("div");
      timeBox.className = "agenda-time-box";
      const time = document.createElement("span");
      time.className = "time";
      time.textContent = appointment.time;
      const duration = document.createElement("span");
      duration.className = "duration";
      duration.textContent = appointment.duration + " MIN";
      timeBox.append(time, duration);
      const info = document.createElement("div");
      info.className = "agenda-info";
      const clientLine = document.createElement("div");
      clientLine.className = "agenda-client-line";
      const client = document.createElement("span");
      client.className = "client-name";
      client.textContent = appointment.client;
      const status = document.createElement("span");
      status.className = "status-tag " + (appointment.status === "cancelled" ? "cancel" : appointment.status === "attended" ? "attended" : appointment.status === "pending" ? "pending" : "confirmed");
      status.textContent = appointment.status === "cancelled" ? "Cancelado" : appointment.status === "attended" ? "Concluído" : appointment.status === "pending" ? "Pendente" : "Confirmado";
      const divider = document.createElement("span");
      divider.className = "divider-dot";
      divider.textContent = "•";
      const professional = document.createElement("span");
      professional.className = "profession";
      professional.textContent = appointment.professional || "Atendimento do estabelecimento";
      clientLine.append(client, status, divider, professional);
      const service = document.createElement("div");
      service.className = "service-line";
      service.textContent = appointment.serviceName;
      const priceLine = document.createElement("div");
      priceLine.className = "price-line";
      const price = document.createElement("span");
      price.className = "price";
      price.textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(appointment.price);
      const payment = document.createElement("span");
      payment.className = "meta";
      payment.textContent = appointment.payment;
      const phone = document.createElement("span");
      phone.className = "meta";
      phone.textContent = "Contato: " + appointment.phone;
      priceLine.append(price, payment, phone);
      if (appointment.notes) {
        const notes = document.createElement("span");
        notes.className = "info-pill";
        notes.textContent = "Obs: " + appointment.notes;
        priceLine.appendChild(notes);
      }
      info.append(clientLine, service, priceLine);
      const actions = document.createElement("div");
      actions.className = "agenda-actions";
      const details = document.createElement("button");
      details.type = "button";
      details.className = "mini-action";
      details.dataset.appointmentAction = "details";
      details.textContent = "Ver detalhes";
      actions.appendChild(details);
      if (appointment.status === "confirmed" && appointmentStart <= new Date()) {
        const complete = document.createElement("button");
        complete.type = "button";
        complete.className = "mini-action light";
        complete.dataset.appointmentAction = "complete";
        complete.textContent = "Marcar como atendido";
        actions.appendChild(complete);
      }
      if (canChange) {
        const reschedule = document.createElement("button");
        reschedule.type = "button";
        reschedule.className = "mini-action light";
        reschedule.dataset.appointmentAction = "reschedule";
        reschedule.textContent = "Remarcar";
        actions.appendChild(reschedule);
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "mini-action cancel";
        cancel.dataset.appointmentAction = "cancel";
        cancel.textContent = "Cancelar";
        actions.appendChild(cancel);
      }
      item.append(timeBox, info, actions);
      panel.querySelector(".agenda-loja-list")?.appendChild(item);
    }

    filters.forEach(function (button) {
      button.addEventListener("click", function () {
        filters.forEach(function (filter) {
          const active = filter === button;
          filter.classList.toggle("active", active);
          filter.setAttribute("aria-pressed", String(active));
        });
        applyFilter(button.dataset.agendaFilter);
      });
    });

    calendar.addEventListener("agendly:agenda-date", function (event) {
      selectedDate = event.detail.date;
      refreshItems();
    });
    window.addEventListener("agendly:manual-appointment", function (event) {
      activeFilter = "all";
      filters.forEach(function (filter) {
        const active = filter.dataset.agendaFilter === "all";
        filter.classList.toggle("active", active);
        filter.setAttribute("aria-pressed", String(active));
      });
      appendAppointment(event.detail);
      refreshItems();
      calendar.dispatchEvent(new Event("agendly:refresh-calendar"));
    });
    if (!window.AgendlyApi || !window.AgendlyApi.enabled) loadManualAppointments().forEach(appendAppointment);
    refreshItems();
    if (window.AgendlyApi && window.AgendlyApi.enabled) {
      window.AgendlyApi.request("appointments", "GET").then(function (result) {
        (result.appointments || []).forEach(function (booking) {
          const start = new Date(String(booking.inicio).replace(" ", "T"));
          appendAppointment({ id: booking.id, date: String(booking.inicio).slice(0,10), time: start.toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}), duration: Math.round((new Date(String(booking.fim).replace(" ","T"))-start)/60000), client: booking.cliente, serviceName: booking.servico, professional: booking.profissional_nome, price: Number(booking.preco), status: booking.status === "cancelado" ? "cancelled" : booking.status === "concluido" ? "attended" : booking.status === "pendente" ? "pending" : "confirmed", payment: "A pagar no local", phone: booking.telefone || booking.email || "" });
        });
        refreshItems();
        if (result.appointments && result.appointments.length) {
          const firstDate = String(result.appointments[0].inicio).slice(0,10);
          window.dispatchEvent(new CustomEvent("agendly:select-date", { detail: { date: firstDate } }));
        }
      }).catch(function (error) { if (error.message) showToast(error.message); });
    }
  }

  function manualAppointmentKey() {
    const storefront = window.AgendlyStorefront;
    const owner = storefront ? storefront.getOwner() : "negocio.demo@agendly.test";
    return "agendly_manual_appointments_v1:" + encodeURIComponent(owner.toLowerCase());
  }

  function loadManualAppointments() {
    try {
      return JSON.parse(window.localStorage.getItem(manualAppointmentKey()) || "[]");
    } catch (error) {
      console.error("Não foi possível ler os agendamentos manuais.", error);
      return [];
    }
  }

  function saveManualAppointments(appointments) {
    window.localStorage.setItem(manualAppointmentKey(), JSON.stringify(appointments));
  }

  function updateStoredManualAppointment(id, status) {
    const appointments = loadManualAppointments();
    const appointment = appointments.find(function (item) { return item.id === id; });
    if (!appointment) return;
    appointment.status = status;
    saveManualAppointments(appointments);
  }

  async function initManualBooking() {
    const dialog = document.querySelector(".manual-booking-dialog");
    const form = dialog?.querySelector(".manual-booking-form");
    if (!dialog || !form) return;
    const storefront = window.AgendlyStorefront;
    const owner = storefront ? storefront.getOwner() : "negocio.demo@agendly.test";
    const openButtons = document.querySelectorAll("[data-open-manual-booking]");
    openButtons.forEach(function (button) { button.disabled = true; });
    let store;
    if (window.AgendlyApi && window.AgendlyApi.enabled) {
      try {
        const result = await window.AgendlyApi.request("store", "GET", undefined, { business: owner, draft: "1" });
        store = result.store.store;
      } catch (error) {
        showToast(error.message);
        return;
      }
    } else {
      try {
        store = storefront ? storefront.load(owner, "draft") : null;
      } catch (error) {
        showToast(error.message);
        return;
      }
    }
    const activeBlocks = (store?.blocks || []).filter(function (block) { return block.active; });
    const serviceBlock = activeBlocks.find(function (block) { return block.type === "services"; });
    const services = (serviceBlock?.items || []).filter(function (service) { return service.active; });
    const professionals = storefront && store
      ? storefront.activeProfessionals(store)
      : [];
    const hoursBlock = activeBlocks.find(function (block) { return block.type === "hours"; });
    const paymentBlock = activeBlocks.find(function (block) { return block.type === "payment"; });
    const serviceSelect = form.elements.service;
    const professionalSelect = form.elements.professional;
    const dateInput = form.elements.date;
    const timeSelect = form.elements.time;
    const paymentSelect = form.elements.payment;
    const summary = dialog.querySelector(".manual-booking-service-summary");
    const message = dialog.querySelector(".manual-booking-message");

    services.forEach(function (service, index) {
      const option = document.createElement("option");
      option.value = service.id || String(index);
      option.textContent = service.name;
      serviceSelect.appendChild(option);
    });
    const teamPlaceholder = document.createElement("option");
    teamPlaceholder.value = professionals.length ? "" : "Equipe do estabelecimento";
    teamPlaceholder.textContent = professionals.length ? "Selecione um profissional" : "Equipe do estabelecimento";
    teamPlaceholder.disabled = professionals.length > 0;
    teamPlaceholder.selected = true;
    professionalSelect.replaceChildren(teamPlaceholder);
    professionals.forEach(function (professional) {
      const option = document.createElement("option");
      option.value = professional.name;
      option.textContent = professional.name + (professional.specialty ? " · " + professional.specialty : "");
      professionalSelect.appendChild(option);
    });

    const paymentDescription = (paymentBlock?.description || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const paymentMethods = [
      { label: "Pagamento no local", matches: ["local", "presencial"] },
      { label: "Pix", matches: ["pix"] },
      { label: "Dinheiro", matches: ["dinheiro"] },
      { label: "Cartão de débito", matches: ["cart"] },
      { label: "Cartão de crédito", matches: ["cart"] },
    ];
    const configuredPayments = paymentMethods.filter(function (method) {
      return method.matches.every(function (term) { return paymentDescription.includes(term); });
    });
    paymentSelect.replaceChildren();
    (configuredPayments.length ? configuredPayments : paymentMethods.slice(0, 3)).forEach(function (method) {
      const option = document.createElement("option");
      option.textContent = method.label;
      option.value = method.label;
      paymentSelect.appendChild(option);
    });

    function selectedService() {
      return services.find(function (service, index) {
        return (service.id || String(index)) === serviceSelect.value;
      }) || services[0];
    }

    function toMinutes(value) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return NaN;
      const parts = value.split(":").map(Number);
      return parts[0] * 60 + parts[1];
    }

    function toTime(minutes) {
      return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
    }

    function getBusinessHours(dateValue) {
      const schedule = hoursBlock?.schedule;
      if (!schedule || !schedule.days || (Array.isArray(schedule.closures) && schedule.closures.some(function (closure) { return closure.date === dateValue; }))) return null;
      const day = schedule.days[String(new Date(dateValue + "T12:00:00").getDay())];
      if (!day || day.closed) return null;
      const open = toMinutes(day.open || "");
      const close = toMinutes(day.close || "");
      const breakStart = day.breakStart ? toMinutes(day.breakStart) : null;
      const breakEnd = day.breakEnd ? toMinutes(day.breakEnd) : null;
      if (!Number.isFinite(open) || !Number.isFinite(close) || open >= close) return null;
      if ((day.breakStart && !Number.isFinite(breakStart)) || (day.breakEnd && !Number.isFinite(breakEnd))) return null;
      if ((breakStart === null) !== (breakEnd === null)) return null;
      if (breakStart !== null && (breakStart < open || breakEnd > close || breakStart >= breakEnd)) return null;
      return { open: open, close: close, breakStart: breakStart, breakEnd: breakEnd };
    }

    function isTimeAvailable(date, time, duration) {
      const start = toMinutes(time);
      const end = start + duration;
      const hours = getBusinessHours(date);
      if (!hours || start < hours.open || end > hours.close || (start - hours.open) % 30 !== 0) return false;
      if (hours.breakStart !== null && start < hours.breakEnd && end > hours.breakStart) return false;
      if (new Date(date + "T" + time + ":00") <= new Date()) return false;
      const selectedProfessional = professionalSelect.value || "Equipe do estabelecimento";
      function matchesProfessional(otherProfessional) {
        return selectedProfessional === "Equipe do estabelecimento"
          || !otherProfessional
          || otherProfessional === "Equipe do estabelecimento"
          || otherProfessional === selectedProfessional;
      }
      const records = loadManualAppointments().filter(function (appointment) {
        return appointment.date === date
          && appointment.status !== "cancelled"
          && matchesProfessional(appointment.professional);
      });
      const conflict = records.some(function (appointment) {
        const otherStart = toMinutes(appointment.time);
        return start < otherStart + Number(appointment.duration) && end > otherStart;
      });
      if (conflict) return false;
      const demoItems = Array.from(document.querySelectorAll(".agenda-loja-item[data-date='" + date + "']"));
      return !demoItems.some(function (item) {
        if (item.classList.contains("empty-slot") || item.querySelector(".status-tag.cancel")) return false;
        const otherProfessional = item.querySelector(".agenda-client-line .profession")?.textContent.trim();
        if (!matchesProfessional(otherProfessional)) return false;
        const timeText = item.querySelector(".agenda-time-box .time")?.textContent.trim();
        const durationText = item.querySelector(".agenda-time-box .duration")?.textContent || "";
        if (!timeText || !/^\d{2}:\d{2}$/.test(timeText)) return false;
        const otherStart = toMinutes(timeText);
        const otherDuration = Number(durationText.match(/\d+/)?.[0]) || 30;
        return start < otherStart + otherDuration && end > otherStart;
      });
    }

    let availabilityRequest = 0;
    async function updateTimeOptions() {
      const requestId = ++availabilityRequest;
      const service = selectedService();
      const duration = Number(service?.duration) || 30;
      timeSelect.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecione um horário";
      placeholder.disabled = true;
      placeholder.selected = true;
      timeSelect.appendChild(placeholder);
      if (!service) {
        placeholder.textContent = "Nenhum serviço ativo";
        return;
      }
      if (!professionalSelect.value) {
        placeholder.textContent = "Selecione um profissional";
        return;
      }
      if (window.AgendlyApi && window.AgendlyApi.enabled) {
        placeholder.textContent = "Consultando disponibilidade...";
        try {
          const result = await window.AgendlyApi.request("availability", "GET", undefined, {
            business: owner,
            service: service.name,
            professional: professionalSelect.value,
            from: dateInput.value,
            days: "1",
            draft: "1",
          });
          if (requestId !== availabilityRequest) return;
          const day = Array.isArray(result.days) ? result.days[0] : null;
          if (!day || day.date !== dateInput.value || !Array.isArray(day.slots) || day.slots.some(function (time) { return !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time); })) {
            throw new Error("Não foi possível consultar os horários.");
          }
          day.slots.forEach(function (time) {
            const option = document.createElement("option");
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
          });
        } catch (error) {
          if (requestId !== availabilityRequest) return;
          placeholder.textContent = "Disponibilidade indisponível";
          message.textContent = error.message;
          return;
        }
      } else {
        const hours = getBusinessHours(dateInput.value);
        if (!hours) {
          placeholder.textContent = "Fechado conforme expediente";
          return;
        }
        for (let minute = hours.open; minute + duration <= hours.close; minute += 30) {
          const time = toTime(minute);
          if (!isTimeAvailable(dateInput.value, time, duration)) continue;
          const option = document.createElement("option");
          option.value = time;
          option.textContent = time;
          timeSelect.appendChild(option);
        }
      }
      if (timeSelect.options.length === 1) {
        placeholder.textContent = "Sem horários livres nesta data";
      }
    }

    function updateServiceSummary() {
      const service = selectedService();
      summary.replaceChildren();
      if (!service) {
        summary.textContent = "Este estabelecimento ainda não publicou serviços ativos.";
        return;
      }
      const name = document.createElement("strong");
      name.textContent = service.name;
      const description = document.createElement("span");
      description.textContent = service.description || "Serviço do estabelecimento";
      const detail = document.createElement("span");
      detail.textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(service.price) || 0) + " · " + (Number(service.duration) || 30) + " minutos";
      const hours = document.createElement("small");
      hours.textContent = hoursBlock?.description || "Configure o expediente na vitrine para habilitar agendamentos.";
      const professional = document.createElement("small");
      professional.textContent = "Profissional: " + (professionalSelect.value || "selecione para continuar");
      summary.append(name, description, detail, hours, professional);
      if (paymentBlock?.description) {
        const payment = document.createElement("small");
        payment.textContent = "Pagamento: " + paymentBlock.description;
        summary.appendChild(payment);
      }
    }

    function openDialog(event) {
      if (!services.length) {
        showToast("Cadastre e ative um serviço na página do estabelecimento antes de agendar.");
        return;
      }
      form.reset();
      const today = new Date();
      const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
      const selectedCalendarDate = window.agendlySelectedDate || todayKey;
      dateInput.min = todayKey;
      dateInput.value = selectedCalendarDate < todayKey ? todayKey : selectedCalendarDate;
      message.textContent = "";
      updateServiceSummary();
      updateTimeOptions();
      const requestedTime = event?.currentTarget?.dataset.slotTime;
      if (requestedTime && Array.from(timeSelect.options).some(function (option) { return option.value === requestedTime; })) {
        timeSelect.value = requestedTime;
      }
      dialog.showModal();
    }

    document.querySelectorAll("[data-open-manual-booking]").forEach(function (button) {
      button.addEventListener("click", openDialog);
    });
    dialog.querySelectorAll(".manual-booking-close, .manual-booking-cancel").forEach(function (button) {
      button.addEventListener("click", function () { dialog.close(); });
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    serviceSelect.addEventListener("change", function () {
      updateServiceSummary();
      updateTimeOptions();
    });
    professionalSelect.addEventListener("change", updateServiceSummary);
    professionalSelect.addEventListener("change", updateTimeOptions);
    dateInput.addEventListener("change", updateTimeOptions);
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const service = selectedService();
      if (!service || !form.reportValidity()) return;
      if (!professionalSelect.value) {
        message.textContent = "Escolha o profissional que fará o atendimento.";
        professionalSelect.focus();
        return;
      }
      if (!timeSelect.value || (!(window.AgendlyApi && window.AgendlyApi.enabled) && !isTimeAvailable(dateInput.value, timeSelect.value, Number(service.duration) || 30))) {
        message.textContent = "Esse horário acabou de ficar indisponível. Escolha outro.";
        updateTimeOptions();
        return;
      }
      const appointment = {
        id: "manual-" + Date.now(),
        client: form.elements.client.value.trim(),
        phone: form.elements.phone.value.trim(),
        serviceName: service.name,
        serviceDescription: service.description || "",
        price: Number(service.price) || 0,
        duration: Number(service.duration) || 30,
        date: dateInput.value,
        time: timeSelect.value,
        payment: form.elements.payment.value,
        notes: form.elements.notes.value.trim(),
        professional: professionalSelect.value || "Equipe do estabelecimento",
        status: "confirmed",
      };
      if (window.AgendlyApi && window.AgendlyApi.enabled) {
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.disabled = true;
        try {
          const result = await window.AgendlyApi.request("manual-appointment-create", "POST", {
            client: appointment.client, phone: appointment.phone, service: appointment.serviceName,
            date: appointment.date, time: appointment.time, notes: appointment.notes,
            professional: appointment.professional,
          });
          appointment.id = String(result.id);
        } catch (error) {
          message.textContent = error.message;
          if (submit) submit.disabled = false;
          return;
        }
      }
      const appointments = loadManualAppointments();
      if (!window.AgendlyApi || !window.AgendlyApi.enabled) {
        appointments.push(appointment);
        try {
          saveManualAppointments(appointments);
        } catch (error) {
          message.textContent = "Não foi possível salvar. Verifique o armazenamento do navegador.";
          return;
        }
      }
      window.dispatchEvent(new CustomEvent("agendly:select-date", { detail: { date: appointment.date } }));
      window.dispatchEvent(new CustomEvent("agendly:manual-appointment", { detail: appointment }));
      dialog.close();
      showToast(window.AgendlyApi && window.AgendlyApi.enabled ? "Agendamento manual salvo na agenda." : "Agendamento manual confirmado na demonstração.");
    });
    openButtons.forEach(function (button) { button.disabled = false; });
  }

  function initNotificationActions() {
    const livePanel = document.querySelector(".notification-panel");
    if (livePanel && window.AgendlyApi && window.AgendlyApi.enabled) {
      livePanel.querySelectorAll(".notification-card").forEach(function (card) { card.remove(); });
    }
    document
      .querySelector(".notification-mark-all")
      ?.addEventListener("click", function () {
        document.querySelectorAll(".notification-card").forEach(function (card) {
          card.classList.add("is-read");
          if (!card.dataset.appointmentId) return;
          const key = "agendly_notifications_read:" + (window.sessionStorage.getItem("agendly_user") || "guest").toLowerCase();
          try {
            const read = JSON.parse(window.localStorage.getItem(key) || "[]");
            if (!read.includes(String(card.dataset.appointmentId))) read.push(String(card.dataset.appointmentId));
            window.localStorage.setItem(key, JSON.stringify(read));
          } catch (error) { console.warn("Could not save notification read state.", error); }
        });
        showToast("Notificações marcadas como lidas.");
      });

    document
      .querySelectorAll(".notification-actions .confirm-btn")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          button.textContent = "Confirmado";
          button.disabled = true;
          button.closest(".notification-card")?.classList.add("is-confirmed");
          showToast("Agendamento confirmado na demonstração.");
        });
      });

    if (window.AgendlyApi && window.AgendlyApi.enabled && document.querySelector(".notification-panel")) {
      window.AgendlyApi.request("appointments", "GET").then(function (result) {
        const panel = document.querySelector(".notification-panel");
        panel.querySelectorAll(".notification-card").forEach(function (card) { card.remove(); });
        const appointments = result.appointments || [];
        const tabs = panel.querySelectorAll(".notification-tabs button");
        if (tabs[0]) tabs[0].textContent = "Todas (" + appointments.length + ")";
        if (tabs[1]) tabs[1].textContent = "Agendamentos (" + appointments.filter(function (a) { return a.status !== "cancelado"; }).length + ")";
        if (tabs[2]) tabs[2].textContent = "Cancelamentos (" + appointments.filter(function (a) { return a.status === "cancelado"; }).length + ")";
        if (tabs[3]) tabs[3].textContent = "Pendentes (" + appointments.filter(function (a) { return a.status === "pendente"; }).length + ")";
        appointments.forEach(function (appointment) {
          const start = new Date(String(appointment.inicio).replace(" ", "T"));
          const card = document.createElement("article"); card.className = "notification-card" + (appointment.status === "cancelado" ? " is-cancelled" : ""); card.dataset.appointmentId = appointment.id; card.dataset.appointmentStatus = appointment.status; card.dataset.appointmentDate = String(appointment.inicio).slice(0, 10);
          const readKey = "agendly_notifications_read:" + (window.sessionStorage.getItem("agendly_user") || "guest").toLowerCase();
          try { if (JSON.parse(window.localStorage.getItem(readKey) || "[]").includes(String(appointment.id))) card.classList.add("is-read"); } catch (error) { console.warn("Could not restore notification read state.", error); }
          const icon = document.createElement("div"); icon.className = "notification-icon blue-icon"; icon.textContent = appointment.status === "cancelado" ? "×" : "◷";
          const content = document.createElement("div"); content.className = "notification-content";
          const meta = document.createElement("div"); meta.className = "notification-meta-top";
          const client = document.createElement("span"); client.className = "notification-client"; client.textContent = appointment.cliente || "Cliente";
          const label = document.createElement("span"); label.className = "label-pill " + (appointment.status === "cancelado" ? "label-cancel" : "label-success"); label.textContent = appointment.status === "cancelado" ? "Cancelado" : appointment.status === "pendente" ? "Pendente" : "Novo Agendamento";
          const stamp = document.createElement("span"); stamp.className = "notification-time"; stamp.textContent = "• " + new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(start);
          meta.append(client,label,stamp);
          const title = document.createElement("h2"); title.textContent = appointment.servico;
          const details = document.createElement("div"); details.className = "notification-details-row";
          const when = document.createElement("span"); when.textContent = "⏰ " + new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(start);
          const price = document.createElement("span"); price.textContent = "• " + new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(appointment.preco));
          const professional = document.createElement("span"); professional.className = "profession"; professional.textContent = "Profissional: " + (appointment.profissional_nome || "Equipe do estabelecimento");
          details.append(when,price,professional); content.append(meta,title,details);
          const actions = document.createElement("div"); actions.className = "notification-actions";
          const detailsButton = document.createElement("button"); detailsButton.type = "button"; detailsButton.className = "secondary-btn"; detailsButton.dataset.appointmentAction = "details"; detailsButton.textContent = "Ver detalhes"; actions.appendChild(detailsButton);
          if (appointment.status === "confirmado" && start <= new Date()) { const complete = document.createElement("button"); complete.type = "button"; complete.className = "secondary-btn"; complete.dataset.appointmentAction = "complete"; complete.textContent = "Marcar como atendido"; actions.appendChild(complete); }
          if (["confirmado", "pendente"].includes(appointment.status)) { const cancel=document.createElement("button");cancel.type="button";cancel.className="secondary-btn";cancel.dataset.appointmentAction="cancel";cancel.textContent="Cancelar";actions.appendChild(cancel); }
          card.append(icon,content,actions); panel.appendChild(card);
        });
        if (!appointments.length) { const empty=document.createElement("p");empty.textContent="Ainda não há agendamentos para mostrar.";panel.appendChild(empty); }
      }).catch(function (error) {
        const panel = document.querySelector(".notification-panel");
        if (panel) {
          const status = document.createElement("p");
          status.setAttribute("role", "status");
          status.textContent = "Não foi possível carregar as notificações. Atualize a página para tentar novamente.";
          panel.appendChild(status);
        }
        showToast(error.message);
      });
    }
  }


  function initClientProfile() {
    const profile = document.querySelector(".profile-body");
    if (!profile) return;

    const rows = Array.from(profile.querySelectorAll(".info-row[data-profile-field]"));
    const bio = profile.querySelector("#bio");
    const saveButton = profile.querySelector(".profile-save");
    const cancelButton = profile.querySelector(".profile-cancel");
    const photoButton = profile.querySelector(".camera-button");
    const photoInput = profile.querySelector("#profile-photo-input");
    const avatar = profile.querySelector(".profile-avatar");
    let savedBio = bio ? bio.value : "";
    let previewUrl = null;

    if (window.AgendlyApi && window.AgendlyApi.enabled) {
      rows.filter(function (row) { return ["email", "password"].includes(row.dataset.profileField); }).forEach(function (row) {
        const edit = row.querySelector(".edit-button"); if (edit) edit.hidden = true;
      });
      window.AgendlyApi.request("me", "GET").then(function (result) {
        const user = result.user; if (!user) return;
        const heading = profile.querySelector("#profile-title"); if (heading) heading.textContent = user.nome;
        const emailRow = rows.find(function (row) { return row.dataset.profileField === "email"; });
        if (emailRow) emailRow.querySelector(".info-value").textContent = user.email;
        const phoneRow = rows.find(function (row) { return row.dataset.profileField === "tel"; });
        if (phoneRow && user.telefone) phoneRow.querySelector(".info-value").textContent = user.telefone;
        if (bio && user.bio !== null) { bio.value = user.bio || ""; savedBio = bio.value; }
        const demoNote = profile.querySelector(".profile-demo-note"); if (demoNote) demoNote.textContent = "As alterações são salvas na sua conta.";
      }).catch(function (error) { showToast(error.message); });
    }

    rows.forEach(function (row) {
      const button = row.querySelector(".edit-button");
      const initialValue = row.querySelector(".info-value");
      if (!initialValue || !button) return;
      row.dataset.savedValue = initialValue.textContent.trim();

      button.addEventListener("click", function () {
        const input = row.querySelector(".profile-edit-input");
        if (input) {
          const nextValue = input.value.trim();
          const field = row.dataset.profileField;
          if (field === "email" && !input.checkValidity()) {
            input.reportValidity();
            return;
          }
          const value = document.createElement("span");
          value.className = "info-value";
          value.textContent = input.dataset.previousValue || "";
          if (nextValue) {
            value.textContent = field === "password" ? "••••••••" : nextValue;
          }
          input.replaceWith(value);
          button.textContent = "Editar";
          button.setAttribute(
            "aria-label",
            "Editar " +
              row.querySelector(".info-label").textContent.replace(":", "")
          );
          return;
        }

        const value = row.querySelector(".info-value");
        if (!value) return;
        const field = row.dataset.profileField;
        const editor = document.createElement("input");
        editor.className = "profile-edit-input";
        editor.type = field === "password" ? "password" : field;
        editor.value = field === "password" ? "" : value.textContent.trim();
        editor.dataset.previousValue = value.textContent.trim();
        editor.placeholder = field === "password" ? "Digite uma nova senha" : "";
        editor.setAttribute(
          "aria-label",
          "Editar " + row.querySelector(".info-label").textContent.replace(":", "")
        );
        value.replaceWith(editor);
        button.textContent = "OK";
        button.setAttribute("aria-label", "Concluir edição");
        editor.focus();
      });
    });

    if (saveButton) {
      saveButton.addEventListener("click", async function () {
        rows.forEach(function (row) {
          const input = row.querySelector(".profile-edit-input");
          if (input) row.querySelector(".edit-button").click();
        });
        if (rows.some(function (row) {
          return Boolean(row.querySelector(".profile-edit-input"));
        })) {
          showToast("Revise os dados antes de salvar.");
          return;
        }
        rows.forEach(function (row) {
          const value = row.querySelector(".info-value");
          if (value) row.dataset.savedValue = value.textContent.trim();
        });
        if (bio) savedBio = bio.value;
        if (window.AgendlyApi && window.AgendlyApi.enabled) {
          const phoneRow = rows.find(function (row) { return row.dataset.profileField === "tel"; });
          const title = profile.querySelector("#profile-title");
          try {
            const result = await window.AgendlyApi.request("profile-save", "POST", {
              nome: title ? title.textContent.trim() : "Cliente",
              telefone: phoneRow ? phoneRow.querySelector(".info-value").textContent.trim() : "",
              bio: bio ? bio.value : "",
            });
            if (title && result.user) title.textContent = result.user.nome;
            showToast("Alterações salvas na sua conta.");
            return;
          } catch (error) { showToast(error.message); return; }
        }
        showToast("Alterações salvas nesta demonstração.");
      });
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        rows.forEach(function (row) {
          const input = row.querySelector(".profile-edit-input");
          if (input) {
            const value = document.createElement("span");
            value.className = "info-value";
            input.replaceWith(value);
          }
          const display = row.querySelector(".info-value");
          if (display) display.textContent = row.dataset.savedValue || "";
          const button = row.querySelector(".edit-button");
          if (button) {
            button.textContent = "Editar";
            button.setAttribute(
              "aria-label",
              "Editar " +
                row.querySelector(".info-label").textContent.replace(":", "")
            );
          }
        });
        if (bio) bio.value = savedBio;
        showToast("Edições descartadas.");
      });
    }

    if (photoButton && photoInput && avatar) {
      photoButton.addEventListener("click", function () {
        photoInput.click();
      });
      photoInput.addEventListener("change", function () {
        const file = photoInput.files && photoInput.files[0];
        if (!file) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        avatar.replaceChildren();
        const image = document.createElement("img");
        image.src = previewUrl;
        image.alt = "Foto de perfil selecionada para demonstração";
        avatar.appendChild(image);
      });
    }
  }

  function initBusinessProfile() {
    const page = document.querySelector(".shop-profile-body");
    if (!page) return;

    const editorUrl = localUrl("loja/indexloja.html");
    const agendaUrl = localUrl("loja/agendaloja.html");
    const notificationsUrl = localUrl("loja/notificacoes.html");
    const storefrontUrl = localUrl("cliente/loja-online.html");
    page.querySelectorAll(".shop-profile-tab").forEach(function (tab, index) {
      tab.addEventListener("click", function () { window.location.href = index === 0 ? editorUrl : agendaUrl; });
    });
    const notificationButton = page.querySelector(".header-icon");
    if (notificationButton) notificationButton.addEventListener("click", function () { window.location.href = notificationsUrl; });
    page.querySelectorAll(".shop-profile-camera, .shop-profile-form-head button, .shop-profile-edit-btn, .shop-profile-link-box a").forEach(function (button) {
      button.addEventListener("click", function (event) { event.preventDefault(); window.location.href = editorUrl; });
    });

    const bookingLink = function (serviceName) {
      const url = new URL(storefrontUrl);
      url.searchParams.set("business", window.sessionStorage.getItem("agendly_user") || "");
      if (serviceName) url.searchParams.set("service", serviceName);
      window.location.href = url.href;
    };
    page.querySelector(".shop-profile-primary-btn")?.addEventListener("click", function () { bookingLink(""); });
    page.querySelectorAll(".shop-profile-service-item button").forEach(function (button) {
      button.addEventListener("click", function () {
        bookingLink(button.closest(".shop-profile-service-item")?.querySelector("h4")?.textContent.trim() || "");
      });
    });

    if (!window.AgendlyApi.enabled) return;
    Promise.all([window.AgendlyApi.request("me", "GET"), window.AgendlyApi.request("store", "GET", undefined, { draft: "1" })])
      .then(function (results) {
        const user = results[0].user || {};
        const store = results[1].store?.store || {};
        const profile = store.profile || {};
        const servicesBlock = (store.blocks || []).find(function (block) { return block.type === "services" && block.active; });
        const services = (servicesBlock?.items || []).filter(function (service) { return service.active; });
        const setText = function (selector, text) { const element = page.querySelector(selector); if (element && text) element.textContent = text; };
        setText(".shop-profile-name", profile.name || user.nome);
        setText(".shop-profile-user-pill span:last-child", profile.name || user.nome);
        setText(".shop-profile-banner-copy h4", profile.name || user.nome);
        setText(".shop-profile-banner-copy > p", profile.tagline || profile.category || "Estabelecimento Agendly");
        setText(".shop-profile-status", store.published ? "Vitrine publicada" : "Vitrine em rascunho");
        setText(".shop-profile-field:nth-of-type(1) .shop-profile-input-row > span", profile.name || user.nome);
        setText(".shop-profile-field:nth-of-type(2) .shop-profile-input-row > span", user.email);
        setText(".shop-profile-field:nth-of-type(4) .shop-profile-input-row > span", profile.phone || user.telefone);
        setText(".shop-profile-field:nth-of-type(5) .shop-profile-input-row > span", profile.category);
        const initials = String(profile.name || user.nome || "Agendly").trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
        setText(".shop-profile-user-avatar", initials);
        const ratingLine = page.querySelector(".shop-profile-rating-line");
        if (ratingLine) {
          ratingLine.replaceChildren();
          const location = document.createElement("span");
          location.textContent = profile.location || "Endereço não informado";
          const separator = document.createElement("span");
          separator.className = "shop-profile-separator";
          separator.textContent = "·";
          const ratings = document.createElement("span");
          ratings.className = "shop-profile-muted";
          ratings.textContent = "Avaliações ainda não disponíveis";
          ratingLine.append(location, separator, ratings);
        }
        const serviceList = page.querySelector(".shop-profile-service-list");
        if (serviceList) {
          serviceList.replaceChildren();
          services.forEach(function (service) {
            const item = document.createElement("article"); item.className = "shop-profile-service-item";
            const info = document.createElement("div"); info.className = "shop-profile-service-info";
            const title = document.createElement("h4"); title.textContent = service.name;
            const description = document.createElement("p"); description.textContent = (service.description || "") + " · " + (Number(service.duration) || 30) + " min";
            info.append(title, description);
            const priceWrap = document.createElement("div"); priceWrap.className = "shop-profile-price-wrap";
            const price = document.createElement("span"); price.className = "shop-profile-price"; price.textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(service.price) || 0);
            const select = document.createElement("button"); select.type = "button"; select.textContent = "Selecionar"; select.addEventListener("click", function () { bookingLink(service.name); });
            priceWrap.append(price, select); item.append(info, priceWrap); serviceList.appendChild(item);
          });
          setText(".shop-profile-counter", services.length + (services.length === 1 ? " serviço ativo" : " serviços ativos"));
        }
      })
      .catch(function (error) { showToast(error.message); });
  }

  function initBusinessNavigation() {
    const editor = localUrl("loja/indexloja.html");
    const agenda = localUrl("loja/agendaloja.html");
    const notifications = localUrl("loja/notificacoes.html");
    document.querySelectorAll(".agenda-loja-tab").forEach(function (tab, index) {
      tab.addEventListener("click", function () { window.location.href = index === 0 ? editor : agenda; });
    });
    document.querySelector(".agenda-loja-bell")?.addEventListener("click", function () { window.location.href = notifications; });
    if (!window.AgendlyApi.enabled || !document.querySelector(".agenda-loja-name, .notification-shop-name, .shop-profile-user-pill")) return;
    Promise.all([window.AgendlyApi.request("me", "GET"), window.AgendlyApi.request("store", "GET", undefined, { draft: "1" })])
      .then(function (results) {
        const store = results[1].store?.store || {};
        const name = store.profile?.name || results[0].user?.nome;
        if (name) document.querySelectorAll(".agenda-loja-name, .notification-shop-name, .shop-profile-user-pill span:last-child").forEach(function (element) { element.textContent = name; });
      })
      .catch(function (error) { showToast(error.message); });
  }

  function initActionFeedback() {
    const supportForm = document.querySelector(".contact-form");
    if (supportForm) {
      supportForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const fields = new FormData(supportForm);
        const message = supportForm.querySelector("textarea[name='mensagem']");
        try {
          if (!window.AgendlyApi.enabled) {
            showToast("Mensagem demonstrativa. Abra a P4 pelo servidor para enviar o pedido.");
            return;
          }
          await window.AgendlyApi.request("support", "POST", {
            nome: fields.get("nome"), email: fields.get("email"),
            assunto: fields.get("assunto"), mensagem: fields.get("mensagem"),
          });
          supportForm.reset();
          showToast("Mensagem enviada ao suporte.");
        } catch (error) {
          showToast(error.message);
          message?.focus();
        }
      });
    }
    document
      .querySelectorAll(
        ".store-footer-actions .btn-primary:not(#publish-store), .shop-profile-contact-btn"
      )
      .forEach(function (button) {
        button.addEventListener("click", async function () {
          if (button.classList.contains("shop-profile-contact-btn") && button.textContent.toLocaleLowerCase("pt-BR").includes("sair")) {
            try { if (window.AgendlyApi.enabled) await window.AgendlyApi.request("logout", "POST"); } catch (error) { console.error(error); }
            sessionStorage.removeItem("agendly_user"); sessionStorage.removeItem("agendly_account_type");
            window.location.href = localUrl("loja/loginloja.html");
            return;
          }
          showToast("Ação registrada nesta demonstração do Agendly.");
        });
      });

    document.querySelector(".profile-action")?.addEventListener("click", async function (event) {
      event.preventDefault();
      try { if (window.AgendlyApi.enabled) await window.AgendlyApi.request("logout", "POST"); } catch (error) { console.error(error); }
      sessionStorage.removeItem("agendly_user"); sessionStorage.removeItem("agendly_account_type");
      window.location.href = localUrl("cliente/logincliente.html");
    });

    document
      .querySelectorAll(".appointment-card .mini-btn.danger")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          button.closest(".appointment-card")?.classList.add("is-cancelled");
          button.disabled = true;
          button.textContent = "Cancelado";
          showToast("Agendamento cancelado na demonstração.");
        });
      });

    document
      .querySelector(".faq-support .support-btn")
      ?.addEventListener("click", function () {
        window.location.href = localUrl("cliente/contato%20suporte.html");
      });
  }

  function initClientAgendaControls() {
    const filterButton = document.querySelector(".sched-actions .ghost-btn");
    if (filterButton) {
      const filters = ["all", "upcoming", "completed", "cancelled"];
      const labels = { all: "Filtros: Todos", upcoming: "Filtros: Próximos", completed: "Filtros: Concluídos", cancelled: "Filtros: Cancelados" };
      let current = 0;
      filterButton.addEventListener("click", function () {
        current = (current + 1) % filters.length;
        const filter = filters[current];
        filterButton.textContent = labels[filter];
        document.querySelectorAll(".appointments .appointment-card").forEach(function (card) {
          const status = card.dataset.appointmentStatus || (card.querySelector(".tag.cancel") ? "cancelado" : card.querySelector(".tag.success") ? "concluido" : "confirmado");
          const start = new Date(card.dataset.appointmentDate || 0);
          card.hidden = filter === "upcoming" ? !(start > new Date() && ["confirmado", "pendente"].includes(status)) : filter === "completed" ? status !== "concluido" : filter === "cancelled" ? status !== "cancelado" : false;
        });
      });
    }
  }

  async function loadClientAppointments() {
    const section = document.querySelector(".appointments");
    if (!section || !window.AgendlyApi.enabled) return;
    section.querySelectorAll(".appointment-card, .appointments-empty").forEach(function (item) { item.remove(); });
    try {
      const result = await window.AgendlyApi.request("appointments", "GET");
      const cards = result.appointments || [];
      const count = section.querySelector(".count-pill");
      if (count) count.textContent = cards.length + (cards.length === 1 ? " Agendamento" : " Agendamentos");
      cards.forEach(function (appointment) {
        const start = new Date(String(appointment.inicio).replace(" ", "T"));
        const status = appointment.status;
        const card = document.createElement("article"); card.className = "appointment-card"; card.dataset.appointmentId = appointment.id; card.dataset.appointmentStatus = status; card.dataset.appointmentDate = appointment.inicio; card.dataset.businessId = appointment.business_id || ""; card.dataset.serviceName = appointment.servico || ""; card.dataset.professionalName = appointment.profissional_nome || "Equipe do estabelecimento";
        const icon = document.createElement("div"); icon.className = "appt-icon " + (status === "cancelado" ? "red" : status === "concluido" ? "green" : "orange"); icon.textContent = status === "cancelado" ? "×" : status === "concluido" ? "✓" : "◔";
        const content = document.createElement("div"); content.className = "appt-content";
        const header = document.createElement("div"); header.className = "appt-header";
        const title = document.createElement("h4"); title.textContent = appointment.servico;
        const badge = document.createElement("span"); badge.className = "tag " + (status === "cancelado" ? "cancel" : status === "concluido" ? "success" : "pending"); badge.textContent = status === "cancelado" ? "Cancelado" : status === "concluido" ? "Concluído" : "Confirmado";
        header.append(title,badge);
        const business = document.createElement("p"); business.textContent = appointment.negocio;
        const professional = document.createElement("p"); professional.className = "appt-professional"; professional.textContent = "Profissional: " + (appointment.profissional_nome || "Equipe do estabelecimento");
        const meta = document.createElement("div"); meta.className = "appt-meta";
        const date = document.createElement("span"); date.textContent = "📅 " + new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"long",year:"numeric"}).format(start);
        const time = document.createElement("span"); time.textContent = "🕒 " + new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(start);
        const price = document.createElement("span");
        price.className = "appt-price";
        price.textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(appointment.preco) || 0);
        meta.append(date,time,price); content.append(header,business,professional,meta);
        const actions = document.createElement("div"); actions.className = "appt-actions";
        function addAction(label, action, className) { const button=document.createElement("button");button.type="button";button.className=className;button.textContent=label;button.dataset.appointmentAction=action;actions.appendChild(button); }
        addAction("Ver recibo", "receipt", "mini-btn secondary");
        if (["confirmado", "pendente"].includes(status) && start > new Date()) { addAction("Remarcar", "reschedule", "mini-btn primary"); addAction("Cancelar", "cancel", "mini-btn danger"); }
        if (appointment.business_id) addAction("Agendar novamente", "rebook", "mini-btn primary");
        card.append(icon,content,actions); section.appendChild(card);
      });
      if (!cards.length) { const empty=document.createElement("p");empty.className="appointments-empty";empty.textContent="Você ainda não tem agendamentos.";section.appendChild(empty); }
    } catch (error) {
      const count = section.querySelector(".count-pill");
      if (count) count.textContent = "Agenda indisponível";
      const empty = document.createElement("p");
      empty.className = "appointments-empty";
      empty.textContent = "Não foi possível carregar seus agendamentos. Atualize a página para tentar novamente.";
      section.appendChild(empty);
      showToast(error.message);
    }
  }

  function initReveal() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    const items = document.querySelectorAll(
      "main > section, .market-card, .appointment-card, .store-block, .notification-card, .profile-panel, .faq-item"
    );
    const observer = new IntersectionObserver(
      function (entries, currentObserver) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("p4-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.06 }
    );

    items.forEach(function (item, index) {
      item.classList.add("p4-reveal");
      item.style.transitionDelay = Math.min(index % 5, 4) * 45 + "ms";
      observer.observe(item);
    });
  }

  function init() {
    if (!document.body.classList.contains("p4-theme")) {
      document.body.classList.add("p4-theme");
    }
    if (
      document.body.classList.contains("storefront-body") &&
      new URLSearchParams(window.location.search).get("preview") === "draft"
    ) {
      document.body.classList.add("storefront-preview");
    }
    addSkipLink();
    createHeader();
    syncAccountNavigation();
    enforceSession();
    initHistoryBack();
    createPageIntro();
    addProductSidePanel();
    initHomeSearch();
    initHomeMenu();
    initBookingSelections();
    initFaq();
    initStoreCalendar();
    initStoreAgendaActions();
    initManualBooking();
    initFaqTabsAndFilters();
    initNotificationActions();
    initClientProfile();
    initBusinessProfile();
    initBusinessNavigation();
    initActionFeedback();
    loadClientAppointments();
    initClientAgendaControls();
    initReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
