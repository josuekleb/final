import { createClient } from "@libsql/client";
import { onRequest as cloudflareHandler } from "../functions/api.js";

function createTursoDatabase() {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL não está configurada.");

  const client = createClient({ url, authToken });

  function toD1Result(result) {
    const rows = result.rows ? Array.from(result.rows) : [];
    const lastRowId = result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined;
    if (!rows.length && lastRowId) rows.push({ id: lastRowId });
    return {
      success: true,
      results: rows,
      meta: {
        changes: result.rowsAffected || 0,
        last_row_id: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
        duration: 0,
      },
    };
  }

  class Statement {
    constructor(sql, args = []) {
      this.sql = sql;
      this.args = args;
    }

    bind(...args) {
      return new Statement(this.sql, args);
    }

    async all() {
      return toD1Result(await client.execute({ sql: this.sql, args: this.args }));
    }

    async first() {
      const result = await client.execute({ sql: this.sql, args: this.args });
      return result.rows && result.rows.length ? result.rows[0] : null;
    }

    async run() {
      return toD1Result(await client.execute({ sql: this.sql, args: this.args }));
    }
  }

  return {
    prepare(sql) {
      return new Statement(sql);
    },
    async batch(statements) {
      const batch = statements.map((statement) => ({
        sql: statement.sql,
        args: statement.args,
      }));
      const results = await client.batch(batch, "write");
      return results.map(toD1Result);
    },
  };
}

function toWebHeaders(nodeHeaders) {
  const headers = new Headers();
  Object.entries(nodeHeaders || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value !== undefined) headers.set(key, String(value));
  });
  return headers;
}

async function readNodeBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  try {
    const db = createTursoDatabase();
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = `${protocol}://${host}${req.url}`;
    const body = ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await readNodeBody(req);

    const request = new Request(url, {
      method: req.method,
      headers: toWebHeaders(req.headers),
      body: body && body.length ? body : undefined,
      duplex: "half",
    });

    const response = await cloudflareHandler({
      request,
      env: {
        DB: db,
        SESSION_SECRET: process.env.SESSION_SECRET,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        AGENDLY_MAIL_FROM: process.env.AGENDLY_MAIL_FROM,
      },
    });

    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.status(response.status);
    const data = Buffer.from(await response.arrayBuffer());
    res.end(data);
  } catch (error) {
    console.error("Agendly Vercel API:", error);
    res.status(503).json({
      error: "A API ou o banco de dados não está configurado corretamente.",
    });
  }
}
