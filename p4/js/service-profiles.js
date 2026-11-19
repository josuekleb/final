(function () {
  "use strict";

  const profiles = {
    cabelo: {
      name: "Studio Arte & Cabelo",
      initials: "SA",
      category: "Cabelo & Estética",
      rating: "4,9",
      reviews: "128",
      email: "contato@studioartecabelo.com.br",
      phone: "(11) 98765-4321",
      address: ["Av. Paulista, 1000 - Jardins", "São Paulo - SP"],
      hours: "Seg - Sáb: 09:00 - 20:00",
      description:
        "Especialistas em cortes modernos, visagismo e tratamentos capilares, com ambiente acolhedor e atendimento personalizado.",
      response: "Imediato (Online)",
      services: [
        {
          icon: "✂",
          name: "Corte de Cabelo Masculino & Fade",
          description:
            "Lavagem inclusa, finalização com modelagem e acabamento no contorno.",
          price: 60,
          duration: "45 min",
        },
        {
          icon: "✳",
          name: "Corte, Escova & Finalização",
          description:
            "Corte personalizado com escova e finalização para valorizar seu estilo.",
          price: 90,
          duration: "1h",
        },
        {
          icon: "✦",
          name: "Hidratação Capilar",
          description:
            "Tratamento nutritivo para devolver maciez, brilho e movimento aos fios.",
          price: 120,
          duration: "1h 15min",
        },
      ],
      slots: [
        ["09:30", "10:30", "11:30", "14:00", "15:30", "17:00"],
        ["09:00", "10:00", "13:30", "15:00", "17:30"],
        ["09:30", "11:00", "13:00", "14:30"],
        ["10:00", "11:30", "14:00"],
      ],
    },
    barbearia: {
      name: "Barbearia Clássica & Lounge",
      initials: "BC",
      category: "Barbearia & cuidados masculinos",
      rating: "4,9",
      reviews: "102",
      email: "agenda@barbeariaclassica.com.br",
      phone: "(11) 97654-3210",
      address: ["Rua Oscar Freire, 612 - Cerqueira César", "São Paulo - SP"],
      hours: "Seg - Sáb: 09:00 - 21:00",
      description:
        "Barbearia clássica com cortes precisos, cuidados para a barba e um lounge confortável para aproveitar o momento.",
      response: "Imediato (Online)",
      services: [
        {
          icon: "✂",
          name: "Corte clássico ou degradê",
          description:
            "Corte personalizado com acabamento na navalha e finalização.",
          price: 55,
          duration: "45 min",
        },
        {
          icon: "✦",
          name: "Barba com toalha quente",
          description:
            "Modelagem, toalha quente e hidratação para um acabamento confortável.",
          price: 45,
          duration: "30 min",
        },
        {
          icon: "✓",
          name: "Combo corte + barba",
          description:
            "Corte completo e desenho da barba em uma única experiência.",
          price: 85,
          duration: "1h 15min",
        },
      ],
      slots: [
        ["09:00", "10:15", "11:30", "13:45", "15:00", "16:15", "18:00"],
        ["09:30", "11:00", "13:30", "15:15", "17:00"],
        ["10:00", "11:15", "14:00", "16:30"],
        ["09:00", "10:30", "12:00", "14:15"],
      ],
    },
    saude: {
      name: "Clínica Vida & Saúde",
      initials: "VS",
      category: "Saúde & dermatologia",
      rating: "5,0",
      reviews: "86",
      email: "atendimento@clinicavidaesaude.com.br",
      phone: "(11) 95555-1840",
      address: ["Rua Bela Cintra, 450 - Consolação", "São Paulo - SP"],
      hours: "Seg - Sex: 08:00 - 18:00",
      description:
        "Atendimento médico atencioso em clínica geral e dermatologia, com consultas presenciais e acompanhamento individual.",
      response: "Até 2 horas",
      services: [
        {
          icon: "＋",
          name: "Consulta de clínica geral",
          description:
            "Avaliação médica individual para cuidar da sua saúde e bem-estar.",
          price: 180,
          duration: "50 min",
        },
        {
          icon: "✦",
          name: "Consulta dermatológica",
          description:
            "Avaliação da pele, orientações e plano de cuidados personalizado.",
          price: 220,
          duration: "1h",
        },
        {
          icon: "✓",
          name: "Retorno médico",
          description:
            "Acompanhamento dos cuidados e revisão de orientações anteriores.",
          price: 90,
          duration: "30 min",
        },
      ],
      slots: [
        ["08:30", "10:00", "11:30", "14:00", "15:30"],
        ["09:00", "10:30", "13:30", "15:00"],
        ["08:30", "11:00", "14:30"],
        ["09:30", "11:00", "14:00", "16:00"],
      ],
    },
    massagem: {
      name: "Serena Spa Urbano",
      initials: "SS",
      category: "Massagem & bem-estar",
      rating: "4,9",
      reviews: "74",
      email: "reservas@serenaspa.com.br",
      phone: "(11) 94444-7733",
      address: ["Rua dos Pinheiros, 320 - Pinheiros", "São Paulo - SP"],
      hours: "Todos os dias: 09:00 - 20:00",
      description:
        "Um espaço tranquilo para desacelerar, aliviar tensões e recuperar o equilíbrio com terapias e cuidados corporais.",
      response: "Imediato (Online)",
      services: [
        {
          icon: "✳",
          name: "Massagem relaxante",
          description:
            "Movimentos suaves e óleos aromáticos para relaxar corpo e mente.",
          price: 120,
          duration: "60 min",
        },
        {
          icon: "✦",
          name: "Massagem terapêutica",
          description:
            "Técnicas de pressão direcionadas para aliviar pontos de tensão.",
          price: 160,
          duration: "60 min",
        },
        {
          icon: "◉",
          name: "Ritual pedras quentes",
          description:
            "Terapia corporal com pedras aquecidas para relaxamento profundo.",
          price: 210,
          duration: "90 min",
        },
      ],
      slots: [
        ["09:00", "10:30", "13:00", "14:30", "16:00"],
        ["09:30", "11:00", "13:30", "15:30", "17:00"],
        ["10:00", "11:30", "14:00", "16:30"],
        ["09:00", "12:00", "14:30", "17:00"],
      ],
    },
    coloracao: {
      name: "Raio de Luz Beauty Studio",
      initials: "RL",
      category: "Coloração & tratamentos capilares",
      rating: "4,8",
      reviews: "91",
      email: "agenda@raiodeluzstudio.com.br",
      phone: "(11) 96652-4108",
      address: ["Rua da Consolação, 730 - Centro", "São Paulo - SP"],
      hours: "Ter - Sáb: 09:00 - 19:00",
      description:
        "Coloristas especializados em transformar o visual com técnicas atuais, diagnóstico capilar e cuidado personalizado.",
      response: "Imediato (Online)",
      services: [
        {
          icon: "✦",
          name: "Coloração completa",
          description:
            "Mudança de cor com avaliação dos fios e finalização profissional.",
          price: 180,
          duration: "2h",
        },
        {
          icon: "✳",
          name: "Mechas & balayage",
          description:
            "Iluminação personalizada com técnica escolhida para o seu cabelo.",
          price: 360,
          duration: "4h",
        },
        {
          icon: "✓",
          name: "Reconstrução capilar",
          description:
            "Tratamento intensivo para fortalecer e recuperar os fios.",
          price: 140,
          duration: "1h",
        },
      ],
      slots: [
        ["09:00", "11:30", "14:00", "16:30"],
        ["09:30", "12:00", "14:30", "17:00"],
        ["10:00", "13:00", "15:30"],
        ["09:00", "11:00", "14:00", "16:00"],
      ],
    },
    manicure: {
      name: "Ateliê Mãos & Pés",
      initials: "MP",
      category: "Manicure & pedicure",
      rating: "4,9",
      reviews: "67",
      email: "reservas@atelie.maos.br",
      phone: "(11) 93421-6087",
      address: ["Rua Harmonia, 210 - Vila Madalena", "São Paulo - SP"],
      hours: "Seg - Sáb: 09:00 - 19:00",
      description:
        "Um espaço acolhedor para cuidados com as unhas, esmaltação e momentos de autocuidado com hora marcada.",
      response: "Imediato (Online)",
      services: [
        {
          icon: "✦",
          name: "Manicure & esmaltação",
          description:
            "Cutilagem cuidadosa, lixamento e esmaltação tradicional.",
          price: 55,
          duration: "50 min",
        },
        {
          icon: "✳",
          name: "Pedicure completa",
          description:
            "Cuidado dos pés com esfoliação, hidratação e esmaltação.",
          price: 70,
          duration: "1h",
        },
        {
          icon: "✓",
          name: "Unhas em gel",
          description:
            "Alongamento em gel com acabamento natural e esmaltação.",
          price: 160,
          duration: "2h",
        },
      ],
      slots: [
        ["09:00", "10:30", "13:00", "14:30", "16:00"],
        ["09:30", "11:00", "13:30", "15:00"],
        ["10:00", "11:30", "14:00", "16:30"],
        ["09:00", "10:30", "13:00", "15:30"],
      ],
    },
    sobrancelha: {
      name: "Traço Fino Studio",
      initials: "TF",
      category: "Design de sobrancelhas",
      rating: "4,9",
      reviews: "58",
      email: "oi@tracofinostudio.com.br",
      phone: "(11) 94567-2180",
      address: ["Alameda Jaú, 840 - Jardim Paulista", "São Paulo - SP"],
      hours: "Ter - Sáb: 10:00 - 19:00",
      description:
        "Design personalizado que valoriza cada formato de rosto, com técnicas delicadas e atendimento individual.",
      response: "Até 1 hora",
      services: [
        {
          icon: "✦",
          name: "Design de sobrancelhas",
          description:
            "Mapeamento e desenho personalizado com pinça e finalização.",
          price: 65,
          duration: "40 min",
        },
        {
          icon: "✳",
          name: "Design com henna",
          description:
            "Modelagem dos fios com aplicação de henna em tom personalizado.",
          price: 85,
          duration: "50 min",
        },
        {
          icon: "✓",
          name: "Lash lifting",
          description:
            "Curvatura e realce dos cílios naturais com efeito duradouro.",
          price: 150,
          duration: "1h 15min",
        },
      ],
      slots: [
        ["10:00", "11:00", "13:30", "15:00", "17:00"],
        ["10:30", "12:00", "14:00", "16:30"],
        ["09:30", "11:30", "14:30", "16:00"],
        ["10:00", "12:30", "15:00", "17:00"],
      ],
    },
    "barbearia-premium": {
      name: "Barbearia Fio Navalha",
      initials: "FN",
      category: "Barba & cuidados masculinos",
      rating: "4,8",
      reviews: "53",
      email: "agenda@fionavalha.com.br",
      phone: "(11) 98210-4675",
      address: ["Rua dos Pinheiros, 880 - Pinheiros", "São Paulo - SP"],
      hours: "Seg - Sáb: 09:00 - 21:00",
      description:
        "Barbearia contemporânea com atendimento individual, técnicas clássicas e produtos profissionais.",
      response: "Imediato (Online)",
      services: [
        {
          icon: "✂",
          name: "Corte degradê",
          description:
            "Degradê personalizado com acabamento detalhado na navalha.",
          price: 60,
          duration: "45 min",
        },
        {
          icon: "✦",
          name: "Barba desenhada",
          description:
            "Alinhamento e desenho da barba com toalha quente.",
          price: 48,
          duration: "35 min",
        },
        {
          icon: "✓",
          name: "Corte, barba & acabamento",
          description:
            "Experiência completa com corte, barba e finalização.",
          price: 98,
          duration: "1h 20min",
        },
      ],
      slots: [
        ["09:00", "10:15", "12:00", "14:00", "16:15", "18:00"],
        ["09:30", "11:00", "13:30", "15:00", "17:30"],
        ["10:00", "11:30", "14:00", "16:30"],
        ["09:00", "10:30", "13:00", "15:30"],
      ],
    },
    odontologia: {
      name: "Odonto Smile & Estética",
      initials: "OS",
      category: "Odontologia & estética",
      rating: "4,9",
      reviews: "112",
      email: "atendimento@odontosmile.com.br",
      phone: "(11) 97831-5520",
      address: ["Alameda Santos, 1400 - Cerqueira César", "São Paulo - SP"],
      hours: "Seg - Sex: 08:00 - 19:00",
      description:
        "Clínica odontológica com foco em prevenção, saúde bucal e tratamentos estéticos em um ambiente confortável.",
      response: "Até 2 horas",
      services: [
        {
          icon: "✦",
          name: "Avaliação odontológica",
          description:
            "Consulta inicial com avaliação e plano de cuidados personalizado.",
          price: 80,
          duration: "40 min",
        },
        {
          icon: "＋",
          name: "Limpeza & prevenção",
          description:
            "Profilaxia e orientações para manter a saúde bucal em dia.",
          price: 160,
          duration: "50 min",
        },
        {
          icon: "✓",
          name: "Clareamento dental",
          description:
            "Avaliação e sessão de clareamento acompanhada pelo profissional.",
          price: 280,
          duration: "1h 30min",
        },
      ],
      slots: [
        ["08:30", "10:00", "11:30", "14:00", "16:00"],
        ["09:00", "10:30", "13:30", "15:00", "17:00"],
        ["08:30", "11:00", "14:30", "16:30"],
        ["09:30", "11:30", "14:00", "17:00"],
      ],
    },
    fisioterapia: {
      name: "Movimento Fisioterapia",
      initials: "MF",
      category: "Fisioterapia & reabilitação",
      rating: "5,0",
      reviews: "42",
      email: "agenda@movimentofisio.com.br",
      phone: "(11) 95146-3028",
      address: ["Rua Cardeal Arcoverde, 1530 - Pinheiros", "São Paulo - SP"],
      hours: "Seg - Sex: 07:00 - 20:00",
      description:
        "Atendimento fisioterapêutico individual para reabilitação, mobilidade e prevenção, com sessões agendadas.",
      response: "Até 2 horas",
      services: [
        {
          icon: "＋",
          name: "Avaliação fisioterapêutica",
          description:
            "Avaliação funcional e definição dos objetivos do tratamento.",
          price: 150,
          duration: "1h",
        },
        {
          icon: "✳",
          name: "Fisioterapia individual",
          description:
            "Sessão orientada conforme as necessidades de mobilidade e reabilitação.",
          price: 130,
          duration: "50 min",
        },
        {
          icon: "✓",
          name: "Liberação miofascial",
          description:
            "Técnicas manuais para mobilidade e cuidado de tensões musculares.",
          price: 170,
          duration: "1h",
        },
      ],
      slots: [
        ["07:30", "09:00", "11:00", "14:00", "16:00"],
        ["08:00", "10:00", "13:00", "15:30", "18:00"],
        ["07:00", "09:30", "14:30", "17:00"],
        ["08:30", "11:30", "15:00", "18:30"],
      ],
    },
    nutricao: {
      name: "Nutri Essencial Consultório",
      initials: "NE",
      category: "Nutrição & saúde alimentar",
      rating: "4,9",
      reviews: "39",
      email: "consulta@nutriessencial.com.br",
      phone: "(11) 96274-1085",
      address: ["Av. Rebouças, 1105 - Pinheiros", "São Paulo - SP"],
      hours: "Seg - Sex: 08:00 - 18:00",
      description:
        "Consultas nutricionais individualizadas para criar hábitos possíveis e um plano alimentar adequado à sua rotina.",
      response: "Até 3 horas",
      services: [
        {
          icon: "＋",
          name: "Consulta nutricional",
          description:
            "Entrevista, avaliação de hábitos e definição dos primeiros objetivos.",
          price: 190,
          duration: "1h",
        },
        {
          icon: "✦",
          name: "Retorno nutricional",
          description:
            "Acompanhamento do plano alimentar e ajustes para sua rotina.",
          price: 130,
          duration: "45 min",
        },
        {
          icon: "✓",
          name: "Avaliação de composição corporal",
          description:
            "Avaliação corporal com orientações individuais de acompanhamento.",
          price: 90,
          duration: "30 min",
        },
      ],
      slots: [
        ["08:00", "09:30", "11:00", "14:00", "16:00"],
        ["08:30", "10:00", "13:30", "15:30"],
        ["09:00", "11:30", "14:30", "17:00"],
        ["08:00", "10:30", "13:00", "16:30"],
      ],
    },
    drenagem: {
      name: "Lótus Terapias Corporais",
      initials: "LT",
      category: "Massagem & terapias corporais",
      rating: "4,9",
      reviews: "61",
      email: "reservas@lotusterapias.com.br",
      phone: "(11) 94730-6251",
      address: ["Rua Harmonia, 560 - Vila Madalena", "São Paulo - SP"],
      hours: "Todos os dias: 09:00 - 20:00",
      description:
        "Espaço dedicado a terapias corporais e relaxamento, com sessões individuais reservadas para cada cliente.",
      response: "Imediato (Online)",
      services: [
        {
          icon: "✳",
          name: "Drenagem linfática",
          description:
            "Sessão de drenagem manual com atendimento corporal individual.",
          price: 150,
          duration: "60 min",
        },
        {
          icon: "✦",
          name: "Massagem desportiva",
          description:
            "Técnicas corporais para relaxamento muscular após atividades físicas.",
          price: 170,
          duration: "60 min",
        },
        {
          icon: "◉",
          name: "Reflexologia podal",
          description:
            "Terapia de relaxamento com estímulos em pontos dos pés.",
          price: 110,
          duration: "45 min",
        },
      ],
      slots: [
        ["09:00", "10:30", "13:00", "14:30", "16:00"],
        ["09:30", "11:00", "13:30", "15:30", "17:00"],
        ["10:00", "11:30", "14:00", "16:30"],
        ["09:00", "12:00", "14:30", "17:00"],
      ],
    },
  };

  function makeText(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }

  function renderProfile() {
    if (!document.body.classList.contains("services-body")) return;

    const requestedProfile = new URLSearchParams(window.location.search).get(
      "servico"
    );
    const profile = profiles[requestedProfile] || profiles.cabelo;
    const keys = Object.keys(profiles);
    const profileKey = keys.find(function (key) {
      return profiles[key] === profile;
    });
    const serviceContent = document.querySelector(".service-content");
    const bookingPanel = document.querySelector(".service-booking-panel");
    const serviceSummary = document.querySelector(".service-summary");
    const stepTwo = document.querySelector(".step-two");
    const confirmation = document.querySelector(".confirmation-box");
    const disclaimer = document.querySelector(".disclaimer");
    serviceContent.appendChild(serviceSummary);
    bookingPanel.append(stepTwo, confirmation, disclaimer);

    document.title = "Agendly — " + profile.name;
    document.body.dataset.serviceProfile = profileKey;
    document.querySelector(".summary-logo").textContent = profile.initials;
    document.querySelector(".summary-card h1").textContent = profile.name;
    document.querySelector(".summary-meta span:first-child").textContent =
      profile.category;
    document.querySelector(".summary-meta .stars").textContent =
      "★ " + profile.rating;
    document.querySelector(".summary-meta span:last-child").textContent =
      "(" + profile.reviews + ")";

    const contactRows = document.querySelectorAll(".summary-contact .contact-row");
    contactRows[0].lastElementChild.textContent = profile.email;
    contactRows[1].lastElementChild.textContent = profile.phone;
    const address = contactRows[2].lastElementChild;
    address.replaceChildren(
      document.createTextNode(profile.address[0]),
      document.createElement("br"),
      document.createTextNode(profile.address[1])
    );
    contactRows[3].lastElementChild.replaceChildren(
      document.createTextNode("Horário de funcionamento"),
      document.createElement("br"),
      makeText("strong", "", profile.hours)
    );
    const bookingPhone = document.querySelector("#service-profile-phone");
    bookingPhone.textContent = profile.phone;
    bookingPhone.href = "tel:" + profile.phone.replace(/\D/g, "");
    const bookingEmail = document.querySelector("#service-profile-email");
    bookingEmail.textContent = profile.email;
    bookingEmail.href = "mailto:" + profile.email;
    document.querySelector(".summary-description").textContent =
      profile.description;
    document.querySelector(".response-pill strong").textContent =
      profile.response;

    const optionsContainer = document.querySelector(".step-one");
    const optionsTitle = optionsContainer.querySelector(".step-title h3");
    optionsTitle.textContent = "Selecione o Serviço Desejado";
    const serviceList = document.createElement("div");
    serviceList.className = "profile-service-list";
    const count = makeText(
      "span",
      "option-count profile-service-count",
      profile.services.length + " opções disponíveis"
    );
    const title = optionsContainer.querySelector(".step-title");
    title.appendChild(count);

    profile.services.forEach(function (service, index) {
      const option = document.createElement("div");
      option.className = "service-option" + (index === 0 ? " option-selected" : "");
      option.setAttribute("role", "group");
      option.setAttribute("aria-label", service.name);

      const icon = makeText("div", "option-icon", service.icon);
      const main = document.createElement("div");
      main.className = "option-main";
      main.append(
        makeText("h4", "", service.name),
        makeText("p", "", service.description)
      );
      const priceRow = document.createElement("div");
      priceRow.className = "option-price-row";
      priceRow.append(
        makeText("span", "price", formatPrice(service.price)),
        makeText("span", "duration", "• " + service.duration)
      );
      main.appendChild(priceRow);
      const selectButton = makeText(
        "button",
        "select-btn" + (index === 0 ? " selected" : ""),
        index === 0 ? "Selecionado" : "Selecionar"
      );
      selectButton.type = "button";
      selectButton.setAttribute("aria-pressed", String(index === 0));
      option.append(icon, main, selectButton);
      serviceList.appendChild(option);
    });
    optionsContainer.querySelectorAll(".service-option").forEach(function (option) {
      option.remove();
    });
    optionsContainer.appendChild(serviceList);

    const dayGrid = document.querySelector(".date-grid");
    dayGrid.replaceChildren();
    const today = new Date();
    const dateOptions = [];
    profile.slots.forEach(function (slots, index) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
      const card = document.createElement("div");
      card.className = "date-card" + (index === 0 ? " selected" : "");
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", String(index === 0));
      card.tabIndex = 0;
      card.append(
        makeText("span", "day-label", getDayLabel(index, date)),
        makeText(
          "strong",
          "",
          new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "short",
          })
            .format(date)
            .replace(".", "")
        ),
        makeText("span", "day-vacancies", slots.length + " vagas")
      );
      dayGrid.appendChild(card);
      dateOptions.push(card);
    });

    const timeGrid = document.querySelector(".time-grid");
    const timeLabel = document.querySelector(".time-label");
    const summaryTitle = document.querySelector(".confirmation-text h4");
    const summaryTotal = document.querySelector(".confirmation-text small");
    let selectedService = profile.services[0];
    let selectedDateIndex = 0;
    let selectedTime = profile.slots[0][0];

    function updateSummary() {
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + selectedDateIndex
      );
      const dateText =
        selectedDateIndex === 0
          ? "Hoje"
          : selectedDateIndex === 1
            ? "Amanhã"
            : new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
      summaryTitle.textContent =
        selectedService.name +
        " • " +
        dateText +
        " " +
        formatShortDate(date) +
        " às " +
        selectedTime;
      summaryTotal.textContent =
        "Total: " + formatPrice(selectedService.price) + " (pagamento no local ou online)";
      document.querySelector("#booking-confirmation-status").textContent = "";
      timeLabel.textContent =
        "HORÁRIOS LIVRES PARA " +
        dateText.toLocaleUpperCase("pt-BR") +
        " (" +
        formatShortDate(date) +
        "):";
    }

    function renderTimes() {
      const times = profile.slots[selectedDateIndex];
      selectedTime = times[0];
      timeGrid.replaceChildren();
      times.forEach(function (time, index) {
        const button = makeText(
          "button",
          "time-slot" + (index === 0 ? " selected" : ""),
          time
        );
        button.type = "button";
        button.setAttribute("aria-pressed", String(index === 0));
        button.addEventListener("click", function () {
          timeGrid.querySelectorAll(".time-slot").forEach(function (slot) {
            const active = slot === button;
            slot.classList.toggle("selected", active);
            slot.setAttribute("aria-pressed", String(active));
          });
          selectedTime = time;
          updateSummary();
        });
        timeGrid.appendChild(button);
      });
      updateSummary();
    }

    profile.services.forEach(function (service, index) {
      const option = serviceList.children[index];
      function selectService() {
        selectedService = service;
        serviceList.querySelectorAll(".service-option").forEach(function (item) {
          const active = item === option;
          item.classList.toggle("option-selected", active);
          const button = item.querySelector(".select-btn");
          button.classList.toggle("selected", active);
          button.textContent = active ? "Selecionado" : "Selecionar";
          button.setAttribute("aria-pressed", String(active));
        });
        updateSummary();
      }
      option.addEventListener("click", selectService);
    });

    dateOptions.forEach(function (option, index) {
      function selectDate() {
        selectedDateIndex = index;
        dateOptions.forEach(function (card) {
          const active = card === option;
          card.classList.toggle("selected", active);
          card.setAttribute("aria-pressed", String(active));
        });
        renderTimes();
      }
      option.addEventListener("click", selectDate);
      option.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectDate();
        }
      });
    });

    renderTimes();

    document
      .querySelector("#service-confirm")
      .addEventListener("click", function () {
        const date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + selectedDateIndex
        );
        const dateText =
          selectedDateIndex === 0
            ? "hoje"
            : selectedDateIndex === 1
              ? "amanhã"
              : new Intl.DateTimeFormat("pt-BR", {
                  weekday: "long",
                }).format(date);
        document.querySelector("#booking-confirmation-status").textContent =
          "Prévia de agendamento: " +
          selectedService.name +
          " • " +
          dateText +
          " " +
          formatShortDate(date) +
          " às " +
          selectedTime +
          " • " +
          formatPrice(selectedService.price) +
          ". Esta demonstração não registra uma reserva.";
      });
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  }

  function getDayLabel(index, date) {
    if (index === 0) return "HOJE";
    if (index === 1) return "AMANHÃ";
    return new Intl.DateTimeFormat("pt-BR", { weekday: "long" })
      .format(date)
      .toLocaleUpperCase("pt-BR");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderProfile, { once: true });
  } else {
    renderProfile();
  }
})();
