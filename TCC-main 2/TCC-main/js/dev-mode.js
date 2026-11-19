/**
 * Modo de desenvolvimento local do Agendly.
 * Para desativar, defina DEV_MODE_ENABLED como false ou remova as inclusoes
 * deste arquivo das paginas HTML. Nunca use este recurso como autenticacao real.
 */
(function () {
  "use strict";

  const DEV_MODE_ENABLED = true;
  const DEV_SESSION_KEY = "agendly_dev_mode";
  const scriptUrl = document.currentScript && document.currentScript.src;

  function isLocalEnvironment() {
    const hostname = window.location.hostname.toLowerCase();
    return (
      window.location.protocol === "file:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  }

  if (!DEV_MODE_ENABLED || !isLocalEnvironment() || !scriptUrl) {
    return;
  }

  const projectRoot = new URL("../", scriptUrl);
  const clientHomeUrl = new URL("cliente/indexcliente.html", projectRoot);
  const clientLoginUrl = new URL("cliente/logincliente.html", projectRoot);
  const isClientLoginPage =
    window.location.pathname === clientLoginUrl.pathname;

  function isDevModeActive() {
    return window.sessionStorage.getItem(DEV_SESSION_KEY) === "1";
  }

  function setDevMode(active) {
    if (active) {
      window.sessionStorage.setItem(DEV_SESSION_KEY, "1");
    } else {
      window.sessionStorage.removeItem(DEV_SESSION_KEY);
    }
  }

  let devModeActive;
  try {
    devModeActive = isDevModeActive();
  } catch (error) {
    console.error("Não foi possível verificar o modo de desenvolvimento:", error);
    return;
  }

  if (devModeActive && isClientLoginPage) {
    window.location.replace(clientHomeUrl.href);
    return;
  }

  const style = document.createElement("style");
  style.textContent =
    ".agendly-dev-mode{position:fixed;right:16px;top:16px;z-index:10000;" +
    "display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);" +
    "padding:10px 12px;border:1px solid #f59e0b;border-radius:12px;" +
    "background:#fffbeb;color:#78350f;font:600 12px/1.4 system-ui,sans-serif;" +
    "box-shadow:0 4px 16px #0f172a24}.agendly-dev-mode button{" +
    "border:0;border-radius:8px;padding:8px 10px;background:#1e7af6;" +
    "color:white;font:600 12px system-ui,sans-serif;cursor:pointer}" +
    ".agendly-dev-mode button:focus-visible{outline:3px solid #10203a;" +
    "outline-offset:2px}@media(max-width:480px){.agendly-dev-mode{" +
    "right:8px;top:8px;left:8px;justify-content:space-between;" +
    "max-width:none;gap:6px;padding:8px}}";
  document.head.appendChild(style);

  const toolbar = document.createElement("aside");
  toolbar.className = "agendly-dev-mode";
  toolbar.setAttribute("aria-label", "Alternar modo de desenvolvimento");

  const status = document.createElement("span");
  status.textContent = devModeActive
    ? "Desenvolvimento local ativo"
    : "Ambiente local";
  toolbar.appendChild(status);

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.textContent = devModeActive
    ? "Voltar ao modo cliente"
    : "Entrar como desenvolvedor";
  toggleButton.addEventListener("click", function () {
    try {
      setDevMode(!devModeActive);
      window.location.href = devModeActive
        ? clientLoginUrl.href
        : clientHomeUrl.href;
    } catch (error) {
      console.error("Não foi possível alternar o modo de desenvolvimento:", error);
      window.alert(
        "Não foi possível alternar o modo. Verifique se o armazenamento da sessão está habilitado."
      );
    }
  });
  toolbar.appendChild(toggleButton);
  document.body.appendChild(toolbar);
})();
