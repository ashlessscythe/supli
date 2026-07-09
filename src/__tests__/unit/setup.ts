// Unit tests import app modules that load env validation at import time.
// Provide safe defaults so tests run without a local .env or live database.
process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/supli_test?sslmode=disable";
process.env.NEXTAUTH_SECRET ??=
  "unit-test-secret-at-least-32-characters-long";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.NODE_ENV ??= "test";
