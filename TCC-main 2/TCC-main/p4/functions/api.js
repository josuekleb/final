import {
  clearSessionCookie,
  constantTimeEqual,
  createSessionCookie,
  readSession,
} from "./_auth.js";

const PUBLIC_ACTIONS = new Set([
  "login",
  "register",
  "request-reset",
  "reset-password",
]);
const RATE_LIMITS = {
  login: [10, 900],
  register: [5, 3600],
  "request-reset": [5, 900],
  "reset-password": [8, 900],
};
const MAX_BODY_BYTES = 2_000_000;
const MAX_STORE_BYTES = 1_800_000;
const DEFAULT_PROFESSIONAL = "Equipe do estabelecimento";
const DUMMY_PASSWORD_HASH =
  "pbkdf2$250000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fail(status, message) {
  throw new ApiError(status, message);
}

function jsonResponse(data, status, extraHeaders) {
  const headers = new Headers(extraHeaders || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(value) {
  return value.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function validDocument(document, type) {
  if (type === "cliente") {
    if (document.length !== 11 || /^(\d)\1{10}$/.test(document)) return false;
    for (let turn = 9; turn < 11; turn += 1) {
      let sum = 0;
      for (let index = 0; index < turn; index += 1) {
        sum += Number(document[index]) * (turn + 1 - index);
      }
      let digit = (sum * 10) % 11;
      if (digit === 10) digit = 0;
      if (digit !== Number(document[turn])) return false;
    }
    return true;
  }

  if (type !== "loja" || document.length !== 14 || /^(\d)\1{13}$/.test(document)) {
    return false;
  }
  const weights = [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ];
  for (let turn = 12; turn < 14; turn += 1) {
    let sum = 0;
    weights[turn - 12].forEach(function (weight, index) {
      sum += Number(document[index]) * weight;
    });
    const remainder = sum % 11;
    const digit = remainder < 2 ? 0 : 11 - remainder;
    if (digit !== Number(document[turn])) return false;
  }
  return true;
}

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach(function (byte) {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), function (character) {
    return character.charCodeAt(0);
  });
}

async function digestHex(value) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  );
  return Array.from(digest, function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

async function hashPassword(password) {
  const iterations = 250000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
      material,
      256
    )
  );
  return [
    "pbkdf2",
    String(iterations),
    toBase64Url(salt),
    toBase64Url(derived),
  ].join("$");
}

async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 500000) {
    return false;
  }

  let salt;
  let expected;
  try {
    salt = fromBase64Url(parts[2]);
    expected = toBase64Url(fromBase64Url(parts[3]));
  } catch (error) {
    return false;
  }
  if (salt.length !== 16 || expected.length !== parts[3].length) return false;

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const actual = toBase64Url(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
        material,
        256
      )
    )
  );
  return constantTimeEqual(actual, expected);
}

async function activeUser(db, session) {
  if (!session) fail(401, "Entre na sua conta para continuar.");
  const user = await db
    .prepare("SELECT id, tipo, nome, email, telefone, bio FROM usuarios WHERE id=? AND ativo=1")
    .bind(session.sub)
    .first();
  if (!user || user.tipo !== session.role) {
    fail(401, "Sua conta não está mais ativa. Entre novamente.");
  }
  return user;
}

function requireMethod(request, expected) {
  if (request.method !== expected) fail(405, "Método não permitido.");
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) fail(413, "A solicitação excede o tamanho permitido.");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    fail(413, "A solicitação excede o tamanho permitido.");
  }
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch (error) {
    fail(400, "O conteúdo enviado não é um JSON válido.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    fail(400, "O conteúdo enviado é inválido.");
  }
  return body;
}

async function requireCsrf(request, session) {
  const supplied = request.headers.get("X-CSRF-Token") || "";
  if (!session || !constantTimeEqual(supplied, session.csrf)) {
    fail(403, "Sessão expirada. Atualize a página e tente novamente.");
  }
}

async function rateLimit(db, request, secret, action) {
  const config = RATE_LIMITS[action];
  if (!config) return;
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const clientHash = await hmacHex(secret, address);
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = config[1];
  await db.prepare(
    `INSERT INTO api_rate_limits(action, client_hash, window_started_at, attempts)
     VALUES(?, ?, ?, 1)
     ON CONFLICT(action, client_hash) DO UPDATE SET
       attempts=CASE
         WHEN api_rate_limits.window_started_at <= excluded.window_started_at - ? THEN 1
         ELSE MIN(api_rate_limits.attempts + 1, 65535)
       END,
       window_started_at=CASE
         WHEN api_rate_limits.window_started_at <= excluded.window_started_at - ?
         THEN excluded.window_started_at
         ELSE api_rate_limits.window_started_at
       END`
  ).bind(action, clientHash, now, windowSeconds, windowSeconds).run();
  const row = await db
    .prepare("SELECT attempts FROM api_rate_limits WHERE action=? AND client_hash=?")
    .bind(action, clientHash)
    .first();
  await db.prepare("DELETE FROM api_rate_limits WHERE window_started_at < ?").bind(now - 86400).run();
  if (Number(row && row.attempts) > config[0]) {
    fail(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  }
}

async function hmacHex(secret, value) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Configure SESSION_SECRET with at least 32 characters.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  );
  return Array.from(signature, function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

function validStoreImage(value) {
  return typeof value === "string" &&
    new TextEncoder().encode(value).length <= 1_700_000 &&
    (value === "" || /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
}

function parseScheduleTime(value) {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isValidIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || month < 1 || month > 12) return false;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= maxDay;
}

function businessHoursForDate(store, date) {
  if (!isValidIsoDate(date)) return null;
  const blocks = Array.isArray(store.blocks) ? store.blocks : [];
  const hoursBlock = blocks.find(function (block) {
    return block && block.type === "hours" && block.active;
  });
  if (!hoursBlock || !hoursBlock.schedule || typeof hoursBlock.schedule !== "object") return null;

  const closures = Array.isArray(hoursBlock.schedule.closures)
    ? hoursBlock.schedule.closures
    : [];
  if (closures.some(function (closure) {
    return closure && typeof closure === "object" && closure.date === date;
  })) return null;

  const weekday = String(new Date(date + "T12:00:00-03:00").getUTCDay());
  const days = hoursBlock.schedule.days;
  const day = days && typeof days === "object" ? days[weekday] : null;
  if (!day || day.closed) return null;

  const open = parseScheduleTime(day.open);
  const close = parseScheduleTime(day.close);
  const breakStart = day.breakStart ? parseScheduleTime(day.breakStart) : null;
  const breakEnd = day.breakEnd ? parseScheduleTime(day.breakEnd) : null;
  if (open === null || close === null || open >= close) return null;
  if ((day.breakStart && breakStart === null) || (day.breakEnd && breakEnd === null)) return null;
  if ((breakStart === null) !== (breakEnd === null)) return null;
  if (breakStart !== null && (breakStart < open || breakEnd > close || breakStart >= breakEnd)) {
    return null;
  }
  return { open: open, close: close, breakStart: breakStart, breakEnd: breakEnd };
}

function validOperatingSlot(store, date, startTime, endTime) {
  const hours = businessHoursForDate(store, date);
  const start = parseScheduleTime(startTime);
  const end = parseScheduleTime(endTime);
  if (!hours || start === null || end === null || start < hours.open || end > hours.close || start >= end) {
    return false;
  }
  if ((start - hours.open) % 30 !== 0) return false;
  return hours.breakStart === null || start >= hours.breakEnd || end <= hours.breakStart;
}

function validFutureSlot(date, time) {
  if (!isValidIsoDate(date) || parseScheduleTime(time) === null) return false;
  return localDateTimeToEpoch(date, time) > Date.now();
}

function localDateTimeToEpoch(date, time) {
  return new Date(date + "T" + time + ":00-03:00").getTime();
}

function dateTimeParts(epoch) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epoch));
  const values = {};
  parts.forEach(function (part) {
    if (part.type !== "literal") values[part.type] = part.value;
  });
  return values;
}

function localDateTimeToDatabase(epoch) {
  const parts = dateTimeParts(epoch);
  return parts.year + "-" + parts.month + "-" + parts.day + " " +
    parts.hour + ":" + parts.minute + ":" + parts.second;
}

function databaseDateTimeToEpoch(value) {
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return NaN;
  return localDateTimeToEpoch(match[1], match[2]);
}

function localTimeFromEpoch(epoch) {
  const parts = dateTimeParts(epoch);
  return parts.hour + ":" + parts.minute;
}

function getActiveServices(store) {
  const blocks = Array.isArray(store.blocks) ? store.blocks : [];
  return blocks
    .filter(function (block) { return block && block.type === "services" && block.active; })
    .flatMap(function (block) {
      return Array.isArray(block.items) ? block.items.filter(function (item) { return item && item.active; }) : [];
    });
}

function getActiveProfessionals(store) {
  const unique = new Map();
  const blocks = Array.isArray(store.blocks) ? store.blocks : [];
  blocks.filter(function (block) {
    return block && block.type === "team" && block.active;
  }).forEach(function (block) {
    (Array.isArray(block.items) ? block.items : []).forEach(function (item) {
      const name = String(item && item.name || "").trim().slice(0, 160);
      if (item && item.active && name) unique.set(normalizeText(name), name);
    });
  });
  return Array.from(unique.values());
}

function resolveProfessional(store, requested) {
  const available = getActiveProfessionals(store);
  if (!available.length) {
    if (requested && normalizeText(requested) !== normalizeText(DEFAULT_PROFESSIONAL)) {
      fail(422, "Profissional indisponível. Atualize a página e tente novamente.");
    }
    return DEFAULT_PROFESSIONAL;
  }
  const selected = available.find(function (name) {
    return normalizeText(name) === normalizeText(requested);
  });
  if (!selected) fail(422, "Escolha um profissional ativo para este estabelecimento.");
  return selected;
}

function findActiveService(store, requestedName) {
  const name = normalizeText(requestedName);
  return getActiveServices(store).find(function (service) {
    return normalizeText(service.name) === name;
  }) || null;
}

function publicStore(row) {
  const store = parseStore(row.vitrine_json);
  if (store.profile && typeof store.profile === "object") {
    ["avatar", "banner"].forEach(function (field) {
      if (!validStoreImage(store.profile[field] || "")) store.profile[field] = "";
    });
    if (normalizeEmail(store.profile.email) === normalizeEmail(row.email)) {
      store.profile.email = "";
    }
  }
  const profile = store.profile || {};
  return {
    id: Number(row.id),
    name: row.nome || profile.name || "",
    category: row.categoria || profile.category || "",
    description: row.descricao || profile.tagline || "",
    address: row.endereco || profile.location || "",
    phone: row.telefone || profile.phone || "",
    published: Boolean(row.publicado),
    store: store,
  };
}

async function getBusiness(db, key, currentUserId, allowUnpublished) {
  const businessKey = String(key || "").trim();
  const byId = /^\d+$/.test(businessKey) && Number(businessKey) > 0;
  const business = await db.prepare(
    `SELECT n.*, u.email, u.ativo, u.id AS account_id
     FROM negocios n JOIN usuarios u ON u.id=n.usuario_id
     WHERE (n.id=? OR lower(u.email)=?)
       AND (n.publicado=1 OR u.id=?)
       AND u.ativo=1`
  ).bind(byId ? Number(businessKey) : 0, byId ? "" : normalizeEmail(businessKey), currentUserId || 0).first();
  if (!business) fail(404, "Estabelecimento indisponível.");
  if (!allowUnpublished && !Number(business.publicado)) {
    fail(404, "Esta loja ainda não foi publicada.");
  }
  return business;
}

async function writeRateLimitedEmail(env, to, subject, text) {
  if (!env.RESEND_API_KEY || !env.AGENDLY_MAIL_FROM) {
    console.error("Configure RESEND_API_KEY and AGENDLY_MAIL_FROM to send recovery messages.");
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.AGENDLY_MAIL_FROM,
      to: [to],
      subject: subject,
      text: text,
    }),
  });
  if (!response.ok) {
    console.error("Agendly recovery email could not be delivered:", response.status);
  }
}

async function insertAppointment(db, details) {
  const serviceName = String(details.serviceName).slice(0, 120);
  const duration = Math.max(5, Math.min(720, Math.trunc(details.duration || 30)));
  const price = Math.max(0, Number(details.price) || 0);
  const endEpoch = details.startEpoch + duration * 60_000;
  const start = localDateTimeToDatabase(details.startEpoch);
  const end = localDateTimeToDatabase(endEpoch);

  const upsertService = db.prepare(
    `INSERT INTO servicos(negocio_id, nome, preco, duracao_minutos)
     VALUES(?, ?, ?, ?)
     ON CONFLICT(negocio_id, nome) DO UPDATE SET
       preco=excluded.preco,
       duracao_minutos=excluded.duracao_minutos,
       ativo=1`
  ).bind(details.businessId, serviceName, price, duration);

  const insertBooking = db.prepare(
    `INSERT INTO agendamentos(
       cliente_id, cliente_nome, cliente_telefone, negocio_id, servico_id,
       servico_nome, profissional_nome, preco_final, inicio, fim, status, observacoes
     )
     SELECT ?, ?, ?, ?, s.id, ?, ?, ?, ?, ?, 'confirmado', ?
     FROM servicos s
     WHERE s.negocio_id=? AND s.nome=?
       AND NOT EXISTS (
         SELECT 1 FROM agendamentos a
         WHERE a.negocio_id=? AND a.status IN ('pendente', 'confirmado')
           AND a.inicio < ? AND a.fim > ?
           AND (?='Equipe do estabelecimento'
             OR a.profissional_nome=?
             OR a.profissional_nome='Equipe do estabelecimento')
       )
     RETURNING id`
  ).bind(
    details.clientId || null,
    details.clientName || null,
    details.clientPhone || null,
    details.businessId,
    serviceName,
    details.professional,
    price,
    start,
    end,
    details.notes || "",
    details.businessId,
    serviceName,
    details.businessId,
    end,
    start,
    details.professional,
    details.professional
  );

  const results = await db.batch([upsertService, insertBooking]);
  const inserted = results[1] && results[1].results && results[1].results[0];
  if (!inserted || !inserted.id) {
    fail(409, "Esse horário acabou de ser reservado. Escolha outro.");
  }
  return { id: Number(inserted.id), start: start, end: end, price: price, serviceName: serviceName };
}

async function handleAction(request, env) {
  if (!env.DB) fail(503, "O banco de dados não está vinculado a este projeto.");
  const secret = env.SESSION_SECRET || "";
  if (typeof secret !== "string" || secret.length < 32) {
    fail(503, "A sessão ainda não está configurada. Defina SESSION_SECRET na Vercel.");
  }
  const db = env.DB;
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  const publicAction = PUBLIC_ACTIONS.has(action);
  let session = await readSession(request, secret);
  let user = null;
  if (!publicAction) {
    user = await activeUser(db, session);
  }
  if (request.method === "POST" && !publicAction) {
    await requireCsrf(request, session);
  }
  await rateLimit(db, request, secret, action);
  const body = request.method === "POST" ? await readJsonBody(request) : {};

  switch (action) {
    case "me": {
      requireMethod(request, "GET");
      user = await activeUser(db, session);
      return jsonResponse({
        user: user,
        csrf: session.csrf,
      });
    }

    case "profile-save": {
      requireMethod(request, "POST");
      const name = String(body.nome || "").trim();
      const phone = onlyDigits(body.telefone);
      const bio = String(body.bio || "").trim();
      if (name.length < 2 || (phone && phone.length < 10)) {
        fail(422, "Confira o nome e o telefone.");
      }
      await db.prepare(
        "UPDATE usuarios SET nome=?, telefone=?, bio=?, atualizado_em=datetime('now') WHERE id=?"
      ).bind(name.slice(0, 160), phone || null, bio.slice(0, 2000), user.id).run();
      const updated = await db
        .prepare("SELECT id, tipo, nome, email, telefone, bio FROM usuarios WHERE id=?")
        .bind(user.id)
        .first();
      return jsonResponse({ user: updated });
    }

    case "request-reset": {
      requireMethod(request, "POST");
      const email = normalizeEmail(body.email);
      if (!isValidEmail(email)) fail(422, "Informe um e-mail válido.");
      const account = await db
        .prepare("SELECT id FROM usuarios WHERE email=? AND ativo=1")
        .bind(email)
        .first();
      if (account) {
        const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
        const token = Array.from(tokenBytes, function (byte) {
          return byte.toString(16).padStart(2, "0");
        }).join("");
        const tokenHash = await digestHex(token);
        const expiresAt = Math.floor(Date.now() / 1000) + 1800;
        await db.batch([
          db.prepare("DELETE FROM tokens_recuperacao WHERE usuario_id=?").bind(account.id),
          db.prepare(
            "INSERT INTO tokens_recuperacao(usuario_id, token_hash, expira_em) VALUES(?, ?, ?)"
          ).bind(account.id, tokenHash, expiresAt),
        ]);
        const resetUrl = new URL("redefinirsenha.html", url.origin + "/").href;
        const link = resetUrl + "?token=" + encodeURIComponent(token);
        await writeRateLimitedEmail(
          env,
          email,
          "Agendly - redefinição de senha",
          "Olá,\n\nUse o link abaixo para criar uma nova senha. Ele expira em 30 minutos.\n" +
            link +
            "\n\nSe não solicitou a alteração, ignore este e-mail."
        );
      }
      return jsonResponse({
        message: "Se o endereço estiver cadastrado e o envio de e-mail estiver configurado, você receberá um link válido por 30 minutos.",
      });
    }

    case "reset-password": {
      requireMethod(request, "POST");
      const token = String(body.token || "");
      const password = String(body.senha || "");
      const passwordBytes = new TextEncoder().encode(password).length;
      if (!/^[a-f0-9]{64}$/i.test(token) || passwordBytes < 8 || passwordBytes > 72) {
        fail(422, "Link ou senha inválidos. Use uma senha com pelo menos 8 caracteres.");
      }
      const tokenHash = await digestHex(token);
      const now = Math.floor(Date.now() / 1000);
      const validToken = await db.prepare(
        "SELECT usuario_id FROM tokens_recuperacao WHERE token_hash=? AND expira_em>?"
      ).bind(tokenHash, now).first();
      if (!validToken) fail(400, "Este link expirou ou já foi usado. Solicite outro.");
      const passwordHash = await hashPassword(password);
      const results = await db.batch([
        db.prepare(
          `UPDATE usuarios SET senha_hash=?, atualizado_em=datetime('now')
           WHERE id=(SELECT usuario_id FROM tokens_recuperacao WHERE token_hash=? AND expira_em>?)`
        ).bind(passwordHash, tokenHash, now),
        db.prepare(
          `DELETE FROM tokens_recuperacao
           WHERE usuario_id=(SELECT usuario_id FROM tokens_recuperacao WHERE token_hash=? AND expira_em>?)`
        ).bind(tokenHash, now),
      ]);
      if (!results[0] || Number(results[0].meta && results[0].meta.changes) !== 1) {
        fail(400, "Este link expirou ou já foi usado. Solicite outro.");
      }
      return jsonResponse({ ok: true });
    }

    case "register": {
      requireMethod(request, "POST");
      const type = String(body.tipo || "");
      const name = String(body.nome || "").trim();
      const email = normalizeEmail(body.email);
      const password = String(body.senha || "");
      const phone = onlyDigits(body.telefone);
      const document = onlyDigits(body.documento);
      const passwordBytes = new TextEncoder().encode(password).length;
      if (
        !["cliente", "loja"].includes(type) ||
        name.length < 2 ||
        name.length > 160 ||
        email.length > 190 ||
        !isValidEmail(email) ||
        passwordBytes < 8 ||
        passwordBytes > 72 ||
        phone.length < 10 ||
        phone.length > 11
      ) {
        fail(422, "Confira seus dados, informe um telefone válido e use uma senha com pelo menos 8 caracteres.");
      }
      if (!validDocument(document, type)) fail(422, "Documento inválido.");

      const passwordHash = await hashPassword(password);
      const store = {
        profile: {
          name: name,
          category: "Serviços",
          tagline: "",
          location: "",
          phone: phone,
          email: email,
          avatar: "",
          banner: "",
        },
        blocks: [],
      };
      const statements = [
        db.prepare(
          `INSERT INTO usuarios(tipo, nome, email, senha_hash, telefone, documento)
           VALUES(?, ?, ?, ?, ?, ?) RETURNING id`
        ).bind(type, name, email, passwordHash, phone, document),
      ];
      if (type === "loja") {
        const storeJson = JSON.stringify(store);
        statements.push(
          db.prepare(
            `INSERT INTO negocios(usuario_id, nome, telefone, vitrine_json, rascunho_json)
             SELECT id, ?, ?, ?, ? FROM usuarios WHERE email=?`
          ).bind(name, phone, storeJson, storeJson, email)
        );
      }
      const results = await db.batch(statements);
      if (!results[0] || !results[0].results || !results[0].results[0]) {
        throw new Error("A conta não foi criada no banco D1.");
      }
      return jsonResponse({ ok: true }, 201);
    }

    case "login": {
      requireMethod(request, "POST");
      const email = normalizeEmail(body.email);
      const password = String(body.senha || "");
      const passwordBytes = new TextEncoder().encode(password).length;
      const passwordWithinBounds = passwordBytes >= 8 && passwordBytes <= 72;
      const requestedType = String(body.tipo || "");
      const account = await db
        .prepare(
          "SELECT id, tipo, nome, email, senha_hash, ativo FROM usuarios WHERE email=? COLLATE NOCASE"
        )
        .bind(email)
        .first();
      const passwordMatches = await verifyPassword(
        passwordWithinBounds ? password : "",
        account && account.senha_hash || DUMMY_PASSWORD_HASH
      );
      if (
        !account ||
        !Number(account.ativo) ||
        (requestedType && requestedType !== account.tipo) ||
        !passwordWithinBounds ||
        !passwordMatches
      ) {
        fail(401, "E-mail ou senha inválidos.");
      }
      const newSession = await createSessionCookie(account, request, secret);
      return jsonResponse(
        {
          user: {
            id: Number(account.id),
            tipo: account.tipo,
            nome: account.nome,
            email: account.email,
          },
          csrf: newSession.csrf,
        },
        200,
        { "Set-Cookie": newSession.header }
      );
    }

    case "logout": {
      requireMethod(request, "POST");
      return jsonResponse({ ok: true }, 200, {
        "Set-Cookie": clearSessionCookie(request),
      });
    }

    case "businesses": {
      requireMethod(request, "GET");
      const result = await db.prepare(
        `SELECT n.*, u.email FROM negocios n
         JOIN usuarios u ON u.id=n.usuario_id
         WHERE n.publicado=1 AND u.ativo=1
         ORDER BY n.atualizado_em DESC`
      ).all();
      return jsonResponse({ businesses: (result.results || []).map(publicStore) });
    }

    case "store": {
      requireMethod(request, "GET");
      const key = url.searchParams.get("business") || user.email;
      const draft = url.searchParams.get("draft") === "1";
      const business = await getBusiness(db, key, user.id, draft);
      if (draft && Number(business.usuario_id) !== Number(user.id)) {
        fail(403, "Acesso negado.");
      }
      const result = Object.assign({}, business);
      if (draft) result.vitrine_json = business.rascunho_json;
      return jsonResponse({ store: publicStore(result) });
    }

    case "availability": {
      requireMethod(request, "GET");
      const key = url.searchParams.get("business") || user.email;
      const draft = url.searchParams.get("draft") === "1";
      const business = await getBusiness(db, key, user.id, draft);
      if (draft && (user.tipo !== "loja" || Number(business.usuario_id) !== Number(user.id))) {
        fail(404, "Estabelecimento indisponível.");
      }
      const storeJson = draft ? business.rascunho_json : business.vitrine_json;
      let store;
      try {
        store = JSON.parse(storeJson || "{}");
      } catch (error) {
        fail(422, "A vitrine deste estabelecimento está inválida.");
      }
      const service = findActiveService(store, url.searchParams.get("service"));
      if (!service) fail(422, "Esse serviço não está disponível.");
      const professional = resolveProfessional(store, url.searchParams.get("professional") || "");
      const from = url.searchParams.get("from") || todaySaoPaulo();
      const days = Math.max(1, Math.min(31, Number(url.searchParams.get("days")) || 14));
      if (!isValidIsoDate(from) || from < todaySaoPaulo()) {
        fail(422, "Período de disponibilidade inválido.");
      }
      const firstEpoch = localDateTimeToEpoch(from, "00:00");
      const lastDate = addDays(from, days);
      const afterLastEpoch = localDateTimeToEpoch(lastDate, "00:00");
      const excludeId = Math.max(0, Number(url.searchParams.get("exclude")) || 0);
      const appointmentQuery = db.prepare(
        `SELECT id, inicio, fim, profissional_nome FROM agendamentos
         WHERE negocio_id=? AND status IN ('pendente', 'confirmado')
           AND inicio<? AND fim>? AND (?=0 OR id<>?)`
      ).bind(
        business.id,
        localDateTimeToDatabase(afterLastEpoch),
        localDateTimeToDatabase(firstEpoch),
        excludeId,
        excludeId
      );
      const appointmentResult = await appointmentQuery.all();
      const appointments = appointmentResult.results || [];
      const duration = Math.max(5, Math.min(720, Math.trunc(Number(service.duration) || 30)));
      const now = Date.now();
      const resultDays = [];
      for (let offset = 0; offset < days; offset += 1) {
        const date = addDays(from, offset);
        const hours = businessHoursForDate(store, date);
        const slots = [];
        if (hours) {
          for (
            let minute = hours.open;
            minute + duration <= hours.close;
            minute += 30
          ) {
            const time = timeFromMinute(minute);
            const endTime = timeFromMinute(minute + duration);
            if (
              !validOperatingSlot(store, date, time, endTime) ||
              localDateTimeToEpoch(date, time) <= now
            ) {
              continue;
            }
            const startAt = localDateTimeToEpoch(date, time);
            const endAt = startAt + duration * 60_000;
            const conflict = appointments.some(function (appointment) {
              const otherProfessional = appointment.profissional_nome || DEFAULT_PROFESSIONAL;
              if (
                professional !== DEFAULT_PROFESSIONAL &&
                otherProfessional !== DEFAULT_PROFESSIONAL &&
                otherProfessional !== professional
              ) return false;
              return startAt < databaseDateTimeToEpoch(appointment.fim) &&
                endAt > databaseDateTimeToEpoch(appointment.inicio);
            });
            if (!conflict) slots.push(time);
          }
        }
        resultDays.push({ date: date, slots: slots });
      }
      return jsonResponse({ days: resultDays });
    }

    case "store-save": {
      requireMethod(request, "POST");
      if (user.tipo !== "loja") fail(403, "Somente uma conta de negócio pode editar a vitrine.");
      const store = body.store;
      if (!store || typeof store !== "object" || Array.isArray(store) ||
          !store.profile || typeof store.profile !== "object" || Array.isArray(store.profile) ||
          !Array.isArray(store.blocks)) {
        fail(422, "Conteúdo da vitrine inválido.");
      }
      const storeJson = JSON.stringify(store);
      if (new TextEncoder().encode(storeJson).length > MAX_STORE_BYTES) {
        fail(413, "Reduza o tamanho das imagens da vitrine.");
      }
      if (!validStoreImage(store.profile.avatar || "") || !validStoreImage(store.profile.banner || "")) {
        fail(422, "Use imagens JPEG enviadas pelo editor da vitrine.");
      }
      const profile = store.profile;
      const name = String(profile.name || "Meu negócio").trim().slice(0, 160);
      const category = String(profile.category || "Serviços").trim().slice(0, 100);
      const description = String(profile.tagline || "").trim().slice(0, 500);
      const address = String(profile.location || "").trim().slice(0, 255);
      const phone = onlyDigits(profile.phone) || null;
      if (body.publish) {
        await db.prepare(
          `UPDATE negocios SET nome=?, categoria=?, descricao=?, endereco=?, telefone=?,
             rascunho_json=?, vitrine_json=?, publicado=1, atualizado_em=datetime('now')
           WHERE usuario_id=?`
        ).bind(name, category, description, address, phone, storeJson, storeJson, user.id).run();
      } else {
        await db.prepare(
          "UPDATE negocios SET rascunho_json=?, atualizado_em=datetime('now') WHERE usuario_id=?"
        ).bind(storeJson, user.id).run();
      }
      return jsonResponse({ ok: true });
    }

    case "appointments": {
      requireMethod(request, "GET");
      if (user.tipo === "cliente") {
        const result = await db.prepare(
          `SELECT a.id, a.inicio, a.fim, a.status, a.profissional_nome,
             n.id AS business_id, n.nome AS negocio,
             COALESCE(a.servico_nome, s.nome) AS servico,
             COALESCE(a.preco_final, s.preco) AS preco
           FROM agendamentos a
           JOIN negocios n ON n.id=a.negocio_id
           JOIN servicos s ON s.id=a.servico_id
           WHERE a.cliente_id=?
           ORDER BY a.inicio DESC`
        ).bind(user.id).all();
        return jsonResponse({ appointments: result.results || [] });
      }
      const result = await db.prepare(
        `SELECT a.id, a.inicio, a.fim, a.status, a.profissional_nome, n.nome AS negocio,
           COALESCE(a.servico_nome, s.nome) AS servico,
           COALESCE(a.preco_final, s.preco) AS preco,
           COALESCE(c.nome, a.cliente_nome) AS cliente,
           COALESCE(c.email, a.cliente_email) AS email,
           COALESCE(c.telefone, a.cliente_telefone) AS telefone
         FROM agendamentos a
         JOIN negocios n ON n.id=a.negocio_id
         JOIN servicos s ON s.id=a.servico_id
         LEFT JOIN usuarios c ON c.id=a.cliente_id
         WHERE n.usuario_id=?
         ORDER BY a.inicio`
      ).bind(user.id).all();
      return jsonResponse({ appointments: result.results || [] });
    }

    case "appointment-create": {
      requireMethod(request, "POST");
      if (user.tipo !== "cliente") fail(403, "Somente clientes podem criar uma reserva.");
      const businessKey = String(body.business || "").trim();
      const business = await getBusiness(db, businessKey, 0, false);
      const store = parseStore(business.vitrine_json);
      const service = findActiveService(store, body.service);
      if (!service) fail(422, "Esse serviço não está disponível. Atualize a página.");
      const professional = resolveProfessional(store, String(body.professional || "").trim());
      const date = String(body.date || "");
      const time = String(body.time || "");
      if (!validFutureSlot(date, time)) fail(422, "Escolha uma data e horário futuros.");
      const duration = Math.max(5, Math.min(720, Math.trunc(Number(service.duration) || 30)));
      const startEpoch = localDateTimeToEpoch(date, time);
      const endTime = localTimeFromEpoch(startEpoch + duration * 60_000);
      if (!validOperatingSlot(store, date, time, endTime)) {
        fail(422, "Esse horário está fora do expediente ou em um dia de fechamento.");
      }
      const booking = await insertAppointment(db, {
        clientId: user.id,
        businessId: Number(business.id),
        serviceName: String(service.name || body.service),
        professional: professional,
        price: service.price,
        duration: duration,
        startEpoch: startEpoch,
        notes: String(body.observations || "").trim().slice(0, 2000),
      });
      await insertAnswers(db, booking.id, body.answers);
      return jsonResponse({ ok: true, id: booking.id }, 201);
    }

    case "manual-appointment-create": {
      requireMethod(request, "POST");
      if (user.tipo !== "loja") fail(403, "Somente o negócio pode criar um agendamento manual.");
      const clientName = String(body.client || "").trim();
      const phone = onlyDigits(body.phone);
      const date = String(body.date || "");
      const time = String(body.time || "");
      if (clientName.length < 2 || phone.length < 10 || !validFutureSlot(date, time)) {
        fail(422, "Confira os dados e escolha um horário futuro.");
      }
      const business = await getBusiness(db, user.id, user.id, true);
      const store = parseStore(business.rascunho_json);
      const service = findActiveService(store, body.service);
      if (!service) fail(422, "Serviço não encontrado na vitrine.");
      const professional = resolveProfessional(store, String(body.professional || "").trim());
      const duration = Math.max(5, Math.min(720, Math.trunc(Number(service.duration) || 30)));
      const startEpoch = localDateTimeToEpoch(date, time);
      const endTime = localTimeFromEpoch(startEpoch + duration * 60_000);
      if (!validOperatingSlot(store, date, time, endTime)) {
        fail(422, "Esse horário está fora do expediente ou em um dia de fechamento.");
      }
      const booking = await insertAppointment(db, {
        clientId: null,
        clientName: clientName.slice(0, 160),
        clientPhone: phone,
        businessId: Number(business.id),
        serviceName: String(service.name || body.service),
        professional: professional,
        price: service.price,
        duration: duration,
        startEpoch: startEpoch,
        notes: String(body.notes || "").trim().slice(0, 2000),
      });
      return jsonResponse({ ok: true, id: booking.id }, 201);
    }

    case "appointment-reschedule": {
      requireMethod(request, "POST");
      const appointmentId = Number(body.id);
      const date = String(body.date || "");
      const time = String(body.time || "");
      if (!Number.isSafeInteger(appointmentId) || appointmentId < 1 || !validFutureSlot(date, time)) {
        fail(422, "Escolha uma data e horário futuros.");
      }
      const appointment = user.tipo === "cliente"
        ? await db.prepare(
          `SELECT a.*, n.vitrine_json, n.rascunho_json
           FROM agendamentos a JOIN negocios n ON n.id=a.negocio_id
           WHERE a.id=? AND a.cliente_id=?`
        ).bind(appointmentId, user.id).first()
        : await db.prepare(
          `SELECT a.*, n.vitrine_json, n.rascunho_json
           FROM agendamentos a JOIN negocios n ON n.id=a.negocio_id
           WHERE a.id=? AND n.usuario_id=?`
        ).bind(appointmentId, user.id).first();
      if (!appointment || !["pendente", "confirmado"].includes(appointment.status)) {
        fail(404, "Este agendamento não pode ser remarcado.");
      }
      const store = parseStore(user.tipo === "loja" ? appointment.rascunho_json : appointment.vitrine_json);
      const startEpoch = localDateTimeToEpoch(date, time);
      const duration = Math.max(
        5,
        Math.round(
          (databaseDateTimeToEpoch(appointment.fim) - databaseDateTimeToEpoch(appointment.inicio)) /
            60_000
        )
      );
      const endEpoch = startEpoch + duration * 60_000;
      const endTime = localTimeFromEpoch(endEpoch);
      if (!validOperatingSlot(store, date, time, endTime)) {
        fail(422, "O horário escolhido está fora do expediente ou em um dia fechado.");
      }
      const result = await db.prepare(
        `UPDATE agendamentos SET inicio=?, fim=?, atualizado_em=datetime('now')
         WHERE id=? AND status IN ('pendente', 'confirmado')
           AND NOT EXISTS (
             SELECT 1 FROM agendamentos other
             WHERE other.negocio_id=? AND other.id<>?
               AND other.status IN ('pendente', 'confirmado')
               AND other.inicio<? AND other.fim>?
               AND (?='Equipe do estabelecimento'
                 OR other.profissional_nome=?
                 OR other.profissional_nome='Equipe do estabelecimento')
           )`
      ).bind(
        localDateTimeToDatabase(startEpoch),
        localDateTimeToDatabase(endEpoch),
        appointmentId,
        appointment.negocio_id,
        appointmentId,
        localDateTimeToDatabase(endEpoch),
        localDateTimeToDatabase(startEpoch),
        appointment.profissional_nome || DEFAULT_PROFESSIONAL,
        appointment.profissional_nome || DEFAULT_PROFESSIONAL
      ).run();
      if (!result.meta || Number(result.meta.changes) !== 1) {
        fail(409, "Esse horário acabou de ser reservado. Atualize a agenda e tente novamente.");
      }
      return jsonResponse({ ok: true });
    }

    case "appointment-status": {
      requireMethod(request, "POST");
      const id = Number(body.id);
      const status = String(body.status || "");
      if (!Number.isSafeInteger(id) || id < 1 ||
          !["confirmado", "cancelado", "concluido"].includes(status)) {
        fail(422, "Status ou agendamento inválido.");
      }
      let result;
      if (user.tipo === "cliente") {
        if (status !== "cancelado") fail(403, "Ação não permitida.");
        result = await db.prepare(
          `UPDATE agendamentos SET status=?, atualizado_em=datetime('now')
           WHERE id=? AND cliente_id=? AND inicio>? AND status IN ('pendente', 'confirmado')`
        ).bind(status, id, user.id, localDateTimeToDatabase(Date.now())).run();
      } else {
        result = await db.prepare(
          `UPDATE agendamentos SET status=?, atualizado_em=datetime('now')
           WHERE id=? AND negocio_id IN (SELECT id FROM negocios WHERE usuario_id=?)
             AND status IN ('pendente', 'confirmado')`
        ).bind(status, id, user.id).run();
      }
      if (!result.meta || Number(result.meta.changes) !== 1) {
        fail(404, "Agendamento não encontrado ou já encerrado.");
      }
      return jsonResponse({ ok: true });
    }

    case "support": {
      requireMethod(request, "POST");
      const name = String(body.nome || "").trim();
      const email = normalizeEmail(body.email);
      const subject = String(body.assunto || "").trim();
      const message = String(body.mensagem || "").trim();
      if (name.length < 2 || !isValidEmail(email) || subject.length < 3 || message.length < 10) {
        fail(422, "Preencha todos os campos corretamente.");
      }
      await db.prepare(
        `INSERT INTO mensagens_suporte(usuario_id, nome, email, assunto, mensagem)
         VALUES(?, ?, ?, ?, ?)`
      ).bind(user.id, name.slice(0, 160), email, subject.slice(0, 160), message.slice(0, 10000)).run();
      return jsonResponse({ ok: true }, 201);
    }

    default:
      fail(404, "Operação não encontrada.");
  }
}

async function insertAnswers(db, appointmentId, answers) {
  if (!Array.isArray(answers)) return;
  const statements = answers
    .filter(function (answer) {
      return answer && typeof answer === "object" && String(answer.answer || "").trim() !== "";
    })
    .slice(0, 30)
    .map(function (answer) {
      return db.prepare(
        "INSERT INTO respostas_agendamento(agendamento_id, pergunta, resposta) VALUES(?, ?, ?)"
      ).bind(
        appointmentId,
        String(answer.question || "").slice(0, 255),
        String(answer.answer).trim().slice(0, 4000)
      );
    });
  if (statements.length) await db.batch(statements);
}

function parseStore(value) {
  try {
    const store = JSON.parse(value || "{}");
    if (!store || typeof store !== "object" || Array.isArray(store)) {
      fail(422, "A vitrine deste estabelecimento está inválida.");
    }
    return store;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(422, "A vitrine deste estabelecimento está inválida.");
  }
}

function todaySaoPaulo() {
  const parts = dateTimeParts(Date.now());
  return parts.year + "-" + parts.month + "-" + parts.day;
}

function addDays(date, amount) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return next.getUTCFullYear() + "-" +
    String(next.getUTCMonth() + 1).padStart(2, "0") + "-" +
    String(next.getUTCDate()).padStart(2, "0");
}

function timeFromMinute(minute) {
  return String(Math.floor(minute / 60)).padStart(2, "0") + ":" +
    String(minute % 60).padStart(2, "0");
}

export async function onRequest(context) {
  try {
    return await handleAction(context.request, context.env);
  } catch (error) {
    if (error instanceof ApiError) {
      const headers = error.status === 401 ? { "Set-Cookie": clearSessionCookie(context.request) } : {};
      return jsonResponse({ error: error.message }, error.status, headers);
    }
    if (error instanceof Error && /UNIQUE constraint failed|FOREIGN KEY constraint failed/.test(error.message)) {
      return jsonResponse({ error: "Já existe uma conta com esses dados." }, 409);
    }
    console.error("Agendly Pages API:", error);
    return jsonResponse(
      { error: "Ocorreu um erro inesperado. Tente novamente mais tarde." },
      500
    );
  }
}
