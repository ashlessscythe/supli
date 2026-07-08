import { beforeEach, vi } from "vitest";
import { loadTestEnv } from "./load-env";

loadTestEnv();

vi.mock("@/server/email/resend.provider", () => ({
  emailProvider: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(async () => {
  if (process.env.SKIP_INTEGRATION) return;

  const { integrationEnabled, resetDatabase } = await import("./db");
  if (!integrationEnabled()) return;
  await resetDatabase();
});
