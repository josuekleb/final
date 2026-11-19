const SESSION_COOKIE = "agendly_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach(function (byte) {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, function (character) {
    return character.charCodeAt(0);
  });
}

async function getSigningKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Configure SESSION_SECRET with at least 32 characters.");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionCookie(user, request, secret) {
  const csrfBytes = crypto.getRandomValues(new Uint8Array(32));
  const csrf = Array.from(csrfBytes, function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
  const payload = {
    sub: Number(user.id),
    role: user.tipo,
    csrf: csrf,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getSigningKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded))
  );
  const token = encoded + "." + bytesToBase64Url(signature);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    csrf: csrf,
    header:
      SESSION_COOKIE +
      "=" +
      token +
      "; Path=/; Max-Age=" +
      SESSION_TTL_SECONDS +
      "; HttpOnly; SameSite=Lax" +
      secure,
  };
}

export async function readSession(request, secret) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map(function (part) { return part.trim(); })
    .find(function (part) { return part.startsWith(SESSION_COOKIE + "="); });
  if (!cookie) return null;

  const token = cookie.slice(SESSION_COOKIE.length + 1);
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const key = await getSigningKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!valid) return null;

    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    if (
      !Number.isSafeInteger(session.sub) ||
      session.sub < 1 ||
      !["cliente", "loja"].includes(session.role) ||
      typeof session.csrf !== "string" ||
      session.csrf.length !== 64 ||
      !Number.isInteger(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return session;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Configure SESSION_SECRET")) {
      throw error;
    }
    return null;
  }
}

export function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return SESSION_COOKIE + "=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" + secure;
}

export function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
