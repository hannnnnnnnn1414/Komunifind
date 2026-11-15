import { execSync } from "node:child_process";
import { Client } from "pg";

function e2eUrl(): string {
  return (
    process.env.E2E_DATABASE_URL ??
    "postgres://komunifind:komunifind_dev@localhost:5433/komunifind_e2e?sslmode=disable"
  );
}

export default async function globalSetup(): Promise<void> {
  const url = e2eUrl();
  const name = url.match(/\/([^/?]+)(\?|$)/)?.[1];
  if (!name || !/^[a-z0-9_]+$/i.test(name)) {
    throw new Error(`E2E_DATABASE_URL tidak valid: ${url}`);
  }

  const adminUrl = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [name],
  );
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();

  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx tsx scripts/migrate.ts", { env, stdio: "inherit" });
  execSync("npx tsx scripts/seed.ts", { env, stdio: "inherit" });
}
