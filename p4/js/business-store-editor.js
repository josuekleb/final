(function () {
  "use strict";

  const storefront = window.AgendlyStorefront;
  const blockList = document.querySelector("#store-block-list");
  if (!storefront || !blockList) return;

  const scriptUrl = document.currentScript.src;
  const owner = storefront.getOwner();
  const editDialog = document.querySelector("#store-edit-dialog");
  const editForm = document.querySelector("#store-edit-form");
  const editTitle = document.querySelector("#store-edit-title");
  const editFields = document.querySelector("#store-edit-fields");
  const deleteBlockButton = document.querySelector("#delete-store-block");
  const previewDialog = document.querySelector("#store-preview-dialog");
  const previewFrame = document.querySelector("#store-preview-frame");
  let state;
  let savedState;
  let editorMode = "";
  let editingBlockId = "";

  function showToast(message) {
    if (window.showAgendlyAlert) {
      window.showAgendlyAlert(message, "info");
      return;
    }
    let toast = document.querySelector(".p4-toast");
    if (!toast) {
      toast = createElement("div", "p4-toast");
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 2600);
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeField(container, labelText, name, value, type, options) {
    const settings = options || {};
    const label = createElement("label", "store-form-field");
    label.appendChild(createElement("span", "", labelText));
    const input =
      type === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");
    if (type !== "textarea") input.type = type || "text";
    input.name = name;
    input.value = value === undefined || value === null ? "" : String(value);
    if (settings.placeholder) input.placeholder = settings.placeholder;
    if (settings.required) input.required = true;
    if (settings.min !== undefined) input.min = String(settings.min);
    if (settings.step !== undefined) input.step = String(settings.step);
    if (settings.maxLength) input.maxLength = settings.maxLength;
    label.appendChild(input);
    container.appendChild(label);
    return input;
  }

  function makeToggle(container, labelText, name, checked) {
    const label = createElement("label", "store-form-toggle");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = Boolean(checked);
    label.append(input, createElement("span", "", labelText));
    container.appendChild(label);
    return input;
  }

  function storeProfile() {
    const profile = state.profile;
    document.querySelector("#store-name").textContent = profile.name;
    document.querySelector("#store-tagline").textContent = profile.tagline;
    document.querySelector("#store-category").textContent = profile.category;

    const avatar = document.querySelector("#store-avatar");
    avatar.replaceChildren();
    if (profile.avatar) {
      const image = createElement("img");
      image.src = profile.avatar;
      image.alt = "";
      avatar.appendChild(image);
    } else {
      avatar.textContent = "✂";
    }

    const banner = document.querySelector("#store-banner-image");
    banner.hidden = !profile.banner;
    banner.src = profile.banner || "";
  }

  function getBlockSummary(block) {
    if (block.type === "services") {
      const active = block.items.filter(function (item) {
        return item.active;
      }).length;
      return active + " serviço(s) ativo(s) de " + block.items.length;
    }
    if (block.type === "questions") {
      return block.items.length + " pergunta(s) para conhecer melhor o cliente";
    }
    if (block.type === "team") {
      const active = (block.items || []).filter(function (item) {
        return item.active;
      }).length;
      return active + " profissional(is) ativo(s) de " + block.items.length;
    }
    return block.description || "Adicione uma descrição para seus clientes.";
  }

  function renderBlocks() {
    const fragment = document.createDocumentFragment();
    const activeCount = state.blocks.filter(function (block) {
      return block.active;
    }).length;
    document.querySelector("#store-block-count").textContent =
      state.blocks.length +
      " blocos · " +
      activeCount +
      " visíveis para clientes";

    state.blocks.forEach(function (block, index) {
      const card = createElement(
        "article",
        "store-block" + (block.active ? "" : " is-hidden")
      );
      card.dataset.blockId = block.id;
      const left = createElement("div", "block-left");
      left.appendChild(
        createElement("span", "block-handle", storefront.blockIcons[block.type] || "☰")
      );
      const content = createElement("div", "block-content");
      const titleRow = createElement("div", "block-title-row");
      titleRow.appendChild(createElement("h3", "", block.title));
      titleRow.appendChild(
        createElement(
          "span",
          "store-block-type",
          storefront.blockLabels[block.type] || "Conteúdo"
        )
      );
      titleRow.appendChild(
        createElement(
          "span",
          "store-block-status" + (block.active ? " is-active" : ""),
          block.active ? "Visível" : "Oculto"
        )
      );
      content.append(titleRow, createElement("p", "", getBlockSummary(block)));

      const actions = createElement("div", "block-actions");
      const editButton = createElement("button", "ghost-icon", "✎ Editar");
      editButton.type = "button";
      editButton.dataset.action = "edit";
      editButton.setAttribute("aria-label", "Editar " + block.title);
      actions.appendChild(editButton);

      const visibilityButton = createElement(
        "button",
        "store-visibility-toggle",
        block.active ? "Ocultar" : "Mostrar"
      );
      visibilityButton.type = "button";
      visibilityButton.dataset.action = "toggle";
      visibilityButton.setAttribute("aria-pressed", String(block.active));
      actions.appendChild(visibilityButton);

      const moveUp = createElement("button", "store-order-btn", "↑");
      moveUp.type = "button";
      moveUp.dataset.action = "up";
      moveUp.disabled = index === 0;
      moveUp.setAttribute("aria-label", "Mover bloco para cima");
      actions.appendChild(moveUp);
      const moveDown = createElement("button", "store-order-btn", "↓");
      moveDown.type = "button";
      moveDown.dataset.action = "down";
      moveDown.disabled = index === state.blocks.length - 1;
      moveDown.setAttribute("aria-label", "Mover bloco para baixo");
      actions.appendChild(moveDown);

      card.append(left, content, actions);
      fragment.appendChild(card);
    });

    blockList.replaceChildren(fragment);
  }

  function render() {
    storeProfile();
    renderBlocks();
  }

  async function persistDraft(message) {
    try {
      if (window.AgendlyApi && window.AgendlyApi.enabled) {
        await window.AgendlyApi.request("store-save", "POST", { store: state, publish: false });
      }
      storefront.saveDraft(owner, state);
      savedState = storefront.clone(state);
      if (message) showToast(message);
      return true;
    } catch (error) {
      console.error("Não foi possível salvar o rascunho da loja.", error);
      showToast(
        error.name === "QuotaExceededError"
          ? "O armazenamento está cheio. Use imagens menores e tente novamente."
          : error.message || "Não foi possível salvar as alterações."
      );
      return false;
    }
  }

  function appendRepeatRow(container, item, type) {
    const row = createElement("fieldset", "store-repeat-row");
    row.dataset.itemId = item.id || "";
    row.dataset.itemType = type;
    const legend = createElement(
      "legend",
      "",
      type === "service"
        ? "Serviço"
        : type === "professional"
          ? "Profissional"
          : "Pergunta"
    );
    row.appendChild(legend);
    const removeButton = createElement("button", "store-remove-item", "Remover");
    removeButton.type = "button";
    removeButton.dataset.action = "remove-item";
    removeButton.setAttribute("aria-label", "Remover item");
    row.appendChild(removeButton);

    if (type === "service") {
      makeField(row, "Nome do serviço", "name", item.name, "text", {
        required: true,
        maxLength: 80,
      });
      makeField(row, "Descrição", "description", item.description, "textarea", {
        maxLength: 240,
      });
      const details = createElement("div", "store-form-grid");
      makeField(details, "Preço (R$)", "price", item.price, "number", {
        required: true,
        min: 0,
        step: "0.01",
      });
      makeField(details, "Duração (min)", "duration", item.duration, "number", {
        required: true,
        min: 1,
        step: 1,
      });
      row.appendChild(details);
      makeToggle(row, "Serviço ativo para agendamento", "active", item.active);
    } else if (type === "question") {
      makeField(row, "Pergunta", "question", item.question, "text", {
        required: true,
        maxLength: 160,
      });
      makeField(row, "Texto de ajuda (opcional)", "answer", item.answer, "textarea", {
        maxLength: 240,
      });
      makeToggle(row, "Resposta obrigatória", "required", item.required);
    } else {
      makeField(row, "Nome do profissional", "name", item.name, "text", {
        required: true,
        maxLength: 120,
      });
      makeField(row, "Especialidade (opcional)", "specialty", item.specialty, "text", {
        maxLength: 100,
      });
      makeToggle(row, "Profissional disponível para agendamento", "active", item.active);
    }
    container.appendChild(row);
  }

  function appendRepeatEditor(container, block, type) {
    const heading =
      type === "service"
        ? "Serviços cadastrados"
        : type === "professional"
          ? "Profissionais cadastrados"
          : "Perguntas cadastradas";
    container.appendChild(createElement("h3", "store-form-subtitle", heading));
    const rows = createElement("div", "store-repeat-list");
    (block.items || []).forEach(function (item) {
      appendRepeatRow(rows, item, type);
    });
    container.appendChild(rows);
    const addButton = createElement(
      "button",
      "store-add-item",
      type === "service"
        ? "+ Adicionar serviço"
        : type === "professional"
          ? "+ Adicionar profissional"
          : "+ Adicionar pergunta"
    );
    addButton.type = "button";
    addButton.dataset.action = "add-item";
    addButton.dataset.itemType = type;
    container.appendChild(addButton);
  }

  function appendHoursEditor(container, block) {
    const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const schedule = block.schedule && typeof block.schedule === "object" ? block.schedule : {};
    const days = schedule.days && typeof schedule.days === "object" ? schedule.days : {};
    container.appendChild(createElement("p", "store-form-note", "Todos os profissionais usam este expediente. Os horários são oferecidos em intervalos de 30 minutos; cadastre também os dias de fechamento."));
    weekdayNames.forEach(function (weekday, dayIndex) {
      const value = days[String(dayIndex)] || {};
      const row = createElement("fieldset", "store-repeat-row store-hours-day");
      row.dataset.day = String(dayIndex);
      row.appendChild(createElement("legend", "", weekday));
      const closed = makeToggle(row, "Fechado neste dia", "closed", value.closed !== false);
      const times = createElement("div", "store-form-grid");
      const open = makeField(times, "Abre", "open", value.open || "", "time");
      const close = makeField(times, "Fecha", "close", value.close || "", "time");
      const breakStart = makeField(times, "Início do intervalo (opcional)", "breakStart", value.breakStart || "", "time");
      const breakEnd = makeField(times, "Fim do intervalo (opcional)", "breakEnd", value.breakEnd || "", "time");
      function syncDayFields() {
        [open, close, breakStart, breakEnd].forEach(function (field) {
          field.disabled = closed.checked;
        });
        open.required = !closed.checked;
        close.required = !closed.checked;
      }
      closed.addEventListener("change", syncDayFields);
      syncDayFields();
      row.appendChild(times);
      container.appendChild(row);
    });

    container.appendChild(createElement("h3", "store-form-subtitle", "Datas de fechamento"));
    const closures = createElement("div", "store-hours-closures");
    function appendClosure(closure) {
      closure = closure && typeof closure === "object" ? closure : {};
      const row = createElement("fieldset", "store-repeat-row store-hours-closure");
      const date = makeField(row, "Data", "date", closure.date || "", "date", { required: true });
      makeField(row, "Motivo (opcional)", "label", closure.label || "", "text", { maxLength: 80 });
      const remove = createElement("button", "store-remove-item", "Remover data");
      remove.type = "button";
      remove.addEventListener("click", function () { row.remove(); });
      row.appendChild(remove);
      closures.appendChild(row);
      return date;
    }
    (Array.isArray(schedule.closures) ? schedule.closures : []).forEach(appendClosure);
    container.appendChild(closures);
    const addClosure = createElement("button", "store-add-item", "+ Adicionar fechamento");
    addClosure.type = "button";
    addClosure.addEventListener("click", function () {
      appendClosure({ date: "", label: "" }).focus();
    });
    container.appendChild(addClosure);
  }

  function readHoursSchedule() {
    const days = {};
    const toMinutes = function (value) {
      const parts = value.split(":").map(Number);
      return parts[0] * 60 + parts[1];
    };
    editFields.querySelectorAll(".store-hours-day").forEach(function (row) {
      const field = function (name) {
        return row.querySelector('[name="' + name + '"]').value;
      };
      const closed = row.querySelector('[name="closed"]').checked;
      const breakStart = closed ? "" : field("breakStart");
      const breakEnd = closed ? "" : field("breakEnd");
      if (Boolean(breakStart) !== Boolean(breakEnd)) {
        throw new Error("Preencha os dois horários do intervalo ou deixe ambos vazios.");
      }
      if (!closed) {
        const open = toMinutes(field("open"));
        const close = toMinutes(field("close"));
        if (open >= close) throw new Error("O fechamento precisa ser posterior à abertura.");
        if (breakStart) {
          const start = toMinutes(breakStart);
          const end = toMinutes(breakEnd);
          if (start < open || end > close || start >= end) {
            throw new Error("O intervalo precisa estar dentro do expediente.");
          }
        }
      }
      days[row.dataset.day] = closed
        ? { closed: true }
        : {
            closed: false,
            open: field("open"),
            close: field("close"),
            breakStart: breakStart,
            breakEnd: breakEnd,
          };
    });
    const closures = Array.from(editFields.querySelectorAll(".store-hours-closure")).map(function (row) {
      return {
        date: row.querySelector('[name="date"]').value,
        label: row.querySelector('[name="label"]').value.trim(),
      };
    });
    const closureDates = closures.map(function (closure) { return closure.date; });
    if (new Set(closureDates).size !== closureDates.length) {
      throw new Error("Cada data de fechamento deve aparecer apenas uma vez.");
    }
    return { days: days, closures: closures };
  }

  function openBlockEditor(block) {
    editorMode = "block";
    editingBlockId = block.id;
    editTitle.textContent = "Editar " + (storefront.blockLabels[block.type] || "bloco");
    editFields.replaceChildren();
    deleteBlockButton.hidden = false;
    makeField(editFields, "Título exibido", "title", block.title, "text", {
      required: true,
      maxLength: 80,
    });

    if (block.type === "services") {
      appendRepeatEditor(editFields, block, "service");
    } else if (block.type === "questions") {
      appendRepeatEditor(editFields, block, "question");
    } else if (block.type === "team") {
      appendRepeatEditor(editFields, block, "professional");
    } else if (block.type === "hours") {
      makeField(editFields, "Resumo dos horários", "description", block.description, "textarea", {
        maxLength: 500,
      });
      appendHoursEditor(editFields, block);
    } else {
      makeField(
        editFields,
        block.type === "hours"
          ? "Dias e horários"
          : block.type === "payment"
            ? "Formas de pagamento"
            : "Descrição para seus clientes",
        "description",
        block.description,
        "textarea",
        { maxLength: 500, required: block.type !== "text" }
      );
    }
    makeToggle(editFields, "Mostrar este bloco na página dos clientes", "active", block.active);
    editDialog.showModal();
  }

  function openProfileEditor() {
    editorMode = "profile";
    editingBlockId = "";
    editTitle.textContent = "Dados públicos do negócio";
    editFields.replaceChildren();
    deleteBlockButton.hidden = true;
    makeField(editFields, "Nome do negócio", "name", state.profile.name, "text", {
      required: true,
      maxLength: 80,
    });
    makeField(editFields, "Categoria", "category", state.profile.category, "text", {
      required: true,
      maxLength: 80,
    });
    makeField(editFields, "Frase de apresentação", "tagline", state.profile.tagline, "text", {
      maxLength: 140,
    });
    makeField(editFields, "Cidade / região", "location", state.profile.location, "text", {
      maxLength: 100,
    });
    makeField(editFields, "Telefone", "phone", state.profile.phone, "tel", {
      maxLength: 40,
    });
    makeField(editFields, "E-mail público", "email", state.profile.email, "email", {
      maxLength: 100,
    });
    editDialog.showModal();
  }

  function readRepeatRows(type) {
    return Array.from(
      editFields.querySelectorAll('.store-repeat-row[data-item-type="' + type + '"]')
    ).map(function (row) {
      const get = function (name) {
        const field = row.querySelector('[name="' + name + '"]');
        return field ? field.value.trim() : "";
      };
      const itemId =
        row.dataset.itemId ||
        "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      if (type === "service") {
        return {
          id: itemId,
          name: get("name"),
          description: get("description"),
          price: Number(get("price")),
          duration: Number(get("duration")),
          active: row.querySelector('[name="active"]').checked,
        };
      }
      if (type === "question") {
        return {
          id: itemId,
          question: get("question"),
          answer: get("answer"),
          required: row.querySelector('[name="required"]').checked,
        };
      }
      return {
        id: itemId,
        name: get("name"),
        specialty: get("specialty"),
        active: row.querySelector('[name="active"]').checked,
      };
    });
  }

  function submitEditor(event) {
    event.preventDefault();
    if (!editForm.reportValidity()) return;

    if (editorMode === "profile") {
      ["name", "category", "tagline", "location", "phone", "email"].forEach(
        function (field) {
          const input = editFields.querySelector('[name="' + field + '"]');
          state.profile[field] = input.value.trim();
        }
      );
    } else if (editorMode === "new-block") {
      const type = editFields.querySelector('[name="type"]').value;
      state.blocks.push(storefront.createNewBlock(type));
    } else {
      const block = state.blocks.find(function (item) {
        return item.id === editingBlockId;
      });
      if (!block) return;
      block.title = editFields.querySelector('[name="title"]').value.trim();
      block.active = editFields.querySelector('[name="active"]').checked;
      if (block.type === "services") {
        block.items = readRepeatRows("service");
      } else if (block.type === "questions") {
        block.items = readRepeatRows("question");
      } else if (block.type === "team") {
        block.items = readRepeatRows("professional");
      } else if (block.type === "hours") {
        try {
          block.schedule = readHoursSchedule();
        } catch (error) {
          showToast(error.message);
          return;
        }
        block.description = editFields.querySelector('[name="description"]').value.trim();
      } else {
        block.description = editFields
          .querySelector('[name="description"]')
          .value.trim();
      }
    }

    editDialog.close();
    render();
  }

  function openNewBlockEditor() {
    editorMode = "new-block";
    editingBlockId = "";
    editTitle.textContent = "Adicionar bloco";
    editFields.replaceChildren();
    deleteBlockButton.hidden = true;
    const label = createElement("label", "store-form-field");
    label.appendChild(createElement("span", "", "Tipo de conteúdo"));
    const select = document.createElement("select");
    select.name = "type";
    Object.keys(storefront.blockLabels).forEach(function (type) {
      if (type === "hours" && state.blocks.some(function (block) { return block.type === "hours"; })) return;
      const option = createElement("option", "", storefront.blockLabels[type]);
      option.value = type;
      select.appendChild(option);
    });
    label.appendChild(select);
    editFields.appendChild(label);
    editFields.appendChild(
      createElement(
        "p",
        "store-form-note",
        "Depois de adicionar, você poderá editar o conteúdo e decidir se ele ficará visível."
      )
    );
    editDialog.showModal();
  }

  function moveBlock(blockId, offset) {
    const index = state.blocks.findIndex(function (block) {
      return block.id === blockId;
    });
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= state.blocks.length) return;
    const moved = state.blocks.splice(index, 1)[0];
    state.blocks.splice(nextIndex, 0, moved);
    renderBlocks();
  }

  function handleBlockAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".store-block");
    const block = state.blocks.find(function (item) {
      return item.id === card.dataset.blockId;
    });
    if (!block) return;

    if (button.dataset.action === "edit") openBlockEditor(block);
    if (button.dataset.action === "toggle") {
      block.active = !block.active;
      renderBlocks();
    }
    if (button.dataset.action === "up") moveBlock(block.id, -1);
    if (button.dataset.action === "down") moveBlock(block.id, 1);
  }

  function handleRepeatAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "remove-item") {
      button.closest(".store-repeat-row").remove();
      return;
    }
    if (button.dataset.action !== "add-item") return;
    const type = button.dataset.itemType;
    appendRepeatRow(
      editFields.querySelector(".store-repeat-list"),
      type === "service"
        ? {
            id: "",
            name: "",
            description: "",
            price: "",
            duration: 30,
            active: true,
          }
        : type === "professional"
          ? { id: "", name: "", specialty: "", active: true }
          : { id: "", question: "", answer: "", required: false },
      type
    );
  }

  function optimizeImage(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      return Promise.reject(new Error("Escolha um arquivo de imagem."));
    }
    if (file.size > 8 * 1024 * 1024) {
      return Promise.reject(new Error("A imagem deve ter no máximo 8 MB."));
    }
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () {
        reject(new Error("Não foi possível ler essa imagem."));
      };
      reader.onload = function () {
        const image = new Image();
        image.onerror = function () {
          reject(new Error("A imagem selecionada não é válida."));
        };
        image.onload = function () {
          const maxSide = 1400;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Não foi possível preparar essa imagem."));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function bindImageInput(inputId, profileField) {
    const input = document.querySelector(inputId);
    input.addEventListener("change", async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        state.profile[profileField] = await optimizeImage(file);
        render();
        showToast("Imagem carregada. Salve o rascunho para manter a alteração.");
      } catch (error) {
        console.error("Não foi possível carregar a imagem.", error);
        showToast(error.message || "Não foi possível carregar essa imagem.");
      } finally {
        input.value = "";
      }
    });
  }

  async function openPreview() {
    if (!(await persistDraft("Rascunho salvo para a pré-visualização."))) return;
    const previewUrl = new URL("../cliente/loja-online.html", scriptUrl);
    previewUrl.searchParams.set("business", owner);
    previewUrl.searchParams.set("preview", "draft");
    previewFrame.src = previewUrl.href;
    previewDialog.showModal();
  }

  function bind() {
    blockList.addEventListener("click", handleBlockAction);
    editFields.addEventListener("click", handleRepeatAction);
    editForm.addEventListener("submit", submitEditor);
    document.querySelector("#edit-store-profile").addEventListener("click", openProfileEditor);
    document.querySelector("#add-store-block").addEventListener("click", openNewBlockEditor);
    document.querySelector("#save-store-draft").addEventListener("click", function () {
      persistDraft("Rascunho salvo.");
    });
    document.querySelector("#discard-store-changes").addEventListener("click", function () {
      state = storefront.clone(savedState);
      render();
      showToast("Alterações não salvas descartadas.");
    });
    document.querySelector("#publish-store").addEventListener("click", async function () {
      try {
        if (window.AgendlyApi && window.AgendlyApi.enabled) {
          await window.AgendlyApi.request("store-save", "POST", { store: state, publish: true });
        }
        storefront.publish(owner, state);
        savedState = storefront.clone(state);
        showToast("Loja publicada para os clientes.");
      } catch (error) {
        console.error("Não foi possível publicar a loja.", error);
        showToast(
          error.name === "QuotaExceededError"
            ? "O armazenamento está cheio. Use imagens menores e tente novamente."
            : error.message || "Não foi possível publicar a loja."
        );
      }
    });
    document.querySelector("#preview-store").addEventListener("click", openPreview);
    document.querySelector("#close-store-preview").addEventListener("click", function () {
      previewDialog.close();
    });
    previewDialog.addEventListener("close", function () {
      previewFrame.src = "about:blank";
    });
    document.querySelectorAll("[data-close-editor]").forEach(function (button) {
      button.addEventListener("click", function () {
        editDialog.close();
      });
    });
    editDialog.addEventListener("click", function (event) {
      if (event.target === editDialog) editDialog.close();
    });
    previewDialog.addEventListener("click", function (event) {
      if (event.target === previewDialog) previewDialog.close();
    });
    deleteBlockButton.addEventListener("click", function () {
      state.blocks = state.blocks.filter(function (block) {
        return block.id !== editingBlockId;
      });
      editDialog.close();
      render();
    });
    document.querySelector(".banner-button").addEventListener("click", function () {
      document.querySelector("#store-banner-input").click();
    });
    document.querySelector("#change-store-avatar").addEventListener("click", function () {
      document.querySelector("#store-avatar-input").click();
    });
    bindImageInput("#store-banner-input", "banner");
    bindImageInput("#store-avatar-input", "avatar");
  }

  async function startEditor() {
    try {
      if (window.AgendlyApi && window.AgendlyApi.enabled) {
        const result = await window.AgendlyApi.request("store", "GET", undefined, { business: owner, draft: "1" });
        state = result.store.store;
      } else {
        state = storefront.load(owner, "draft");
      }
      savedState = storefront.clone(state);
      render();
      bind();
    } catch (error) {
      console.error("Não foi possível carregar a loja.", error);
      showToast(error.message || "Não foi possível carregar os dados da loja.");
    }
  }
  startEditor();
})();
