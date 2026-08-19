import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadTestEnv } from "./load-env";

function postgresSchemaFromUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    const value = url.searchParams.get("schema") ?? "public";
    return /^[a-zA-Z0-9_]+$/.test(value) ? value : "public";
  } catch {
    return "public";
  }
}

function disableIntegration(message: string): void {
  if (process.env.CI) {
    throw new Error(message);
  }
  console.warn(message);
  process.env.SKIP_INTEGRATION = "1";
}

async function canConnect(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await client.$connect();
    const schema = postgresSchemaFromUrl(databaseUrl);
    if (schema !== "public") {
      await client.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }
    await client.$disconnect();
    return true;
  } catch {
    await client.$disconnect().catch(() => undefined);
    return false;
  }
}

export default async function globalSetup() {
  loadTestEnv();

  if (!process.env.DATABASE_TEST_URL) {
    disableIntegration(
      "DATABASE_TEST_URL is not set — integration tests cannot run. " +
        "Start the test database: npm run test:db:up"
    );
    return;
  }

  // Prisma Migrate needs a direct Postgres connection.
  // Some providers (e.g. Neon pooler endpoints) can time out advisory locks.
  try {
    const url = new URL(process.env.DATABASE_TEST_URL);
    if (url.host.includes("pooler")) {
      console.warn(
        "\n⚠ DATABASE_TEST_URL appears to be a pooled endpoint (contains 'pooler').\n" +
          "  Prisma migrations may fail/hang on pooled connections.\n" +
          "  Use a direct connection string for integration tests, or run a local Postgres.\n"
      );
    }
  } catch {
    // ignore
  }

  const reachable = await canConnect(process.env.DATABASE_TEST_URL);
  if (!reachable) {
    disableIntegration(
      "DATABASE_TEST_URL is set but the database is not reachable. " +
        "Start the test database: npm run test:db:up"
    );
    return;
  }

  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

  try {
    execSync("npx prisma migrate deploy", {
      cwd: path.resolve(__dirname, "../../.."),
      env: process.env,
      stdio: "inherit",
    });
  } catch {
    disableIntegration(
      "Failed to run `prisma migrate deploy` for integration tests. " +
        "Use a direct (non-pooler) Postgres URL for DATABASE_TEST_URL, or local Postgres."
    );
  }
}
