import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { closePool, getPool } from "../lib/db";

async function main(): Promise<void> {
  const dir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "db", "migrations");
  const pool = getPool();

  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const entries = await readdir(dir);
  const names = entries.filter((name) => name.endsWith(".sql")).sort();

  for (const name of names) {
    const existing = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = $1`, [name]);
    if ((existing.rowCount ?? 0) > 0) continue;

    const body = await readFile(path.join(dir, name), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(body);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [name]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    console.log(`applied ${name}`);
  }

  await closePool();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
