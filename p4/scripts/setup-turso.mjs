import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

if (!url) {
  console.error("Defina TURSO_DATABASE_URL e execute novamente.");
  process.exit(1);
}

const client = createClient({ url, authToken });
const migration = await readFile(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
await client.executeMultiple(migration);
console.log("Banco Turso configurado com sucesso.");
