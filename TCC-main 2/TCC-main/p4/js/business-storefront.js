(function () {
  "use strict";

  const DEMO_OWNER = "negocio.demo@agendly.test";
  const STORAGE_PREFIX = "agendly_storefront_v1:";
  const blockLabels = {
    text: "Texto e informações",
    services: "Serviços",
    team: "Equipe",
    questions: "Perguntas",
    hours: "Horários",
    payment: "Pagamento",
    promotion: "Oferta especial",
    highlights: "Diferenciais",
  };
  const blockIcons = {
    text: "T",
    services: "▣",
    team: "♙",
    questions: "?",
    hours: "◷",
    payment: "$",
    promotion: "★",
    highlights: "✦",
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getHoursBlock(data) {
    return (Array.isArray(data.blocks) ? data.blocks : []).find(function (block) {
      return block.type === "hours" && block.active;
    }) || null;
  }

  function getHoursForDate(block, isoDate) {
    if (!block || !block.schedule || !Array.isArray(block.schedule.closures)) return null;
    if (block.schedule.closures.some(function (closure) { return closure.date === isoDate; })) return null;
    const weekday = String(new Date(isoDate + "T12:00:00").getDay());
    const day = block.schedule.days && block.schedule.days[weekday];
    if (!day || day.closed) return null;
    const toMinutes = function (value) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return null;
      const parts = value.split(":").map(Number);
      return parts[0] * 60 + parts[1];
    };
    const open = toMinutes(day.open);
    const close = toMinutes(day.close);
    const breakStart = day.breakStart ? toMinutes(day.breakStart) : null;
    const breakEnd = day.breakEnd ? toMinutes(day.breakEnd) : null;
    if (open === null || close === null || open >= close) return null;
    if ((day.breakStart && breakStart === null) || (day.breakEnd && breakEnd === null)) return null;
    if ((breakStart === null) !== (breakEnd === null)) return null;
    if (breakStart !== null && (breakStart < open || breakEnd > close || breakStart >= breakEnd)) return null;
    return { open: open, close: close, breakStart: breakStart, breakEnd: breakEnd };
  }

  function getLocalSlots(hoursBlock, isoDate, duration) {
    const hours = getHoursForDate(hoursBlock, isoDate);
    if (!hours) return [];
    const now = new Date();
    const slots = [];
    for (let minute = hours.open; minute + duration <= hours.close; minute += 30) {
      const end = minute + duration;
      if (hours.breakStart !== null && minute < hours.breakEnd && end > hours.breakStart) continue;
      const time = String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
      const start = new Date(isoDate + "T" + time + ":00");
      if (start <= now) continue;
      slots.push(time);
    }
    return slots;
  }

  function formatHoursBlock(block) {
    const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const settings = block.schedule || {};
    const scheduleText = days.map(function (name, index) {
      const day = settings.days && settings.days[String(index)];
      if (!day || day.closed) return name + ": fechado";
      const interval = day.breakStart && day.breakEnd
        ? " (intervalo " + day.breakStart + "–" + day.breakEnd + ")"
        : "";
      return name + ": " + day.open + "–" + day.close + interval;
    });
    const closures = (Array.isArray(settings.closures) ? settings.closures : []).map(function (closure) {
      return closure.date + (closure.label ? " — " + closure.label : "");
    });
    return [
      block.description,
      scheduleText.join("\n"),
      closures.length ? "Fechamentos: " + closures.join("; ") : "",
    ].filter(Boolean).join("\n");
  }

  function getOwner() {
    const queryOwner = new URLSearchParams(window.location.search).get("business");
    const sessionOwner =
      window.sessionStorage.getItem("agendly_account_type") === "loja"
        ? window.sessionStorage.getItem("agendly_user")
        : "";
    return (queryOwner || sessionOwner || DEMO_OWNER).trim().toLowerCase();
  }

  function storageKey(owner) {
    return STORAGE_PREFIX + encodeURIComponent(owner.toLowerCase());
  }

  function getRegisteredBusinessName(owner) {
    const storedUsers = window.localStorage.getItem("agendly_user_db");
    if (!storedUsers) return "";
    const user = JSON.parse(storedUsers);
    return user.tipo === "loja" && user.email.toLowerCase() === owner
      ? user.nome
      : "";
  }

  function createDefaultState(owner) {
    const name =
      owner === DEMO_OWNER
        ? "Barbearia Silva Pro"
        : getRegisteredBusinessName(owner) || "Meu negócio";
    return {
      profile: {
        name: name,
        category: "Barbearia & Estética Masculina",
        tagline: "Especialista em visagismo, cortes e cuidados masculinos.",
        location: "Pinhais, São Paulo - SP",
        phone: "(11) 98765-4321",
        email: owner,
        avatar: "",
        banner: "",
      },
      blocks: [
        {
          id: "about",
          type: "text",
          title: "Sobre o estabelecimento",
          description:
            "Cortes modernos, barba na navalha e atendimento personalizado em um ambiente preparado para você.",
          active: true,
        },
        {
          id: "services",
          type: "services",
          title: "Serviços disponíveis",
          description: "",
          active: true,
          items: [
            {
              id: "haircut",
              name: "Corte de cabelo",
              description: "Corte personalizado com acabamento e finalização.",
              price: 60,
              duration: 45,
              active: true,
            },
            {
              id: "beard",
              name: "Barba com toalha quente",
              description: "Modelagem, hidratação e acabamento na navalha.",
              price: 45,
              duration: 30,
              active: true,
            },
            {
              id: "combo",
              name: "Combo corte + barba",
              description: "Corte completo e desenho da barba.",
              price: 95,
              duration: 75,
              active: true,
            },
          ],
        },
        {
          id: "questions",
          type: "questions",
          title: "Antes de agendar",
          description: "",
          active: true,
          items: [
            {
              id: "style",
              question: "Qual estilo você gostaria de fazer?",
              answer: "Se quiser, conte suas referências ao profissional.",
              required: false,
            },
          ],
        },
        {
          id: "hours",
          type: "hours",
          title: "Horários de atendimento",
          description: "Segunda a sábado, das 09:00 às 19:00.",
          active: true,
          schedule: {
            days: {
              "0": { closed: true },
              "1": { closed: false, open: "09:00", close: "19:00", breakStart: "", breakEnd: "" },
              "2": { closed: false, open: "09:00", close: "19:00", breakStart: "", breakEnd: "" },
              "3": { closed: false, open: "09:00", close: "19:00", breakStart: "", breakEnd: "" },
              "4": { closed: false, open: "09:00", close: "19:00", breakStart: "", breakEnd: "" },
              "5": { closed: false, open: "09:00", close: "19:00", breakStart: "", breakEnd: "" },
              "6": { closed: false, open: "09:00", close: "19:00", breakStart: "", breakEnd: "" },
            },
            closures: [],
          },
        },
        {
          id: "payment",
          type: "payment",
          title: "Formas de pagamento",
          description: "Pix, cartões e dinheiro. Pagamento no local.",
          active: true,
        },
      ],
    };
  }

  function createDefaultRecord(owner) {
    const initial = createDefaultState(owner);
    return {
      version: 1,
      draft: initial,
      published: owner === DEMO_OWNER ? clone(initial) : null,
    };
  }

  function readRecord(owner) {
    const raw = window.localStorage.getItem(storageKey(owner));
    if (!raw) return createDefaultRecord(owner);

    let record;
    try {
      record = JSON.parse(raw);
    } catch (error) {
      console.error("Dados da loja inválidos no armazenamento local.", error);
      throw new Error("Os dados salvos da loja estão corrompidos.");
    }

    if (!record || record.version !== 1 || !record.draft) {
      throw new Error("A versão dos dados salvos da loja não é compatível.");
    }
    return record;
  }

  function writeRecord(owner, record) {
    window.localStorage.setItem(storageKey(owner), JSON.stringify(record));
  }

  function load(owner, view) {
    const record = readRecord(owner);
    const data = view === "published" ? record.published : record.draft;
    return data ? clone(data) : null;
  }

  function saveDraft(owner, data) {
    const record = readRecord(owner);
    record.draft = clone(data);
    writeRecord(owner, record);
  }

  function publish(owner, data) {
    const record = readRecord(owner);
    record.draft = clone(data);
    record.published = clone(data);
    writeRecord(owner, record);
  }

  function listPublished() {
    const owners = new Set([DEMO_OWNER]);
    const storedUsers = window.localStorage.getItem("agendly_user_db");
    if (storedUsers) {
      const user = JSON.parse(storedUsers);
      if (user.tipo === "loja" && user.email) {
        owners.add(user.email.toLowerCase());
      }
    }

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.indexOf(STORAGE_PREFIX) === 0) {
        owners.add(decodeURIComponent(key.slice(STORAGE_PREFIX.length)));
      }
    }

    return Array.from(owners)
      .map(function (owner) {
        return { owner: owner, data: load(owner, "published") };
      })
      .filter(function (store) {
        return Boolean(store.data);
      });
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value) || 0);
  }

  function localDateValue(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function getInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0);
      })
      .join("")
      .toUpperCase();
  }

  function getActiveServices(data) {
    return (Array.isArray(data.blocks) ? data.blocks : [])
      .filter(function (block) {
        return block.type === "services" && block.active;
      })
      .flatMap(function (block) {
        return (Array.isArray(block.items) ? block.items : []).filter(function (service) {
          return service.active;
        });
      });
  }

  function getActiveProfessionals(data) {
    const seen = new Set();
    return (Array.isArray(data.blocks) ? data.blocks : [])
      .filter(function (block) {
        return block.type === "team" && block.active;
      })
      .flatMap(function (block) {
        return (block.items || []).filter(function (professional) {
          const name = String(professional.name || "").trim();
          const key = name.toLocaleLowerCase("pt-BR");
          if (!professional.active || !name || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
  }

  function getLowestPrice(services) {
    return services.reduce(function (lowest, service) {
      return Math.min(lowest, Number(service.price) || 0);
    }, Number.POSITIVE_INFINITY);
  }

  function getMarketCategory(category) {
    const normalized = String(category || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (normalized.indexOf("clin") >= 0 || normalized.indexOf("saude") >= 0) {
      return "clinica";
    }
    if (normalized.indexOf("eletric") >= 0 || normalized.indexOf("energia") >= 0) {
      return "eletrica";
    }
    if (normalized.indexOf("instrument") >= 0 || normalized.indexOf("musical") >= 0) {
      return "instrumentos";
    }
    if (normalized.indexOf("imove") >= 0 || normalized.indexOf("corret") >= 0) {
      return "imoveis";
    }
    return "cabelo";
  }

  function getHomeCategory(category) {
    const normalized = String(category || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (normalized.indexOf("barbearia") >= 0 || normalized.indexOf("barba") >= 0) {
      return "barbearia";
    }
    if (normalized.indexOf("massag") >= 0) return "massagem";
    if (normalized.indexOf("clin") >= 0 || normalized.indexOf("saude") >= 0) {
      return "saude";
    }
    return "cabelo";
  }

  function renderBusinessCard(owner, data) {
    const card = makeElement("article", "market-card");
    const activeServices = getActiveServices(data);
    const lowestPrice = getLowestPrice(activeServices);
    const top = makeElement("div", "card-top gradient-dark");
    top.appendChild(
      makeElement(
        "span",
        "pill-status",
        activeServices.length ? "Serviços publicados" : "Perfil do negócio"
      )
    );

    if (data.profile.banner) {
      top.style.backgroundImage =
        "linear-gradient(90deg, #081b39aa, #164b7b66), url(" +
        JSON.stringify(data.profile.banner) +
        ")";
      top.style.backgroundSize = "cover";
      top.style.backgroundPosition = "center";
    }

    if (data.profile.avatar) {
      const avatar = makeElement("img", "initials");
      avatar.src = data.profile.avatar;
      avatar.alt = "";
      top.appendChild(avatar);
    } else {
      top.appendChild(makeElement("div", "initials", getInitials(data.profile.name)));
    }

    const body = makeElement("div", "card-body");
    body.appendChild(makeElement("h3", "", data.profile.name));
    body.appendChild(makeElement("span", "card-cat", data.profile.category));
    body.appendChild(makeElement("div", "card-address", data.profile.location));
    const actions = makeElement("div", "card-actions");
    const priceText =
      activeServices.length && Number.isFinite(lowestPrice)
        ? "A partir de " + formatPrice(lowestPrice)
        : "Conheça nossos serviços";
    actions.appendChild(makeElement("span", "price", priceText));
    const link = makeElement("a", "btn primary", "Conhecer loja");
    link.href =
      "loja-online.html?business=" + encodeURIComponent(owner);
    actions.appendChild(link);
    body.appendChild(actions);
    card.dataset.category = getMarketCategory(data.profile.category);
    card.dataset.price =
      Number.isFinite(lowestPrice) && activeServices.length ? String(lowestPrice) : "0";
    card.append(top, body);
    return card;
  }

  function renderHomeBusinessCard(owner, data) {
    const profile = data.profile;
    const activeServices = getActiveServices(data);
    const lowestPrice = getLowestPrice(activeServices);
    const category = getHomeCategory(profile.category);
    const imageClass = {
      barbearia: "image-barber",
      cabelo: "image-salon",
      massagem: "image-spa",
      saude: "image-clinic",
    }[category];
    const storeUrl = new URL("cliente/loja-online.html", window.location.href);
    storeUrl.searchParams.set("business", owner);

    const card = makeElement("article", "p4-professional-card");
    card.dataset.businessStore = owner;
    card.dataset.category = category;
    card.dataset.search = [
      profile.name,
      profile.category,
      profile.location,
      activeServices
        .map(function (service) {
          return service.name + " " + service.description;
        })
        .join(" "),
    ].join(" ");

    const visual = makeElement("a", "professional-image " + imageClass);
    visual.href = storeUrl.href;
    visual.setAttribute("aria-label", "Conhecer " + profile.name);
    if (profile.banner) {
      visual.style.backgroundImage =
        "linear-gradient(90deg, #081b39aa, #164b7b66), url(" +
        JSON.stringify(profile.banner) +
        ")";
      visual.style.backgroundSize = "cover";
      visual.style.backgroundPosition = "center";
    }
    visual.appendChild(makeElement("span", "image-index", "LOJA ONLINE"));
    const monogram = makeElement("span", "professional-monogram");
    if (profile.avatar) {
      const avatar = makeElement("img", "professional-avatar");
      avatar.src = profile.avatar;
      avatar.alt = "";
      monogram.appendChild(avatar);
    } else {
      monogram.textContent = getInitials(profile.name);
    }
    visual.appendChild(monogram);
    visual.appendChild(
      makeElement("span", "image-caption", profile.category.toUpperCase())
    );

    const info = makeElement("div", "professional-info");
    const title = makeElement("div", "professional-title");
    title.appendChild(makeElement("h3", "", profile.name));
    title.appendChild(makeElement("span", "", "Loja online"));
    info.appendChild(title);

    const metadata = makeElement("p");
    metadata.appendChild(document.createTextNode(profile.category));
    metadata.appendChild(makeElement("i"));
    metadata.appendChild(document.createTextNode(profile.location));
    info.appendChild(metadata);

    const actions = makeElement("div", "professional-cta");
    const priceText =
      activeServices.length && Number.isFinite(lowestPrice)
        ? "Serviços desde "
        : "Conheça os serviços";
    const price = makeElement("span", "", priceText);
    if (activeServices.length && Number.isFinite(lowestPrice)) {
      price.appendChild(makeElement("strong", "", formatPrice(lowestPrice)));
    }
    actions.appendChild(price);
    const link = makeElement("a", "");
    link.href = storeUrl.href;
    link.appendChild(document.createTextNode("Conhecer"));
    link.appendChild(makeElement("b", "", "↗"));
    actions.appendChild(link);
    info.appendChild(actions);

    const availability = makeElement("small", "available-time");
    availability.appendChild(makeElement("i"));
    availability.appendChild(document.createTextNode(" VITRINE PUBLICADA"));
    info.appendChild(availability);

    card.append(visual, info);
    return card;
  }

  function renderHomeMarketplace() {
    const grid = document.querySelector(".p4-home .p4-professional-grid");
    if (!grid) return;

    grid.querySelectorAll(".p4-professional-card:not([data-business-store])").forEach(function (card) {
      card.remove();
    });
    listPublished().forEach(function (business) {
      const exists = Array.from(
        grid.querySelectorAll("[data-business-store]")
      ).some(function (card) {
        return card.dataset.businessStore === business.owner;
      });
      if (!exists) {
        const card = renderHomeBusinessCard(business.owner, business.data);
        card.dataset.businessStore = business.owner;
        grid.prepend(card);
      }
    });
    const emptyState = document.querySelector(".p4-home .p4-empty-state");
    if (emptyState) {
      const hasStores = grid.querySelectorAll(".p4-professional-card").length > 0;
      grid.hidden = !hasStores;
      emptyState.textContent = hasStores
        ? "Nenhum negócio encontrado. Experimente outra busca."
        : "Ainda não há negócios publicados. Volte em breve.";
      emptyState.hidden = hasStores;
    }
  }

  function renderMarketplace() {
    const grid = document.querySelector("#market-grid");
    if (!grid) return;

    const businesses = listPublished();
    businesses.forEach(function (business) {
      const card = renderBusinessCard(business.owner, business.data);
      card.dataset.businessStore = business.owner;
      grid.prepend(card);
    });

    const count = document.querySelector(".results-count");
    if (count) {
      count.textContent =
        grid.querySelectorAll(".market-card").length + " resultados encontrados";
    }
  }

  function renderPublicStore(remoteData) {
    const page = document.querySelector("#storefront-public");
    if (!page) return;

    const owner = getOwner();
    const isPreview = new URLSearchParams(window.location.search).get("preview") === "draft";
    document.body.classList.toggle("storefront-preview", isPreview);
    const data = remoteData || load(owner, isPreview ? "draft" : "published");
    const empty = page.querySelector(".storefront-empty");
    const content = page.querySelector(".storefront-content");
    if (!data) {
      if (empty) empty.hidden = false;
      if (content) content.hidden = true;
      return;
    }

    const profile = data.profile;
    document.title = profile.name + " — Agendly";
    page.querySelector("#storefront-name").textContent = profile.name;
    page.querySelector("#storefront-category").textContent = profile.category;
    page.querySelector("#storefront-tagline").textContent = profile.tagline;
    page.querySelector("#storefront-location").textContent = profile.location;
    const phoneLink = page.querySelector("#storefront-phone");
    phoneLink.textContent = profile.phone;
    phoneLink.href = "tel:" + profile.phone.replace(/\D/g, "");
    const emailLink = page.querySelector("#storefront-email");
    emailLink.hidden = !profile.email;
    emailLink.textContent = profile.email || "";
    emailLink.href = profile.email ? "mailto:" + profile.email : "";
    const hasActiveServices = data.blocks.some(function (block) {
      return (
        block.type === "services" &&
        block.active &&
        block.items.some(function (service) {
          return service.active;
        })
      );
    });
    const status = page.querySelector(".storefront-open-status");
    status.classList.toggle("is-unavailable", !hasActiveServices);
    page.querySelector("#storefront-status-text").textContent = hasActiveServices
      ? "Serviços publicados"
      : "Serviços temporariamente indisponíveis";
    page.querySelector("#storefront-avatar").replaceChildren();
    if (profile.avatar) {
      const avatar = makeElement("img");
      avatar.src = profile.avatar;
      avatar.alt = "Foto de " + profile.name;
      page.querySelector("#storefront-avatar").appendChild(avatar);
    } else {
      page.querySelector("#storefront-avatar").textContent = getInitials(profile.name);
    }

    const banner = page.querySelector("#storefront-banner");
    if (profile.banner) {
      banner.style.backgroundImage =
        "linear-gradient(90deg, #081b39aa, #164b7b33), url(" +
        JSON.stringify(profile.banner) +
        ")";
      banner.classList.add("has-image");
    } else {
      banner.style.backgroundImage = "";
      banner.classList.remove("has-image");
    }

    const bookingDates = Array.from({ length: 14 }, function (_, index) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + index);
      const weekday = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
      }).format(date);
      const month = new Intl.DateTimeFormat("pt-BR", {
        month: "short",
      })
        .format(date)
        .replace(".", "");
      const dayNumber = String(date.getDate()).padStart(2, "0");
      const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
      return {
        dayLabel:
          index === 0
            ? "HOJE"
            : index === 1
              ? "AMANHÃ"
              : weekday.toUpperCase(),
        dateLabel: date.getDate() + " de " + month,
        numericLabel: dayNumber + "/" + monthNumber,
        isoDate: date.getFullYear() + "-" + monthNumber + "-" + dayNumber,
        summaryLabel:
          index === 0
            ? "hoje"
            : index === 1
              ? "amanhã"
              : weekday,
      };
    });
    let selectedDateIndex = 0;
    let selectedTime = "";
    let selectedService = null;
    const professionals = getActiveProfessionals(data);
    const professionalSelect = page.querySelector("#storefront-professional");
    const professionalPlaceholder = makeElement("option", "", professionals.length
      ? "Selecione um profissional"
      : "Atendimento do estabelecimento");
    professionalPlaceholder.value = professionals.length ? "" : "Equipe do estabelecimento";
    professionalPlaceholder.disabled = professionals.length > 0;
    professionalPlaceholder.selected = true;
    professionalSelect.replaceChildren(professionalPlaceholder);
    professionals.forEach(function (professional) {
      const option = makeElement(
        "option",
        "",
        professional.name + (professional.specialty ? " · " + professional.specialty : "")
      );
      option.value = professional.name;
      professionalSelect.appendChild(option);
    });
    let selectedProfessional = professionals.length ? "" : "Equipe do estabelecimento";
    const questionResponses = [];
    const hoursBlock = getHoursBlock(data);
    let availabilityRequest = 0;

    function updateBookingSummary() {
      const date = bookingDates[selectedDateIndex];
      const summary = page.querySelector("#storefront-booking-summary");
      const total = page.querySelector("#storefront-booking-total");
      const bookButton = page.querySelector("#storefront-book");
      const bookingStatus = page.querySelector("#storefront-booking-status");
      bookButton.disabled = !selectedService || !selectedProfessional || !selectedTime;
      if (selectedService) {
        summary.textContent =
          selectedService.name +
          " · " +
          selectedProfessional +
          " • " +
          date.summaryLabel +
          " " +
          date.dateLabel +
          " às " +
          selectedTime;
        total.textContent =
          "Total: " +
          formatPrice(selectedService.price) +
          " · pagamento conforme combinado com o estabelecimento.";
      } else {
        summary.textContent = "Selecione um serviço para continuar";
        total.textContent = "";
      }
      bookingStatus.textContent = "";
    }

    const dateGrid = page.querySelector("#storefront-date-grid");
    dateGrid.replaceChildren();
    bookingDates.forEach(function (date, index) {
      const option = makeElement(
        "button",
        "date-card" + (index === selectedDateIndex ? " selected" : "")
      );
      option.type = "button";
      option.setAttribute("aria-pressed", String(index === selectedDateIndex));
      option.appendChild(makeElement("span", "day-label", date.dayLabel));
      option.appendChild(makeElement("strong", "", date.dateLabel));
      option.appendChild(makeElement("span", "day-vacancies", "Ver horários"));
      option.addEventListener("click", function () {
        selectedDateIndex = index;
        selectedTime = "";
        dateGrid.querySelectorAll(".date-card").forEach(function (item, itemIndex) {
          const active = itemIndex === selectedDateIndex;
          item.classList.toggle("selected", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderTimeOptions();
        updateBookingSummary();
      });
      dateGrid.appendChild(option);
    });

    async function renderTimeOptions() {
      const requestId = ++availabilityRequest;
      const date = bookingDates[selectedDateIndex];
      const timeLabel = page.querySelector("#storefront-time-label");
      const timeGrid = page.querySelector("#storefront-time-grid");
      dateGrid.querySelectorAll(".date-card").forEach(function (item) {
        item.classList.remove("is-unavailable");
        item.querySelector(".day-vacancies").textContent = "Ver horários";
      });
      timeLabel.textContent =
        "HORÁRIOS DISPONÍVEIS PARA " +
        date.dayLabel +
        " (" +
        date.numericLabel +
        "):";
      timeGrid.replaceChildren();
      selectedTime = "";
      if (!selectedService) {
        timeGrid.appendChild(makeElement("p", "storefront-muted", "Escolha um serviço para consultar os horários."));
        updateBookingSummary();
        return;
      }
      if (!selectedProfessional) {
        timeGrid.appendChild(makeElement("p", "storefront-muted", "Escolha um profissional para consultar os horários."));
        updateBookingSummary();
        return;
      }
      timeGrid.appendChild(makeElement("p", "storefront-muted", "Consultando disponibilidade..."));
      let days;
      try {
        if (window.AgendlyApi && window.AgendlyApi.enabled) {
          const result = await window.AgendlyApi.request("availability", "GET", undefined, {
            business: owner,
            service: selectedService.name,
            professional: selectedProfessional,
            from: bookingDates[0].isoDate,
            days: String(bookingDates.length),
            draft: isPreview ? "1" : undefined,
          });
          days = result.days;
        } else {
          days = bookingDates.map(function (item) {
            return {
              date: item.isoDate,
              slots: getLocalSlots(hoursBlock, item.isoDate, Number(selectedService.duration) || 30),
            };
          });
        }
      } catch (error) {
        if (requestId !== availabilityRequest) return;
        timeGrid.replaceChildren(makeElement("p", "storefront-muted", error.message));
        updateBookingSummary();
        return;
      }
      if (requestId !== availabilityRequest) return;
      if (!Array.isArray(days) || days.length !== bookingDates.length || days.some(function (item, index) {
        return !item || item.date !== bookingDates[index].isoDate || !Array.isArray(item.slots) ||
          item.slots.some(function (time) { return !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time); });
      })) {
        timeGrid.replaceChildren(makeElement("p", "storefront-muted", "A resposta de disponibilidade está inválida. Tente novamente."));
        updateBookingSummary();
        return;
      }
      const slotsByDate = new Map(days.map(function (item) {
        return [item.date, Array.isArray(item.slots) ? item.slots : []];
      }));
      bookingDates.forEach(function (item, index) {
        const dayButton = dateGrid.children[index];
        const slots = slotsByDate.get(item.isoDate) || [];
        dayButton.classList.toggle("is-unavailable", slots.length === 0);
        dayButton.querySelector(".day-vacancies").textContent =
          slots.length === 1 ? "1 horário" : slots.length ? slots.length + " horários" : "Indisponível";
        dayButton.setAttribute("aria-label", item.dateLabel + ": " + (slots.length ? slots.length + " horários disponíveis" : "sem horários disponíveis"));
      });
      const availableTimes = slotsByDate.get(date.isoDate) || [];
      selectedTime = availableTimes[0] || "";
      timeGrid.replaceChildren();
      availableTimes.forEach(function (time, index) {
        const option = makeElement(
          "button",
          "time-slot" + (time === selectedTime ? " selected" : ""),
          time
        );
        option.type = "button";
        option.setAttribute("aria-pressed", String(time === selectedTime));
        option.addEventListener("click", function () {
          selectedTime = time;
          timeGrid.querySelectorAll(".time-slot").forEach(function (item, itemIndex) {
            const active = itemIndex === index;
            item.classList.toggle("selected", active);
            item.setAttribute("aria-pressed", String(active));
          });
          updateBookingSummary();
        });
        timeGrid.appendChild(option);
      });
      if (!availableTimes.length) {
        timeGrid.appendChild(makeElement("p", "storefront-muted", "Sem horários disponíveis para este dia."));
      }
      updateBookingSummary();
    }

    renderTimeOptions();
    professionalSelect.addEventListener("change", function () {
      selectedProfessional = professionalSelect.value;
      selectedTime = "";
      renderTimeOptions();
      updateBookingSummary();
    });

    const sections = page.querySelector("#storefront-blocks");
    sections.replaceChildren();
    data.blocks
      .filter(function (block) {
        return block.active;
      })
      .forEach(function (block) {
        const section = makeElement("section", "storefront-section");
        section.appendChild(makeElement("h2", "", block.title));

        if (block.type === "services") {
          const list = makeElement("div", "storefront-service-list");
          block.items
            .filter(function (service) {
              return service.active;
            })
            .forEach(function (service) {
              const isSelected = selectedService === null;
              const card = makeElement("article", "storefront-service");
              const info = makeElement("div", "storefront-service-info");
              info.appendChild(makeElement("h3", "", service.name));
              info.appendChild(makeElement("p", "", service.description));
              const meta = makeElement("div", "storefront-service-meta");
              meta.appendChild(makeElement("strong", "", formatPrice(service.price)));
              meta.appendChild(makeElement("span", "", service.duration + " min"));
              info.appendChild(meta);
              const button = makeElement(
                "button",
                "storefront-select" + (isSelected ? " is-selected" : ""),
                isSelected ? "Selecionado" : "Selecionar"
              );
              button.type = "button";
              button.setAttribute("aria-pressed", String(isSelected));
              button.addEventListener("click", function () {
                list.querySelectorAll(".storefront-select").forEach(function (item) {
                  const active = item === button;
                  item.classList.toggle("is-selected", active);
                  item.setAttribute("aria-pressed", String(active));
                  item.textContent = active ? "Selecionado" : "Selecionar";
                });
                selectedService = service;
                selectedTime = "";
                renderTimeOptions();
                updateBookingSummary();
              });
              card.append(info, button);
              list.appendChild(card);
              if (isSelected) selectedService = service;
            });
          if (!list.childElementCount) {
            list.appendChild(
              makeElement("p", "storefront-muted", "Novos serviços em breve.")
            );
          }
          section.appendChild(list);
        } else if (block.type === "team") {
          const list = makeElement("div", "storefront-team-list");
          (block.items || [])
            .filter(function (professional) {
              return professional.active && String(professional.name || "").trim();
            })
            .forEach(function (professional) {
              const card = makeElement("article", "storefront-team-member");
              card.appendChild(makeElement("span", "storefront-team-monogram", getInitials(professional.name)));
              const info = makeElement("div", "storefront-team-info");
              info.appendChild(makeElement("h3", "", professional.name));
              if (professional.specialty) info.appendChild(makeElement("p", "", professional.specialty));
              card.appendChild(info);
              list.appendChild(card);
            });
          if (!list.childElementCount) {
            list.appendChild(makeElement("p", "storefront-muted", "A equipe será divulgada em breve."));
          }
          section.appendChild(list);
        } else if (block.type === "questions") {
          const list = makeElement("div", "storefront-question-list");
          block.items.forEach(function (item) {
            const details = makeElement("details", "storefront-question");
            const summary = makeElement("summary", "", item.question);
            if (item.required) {
              summary.appendChild(
                makeElement("span", "storefront-required", "Obrigatória")
              );
            }
            details.appendChild(summary);
            if (item.answer) details.appendChild(makeElement("p", "", item.answer));
            const responseId =
              "storefront-question-response-" + (questionResponses.length + 1);
            const responseLabel = makeElement(
              "label",
              "storefront-question-response-label",
              "Sua resposta"
            );
            responseLabel.htmlFor = responseId;
            const responseInput = makeElement(
              "textarea",
              "storefront-question-response"
            );
            responseInput.id = responseId;
            responseInput.name = responseId;
            responseInput.rows = 3;
            responseInput.maxLength = 300;
            responseInput.required = item.required === true;
            responseInput.placeholder = "Escreva sua resposta ou referências...";
            responseInput.setAttribute("aria-label", item.question);
            responseInput.addEventListener("input", function () {
              page.querySelector("#storefront-booking-status").textContent = "";
            });
            details.append(responseLabel, responseInput);
            questionResponses.push({
              question: item.question,
              required: item.required === true,
              details: details,
              input: responseInput,
            });
            list.appendChild(details);
          });
          section.appendChild(list);
        } else if (block.type === "hours") {
          section.appendChild(
            makeElement("p", "storefront-section-copy storefront-hours-copy", formatHoursBlock(block))
          );
        } else {
          section.appendChild(
            makeElement("p", "storefront-section-copy", block.description)
          );
        }
        sections.appendChild(section);
      });

    renderTimeOptions();
    const bookButton = page.querySelector("#storefront-book");
    const bookingStatus = page.querySelector("#storefront-booking-status");
    updateBookingSummary();
    bookButton.onclick = async function () {
      if (!selectedService) return;
      const unansweredRequired = questionResponses.find(function (response) {
        return response.required && !response.input.value.trim();
      });
      if (unansweredRequired) {
        unansweredRequired.details.open = true;
        unansweredRequired.input.focus();
        bookingStatus.textContent =
          "Responda à pergunta obrigatória: " +
          unansweredRequired.question;
        return;
      }
      const providedAnswers = questionResponses
        .filter(function (response) {
          return response.input.value.trim();
        })
        .map(function (response) {
          return response.question + ": " + response.input.value.trim();
        });
      if (window.AgendlyApi && window.AgendlyApi.enabled && !isPreview) {
        try {
          await window.AgendlyApi.request("appointment-create", "POST", {
            business: owner,
            service: selectedService.name,
            date: bookingDates[selectedDateIndex].isoDate,
            time: selectedTime,
            answers: questionResponses.filter(function (answer) { return answer.input.value.trim(); }).map(function (answer) { return { question: answer.question, answer: answer.input.value.trim() }; }),
            professional: selectedProfessional,
          });
          bookingStatus.textContent = "Agendamento confirmado. Você já pode acompanhar o horário na sua agenda.";
          bookButton.disabled = true;
          return;
        } catch (error) {
          bookingStatus.textContent = error.message;
          return;
        }
      }
      bookingStatus.textContent =
        "Prévia de agendamento: " +
        selectedService.name +
        " • " +
        bookingDates[selectedDateIndex].summaryLabel +
        " às " +
        selectedTime +
        " • " +
        formatPrice(selectedService.price) +
        ". Esta demonstração não registra uma reserva.";
      if (providedAnswers.length) {
        bookingStatus.textContent += " Respostas: " + providedAnswers.join(" | ");
      }
    };
    if (empty) empty.hidden = true;
    if (content) content.hidden = false;
  }

  window.AgendlyStorefront = {
    DEMO_OWNER: DEMO_OWNER,
    blockLabels: blockLabels,
    blockIcons: blockIcons,
    clone: clone,
    createDefaultState: createDefaultState,
    createDefaultRecord: createDefaultRecord,
    createNewBlock: function (type) {
      const id = "block-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const block = {
        id: id,
        type: type,
        title: blockLabels[type] || "Novo bloco",
        description: "",
        active: true,
      };
      if (type === "services") block.items = [];
      if (type === "questions") block.items = [];
      if (type === "team") {
        block.title = "Profissionais";
        block.items = [];
      }
      if (type === "hours") {
        block.description = "Configure o expediente semanal e as datas de fechamento.";
        block.schedule = {
          days: {
            "0": { closed: true },
            "1": { closed: true },
            "2": { closed: true },
            "3": { closed: true },
            "4": { closed: true },
            "5": { closed: true },
            "6": { closed: true },
          },
          closures: [],
        };
      }
      if (type === "promotion") {
        block.title = "Oferta especial";
        block.description = "Conte aos clientes sobre uma condição especial.";
      }
      if (type === "highlights") {
        block.title = "Por que escolher a gente?";
        block.description = "Destaque seus diferenciais e a experiência oferecida.";
      }
      return block;
    },
    getOwner: getOwner,
    activeProfessionals: getActiveProfessionals,
    load: load,
    saveDraft: saveDraft,
    publish: publish,
    listPublished: listPublished,
  };

  async function init() {
    if (window.AgendlyApi && window.AgendlyApi.enabled) {
      try {
        document.querySelectorAll(".p4-home .p4-professional-card:not([data-business-store]), #market-grid .market-card:not([data-business-store])").forEach(function (card) { card.remove(); });
        const result = await window.AgendlyApi.request("businesses", "GET");
        (result.businesses || []).forEach(function (business) {
          if (document.querySelector(".p4-home .p4-professional-grid")) {
            const grid = document.querySelector(".p4-home .p4-professional-grid");
            if (!grid.querySelector('[data-business-store="' + CSS.escape(String(business.id)) + '"]')) {
              const card = renderHomeBusinessCard(String(business.id), business.store);
              card.dataset.businessStore = String(business.id);
              grid.prepend(card);
            }
          }
          const grid = document.querySelector("#market-grid");
          if (grid && !grid.querySelector('[data-business-store="' + CSS.escape(String(business.id)) + '"]')) {
            const card = renderBusinessCard(String(business.id), business.store);
            card.dataset.businessStore = String(business.id);
            grid.prepend(card);
          }
        });
        const count = document.querySelector(".results-count");
        if (count) count.textContent = document.querySelectorAll("#market-grid .market-card").length + " resultados encontrados";
        const homeEmpty = document.querySelector(".p4-home .p4-empty-state");
        if (homeEmpty) {
          const hasStores = document.querySelectorAll(".p4-home .p4-professional-card").length > 0;
          const homeGrid = document.querySelector(".p4-home .p4-professional-grid");
          if (homeGrid) homeGrid.hidden = !hasStores;
          homeEmpty.textContent = hasStores ? "Nenhum profissional encontrado. Experimente outra busca." : "Ainda não há negócios publicados. Volte em breve.";
          homeEmpty.hidden = hasStores;
        }
        if (document.querySelector("#storefront-public")) {
          const query = new URLSearchParams(window.location.search);
          const preview = query.get("preview") === "draft";
          const store = await window.AgendlyApi.request("store", "GET", undefined, { business: getOwner(), draft: preview ? "1" : undefined });
          renderPublicStore(store.store.store);
        }
      } catch (error) {
        const page = document.querySelector("#storefront-public");
        if (page) {
          page.querySelector(".storefront-empty").hidden = false;
          page.querySelector(".storefront-empty h1").textContent = error.message;
          page.querySelector(".storefront-content").hidden = true;
        } else {
          const homeEmpty = document.querySelector(".p4-home .p4-empty-state");
          const count = document.querySelector(".results-count");
          if (homeEmpty) {
            homeEmpty.textContent = "Não foi possível carregar os negócios agora. Atualize a página para tentar novamente.";
            homeEmpty.hidden = false;
          }
          if (count) count.textContent = "Negócios indisponíveis";
        }
      }
      return;
    }
    renderHomeMarketplace();
    renderMarketplace();
    renderPublicStore();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
