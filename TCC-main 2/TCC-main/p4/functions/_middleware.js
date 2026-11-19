import { clearSessionCookie, readSession } from "./_auth.js";

const PUBLIC_PAGES = new Set([
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
]);

function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

function responsePage(message, status) {
  return new Response(message, {
    status: status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

function decodedPath(request) {
  try {
    return decodeURIComponent(new URL(request.url).pathname).replace(/\\/g, "/");
  } catch (error) {
    return null;
  }
}

function isPrivateFile(path) {
  const lower = path.toLowerCase();
  return (
    lower.startsWith("/functions/") ||
    lower.startsWith("/migrations/") ||
    lower.split("/").some(function (part) {
      return part === ".git" || part === ".github" || part === "node_modules";
    }) ||
    /(?:^|\/)\.htaccess$/.test(lower) ||
    /\.(?:php|sql|txt|md|env|ini|log|bak|conf|toml)$/i.test(lower)
  );
}

function redirectTo(path, request, cookie) {
  const response = Response.redirect(new URL(path, request.url), 302);
  const headers = new Headers(response.headers);
  if (cookie) headers.append("Set-Cookie", cookie);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const path = decodedPath(request);
  if (!path || isPrivateFile(path)) return responsePage("Not found.", 404);
  if (path === "/api" || path.startsWith("/api/")) {
    return securityHeaders(await context.next());
  }

  const relativePath = path.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase() || "index.html";
  if (PUBLIC_PAGES.has(relativePath)) return securityHeaders(await context.next());
  if (!env.DB) return responsePage("Service temporarily unavailable.", 503);
  if (typeof env.SESSION_SECRET !== "string" || env.SESSION_SECRET.length < 32) {
    console.error("Configure SESSION_SECRET with at least 32 characters.");
    return responsePage("Authentication is not configured for this deployment.", 503);
  }

  const preview = relativePath === "cliente/loja-online.html" &&
    new URL(request.url).searchParams.get("preview") === "draft";
  try {
    const session = await readSession(request, env.SESSION_SECRET || "");
    if (!session) {
      const login = relativePath.startsWith("loja/")
        ? "/loja/loginloja.html"
        : "/cliente/logincliente.html";
      return redirectTo(login, request, clearSessionCookie(request));
    }

    const account = await env.DB
      .prepare("SELECT tipo FROM usuarios WHERE id=? AND ativo=1")
      .bind(session.sub)
      .first();
    if (!account || account.tipo !== session.role) {
      return redirectTo(
        relativePath.startsWith("loja/") ? "/loja/loginloja.html" : "/cliente/logincliente.html",
        request,
        clearSessionCookie(request)
      );
    }

    if (preview) return securityHeaders(await context.next());
    if (relativePath === "index.html" && account.tipo === "loja") {
      return redirectTo("/loja/indexloja.html", request);
    }
    const isBusinessPage = relativePath.startsWith("loja/");
    if (isBusinessPage && account.tipo !== "loja") {
      return redirectTo("/loja/loginloja.html", request);
    }
    if (!isBusinessPage && account.tipo !== "cliente") {
      return redirectTo("/cliente/logincliente.html", request);
    }
    return securityHeaders(await context.next());
  } catch (error) {
    console.error("Agendly Pages access guard:", error);
    return responsePage("Service temporarily unavailable.", 503);
  }
}
