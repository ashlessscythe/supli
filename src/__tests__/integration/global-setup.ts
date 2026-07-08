import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadTestEnv } from "./load-env";

async function canConnect(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await client.$connect();
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
    console.warn(
      "\n⚠ DATABASE_TEST_URL is not set — integration tests will be skipped.\n" +
        "  Start the test database: npm run test:db:up\n" +
        "  Or set DATABASE_TEST_URL in .env (see .env.example).\n"
    );
    process.env.SKIP_INTEGRATION = "1";
    return;
  }

  const reachable = await canConnect(process.env.DATABASE_TEST_URL);
  if (!reachable) {
    console.warn(
      "\n⚠ DATABASE_TEST_URL is set but the database is not reachable — integration tests will be skipped.\n" +
        "  Start the test database: npm run test:db:up\n"
    );
    process.env.SKIP_INTEGRATION = "1";
    return;
  }

  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../../.."),
    env: process.env,
    stdio: "inherit",
  });
}
