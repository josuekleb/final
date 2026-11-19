(function () {
  "use strict";

  function value(card, selector) {
    return card.querySelector(selector)?.textContent.trim() || "-";
  }

  function professionalValue(card) {
    return value(card, ".profession, .appt-professional").replace(/^Profissional:\s*/i, "");
  }

  function localDateValue(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function getDialog() {
    let dialog = document.querySelector("#appointment-action-dialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "appointment-action-dialog";
    dialog.className = "appointment-action-dialog";
    dialog.innerHTML =
      '<form method="dialog" class="appointment-action-panel">' +
      '<button class="appointment-action-close" value="cancel" aria-label="Fechar">×</button>' +
      '<h2></h2><div class="appointment-action-content"></div>' +
      '<p class="appointment-action-status" role="status" aria-live="polite"></p>' +
      '<div class="appointment-action-buttons"><button class="appointment-action-secondary" value="cancel">Fechar</button>' +
      '<button class="appointment-action-submit" type="submit" value="default" hidden>Confirmar</button></div>' +
      '</form>';
    document.body.appendChild(dialog);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelector("form").addEventListener("submit", submitReschedule);
    return dialog;
  }

  function openDialog(title, content, allowSubmit) {
    const dialog = getDialog();
    dialog.querySelector("h2").textContent = title;
    dialog.querySelector(".appointment-action-content").replaceChildren(content);
    dialog.querySelector(".appointment-action-status").textContent = "";
    dialog.querySelector(".appointment-action-submit").hidden = !allowSubmit;
    dialog.dataset.appointmentId = "";
    dialog.showModal();
    return dialog;
  }

  function showDetails(card) {
    const content = document.createElement("dl");
    content.className = "appointment-receipt-details";
    [
      ["Serviço", value(card, ".service-line, h4, h2")],
      ["Estabelecimento", value(card, ".appt-content > p:not(.appt-professional), .notification-shop-name")],
      ["Profissional", professionalValue(card)],
      ["Data e horário", value(card, ".agenda-time-box .time, .appt-meta, .notification-details-row")],
      ["Cliente", value(card, ".client-name, .notification-client")],
      ["Valor", value(card, ".price, .appt-price, .notification-details-row")],
      ["Status", value(card, ".status-tag, .tag, .label-pill")],
    ].forEach(function (item) {
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = item[0];
      detail.textContent = item[1];
      content.append(term, detail);
    });
    openDialog("Detalhes do agendamento", content, false);
  }

  function downloadReceipt(card) {
    const lines = [
      "AGENDLY - COMPROVANTE DE AGENDAMENTO",
      "Serviço: " + value(card, ".service-line, h4, h2"),
      "Estabelecimento: " + value(card, ".appt-content > p:not(.appt-professional), .notification-shop-name"),
      "Profissional: " + professionalValue(card),
      "Data e horário: " + value(card, ".agenda-time-box .time, .appt-meta"),
      "Cliente: " + value(card, ".client-name, .notification-client"),
      "Valor: " + value(card, ".price, .appt-price, .notification-details-row"),
      "Status: " + value(card, ".status-tag, .tag, .label-pill"),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "agendly-comprovante.txt";
    link.click();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function openReschedule(card) {
    if (!card.dataset.appointmentId) return;
    const fields = document.createElement("div");
    fields.className = "appointment-reschedule-fields";
    const dateLabel = document.createElement("label");
    const date = document.createElement("input");
    date.type = "date";
    date.required = true;
    date.min = localDateValue(new Date());
    dateLabel.append("Nova data", date);
    const timeLabel = document.createElement("label");
    const time = document.createElement("select");
    time.dataset.rescheduleTime = "true";
    time.required = true;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione uma data primeiro";
    placeholder.disabled = true;
    placeholder.selected = true;
    time.appendChild(placeholder);
    timeLabel.append("Novo horário", time);
    fields.append(dateLabel, timeLabel);
    const dialog = openDialog("Remarcar agendamento", fields, true);
    dialog.dataset.appointmentId = card.dataset.appointmentId;
    dialog.dataset.businessId = card.dataset.businessId || "";
    dialog.dataset.serviceName = card.dataset.serviceName || "";
    dialog.dataset.professionalName = card.dataset.professionalName || "";
    let requestNumber = 0;
    async function updateSlots() {
      const currentRequest = ++requestNumber;
      time.replaceChildren();
      const option = document.createElement("option");
      option.value = "";
      option.disabled = true;
      option.selected = true;
      option.textContent = "Consultando horários...";
      time.appendChild(option);
      if (!date.value || !dialog.dataset.businessId || !dialog.dataset.serviceName) {
        option.textContent = "Não foi possível carregar a disponibilidade deste agendamento.";
        return;
      }
      if (!window.AgendlyApi || !window.AgendlyApi.enabled) {
        option.textContent = "Conecte-se ao servidor para consultar horários disponíveis.";
        return;
      }
      try {
        const result = await window.AgendlyApi.request("availability", "GET", undefined, {
          business: dialog.dataset.businessId,
          service: dialog.dataset.serviceName,
          professional: dialog.dataset.professionalName,
          from: date.value,
          days: "1",
          exclude: dialog.dataset.appointmentId,
        });
        if (currentRequest !== requestNumber) return;
        const day = Array.isArray(result.days) ? result.days[0] : null;
        if (!day || day.date !== date.value || !Array.isArray(day.slots) || day.slots.some(function (slot) { return !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot); })) {
          throw new Error("Não foi possível consultar os horários.");
        }
        time.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = day.slots.length ? "Selecione um horário" : "Sem horários disponíveis";
        time.appendChild(placeholder);
        day.slots.forEach(function (slot) {
          const slotOption = document.createElement("option");
          slotOption.value = slot;
          slotOption.textContent = slot;
          time.appendChild(slotOption);
        });
        dialog.querySelector(".appointment-action-status").textContent = "";
      } catch (error) {
        if (currentRequest !== requestNumber) return;
        option.textContent = "Disponibilidade indisponível";
        dialog.querySelector(".appointment-action-status").textContent = error.message;
      }
    }
    date.addEventListener("change", updateSlots);
    if (!window.AgendlyApi || !window.AgendlyApi.enabled) {
      dialog.querySelector(".appointment-action-status").textContent =
        "Conecte-se ao servidor para consultar horários disponíveis.";
    }
    date.focus();
  }

  async function post(action, payload) {
    if (!window.AgendlyApi || !window.AgendlyApi.enabled) throw new Error("Conecte-se ao servidor para alterar agendamentos.");
    if (!sessionStorage.getItem("agendly_csrf")) await window.AgendlyApi.request("me", "GET");
    return window.AgendlyApi.request(action, "POST", payload);
  }

  async function submitReschedule(event) {
    const dialog = event.currentTarget.closest("dialog");
    if (!dialog.dataset.appointmentId) return;
    event.preventDefault();
    const date = dialog.querySelector('input[type="date"]');
    const time = dialog.querySelector("[data-reschedule-time]");
    const status = dialog.querySelector(".appointment-action-status");
    const submit = dialog.querySelector(".appointment-action-submit");
    if (!date.value || !time.value) {
      status.textContent = "Informe a nova data e o horário.";
      return;
    }
    submit.disabled = true;
    try {
      await post("appointment-reschedule", {
        id: dialog.dataset.appointmentId,
        date: date.value,
        time: time.value,
      });
      dialog.close();
      window.location.reload();
    } catch (error) {
      status.textContent = error.message;
      submit.disabled = false;
    }
  }

  document.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-appointment-action]");
    if (!button) return;
    const card = button.closest("[data-appointment-id]");
    if (!card) return;
    event.preventDefault();

    const action = button.dataset.appointmentAction;
    if (action === "details") return showDetails(card);
    if (action === "receipt") return downloadReceipt(card);
    if (action === "reschedule") return openReschedule(card);
    if (action === "complete") {
      button.disabled = true;
      try {
        await post("appointment-status", { id: card.dataset.appointmentId, status: "concluido" });
        window.location.reload();
      } catch (error) {
        button.disabled = false;
        const status = document.createElement("p");
        status.className = "appointment-action-error";
        status.setAttribute("role", "status");
        status.textContent = error.message;
        card.appendChild(status);
      }
      return;
    }
    if (action === "rebook") {
      const businessId = card.dataset.businessId;
      if (!businessId) return;
      const url = new URL("loja-online.html", window.location.href);
      url.searchParams.set("business", businessId);
      if (card.dataset.serviceName) url.searchParams.set("service", card.dataset.serviceName);
      window.location.href = url.href;
      return;
    }
    if (action !== "cancel") return;
    if (!window.confirm("Deseja cancelar este agendamento?")) return;

    button.disabled = true;
    try {
      await post("appointment-status", {
        id: card.dataset.appointmentId,
        status: "cancelado",
      });
      window.location.reload();
    } catch (error) {
      button.disabled = false;
      const status = document.createElement("p");
      status.className = "appointment-action-error";
      status.setAttribute("role", "status");
      status.textContent = error.message;
      card.appendChild(status);
    }
  });
})();
