import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function loadTestEnv() {
  parseEnvFile(path.join(root, ".env"));
  parseEnvFile(path.join(root, ".env.test"));
  parseEnvFile(path.join(root, ".env.local"));

  if (process.env.DATABASE_TEST_URL) {
    // If user points tests at the same database, isolate via a dedicated schema
    // to avoid touching real data and to keep tests deterministic.
    try {
      const url = new URL(process.env.DATABASE_TEST_URL);
      if (!url.searchParams.get("schema")) {
        url.searchParams.set("schema", "integration_test");
      }
      process.env.DATABASE_TEST_URL = url.toString();
    } catch {
      // ignore invalid URLs; env validation will surface it later
    }

    process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
  }

  process.env.NODE_ENV = "test";
  process.env.NEXTAUTH_SECRET ??=
    "integration-test-secret-at-least-32-chars-long";
  process.env.NEXTAUTH_URL ??= "http://localhost:3000";
}
