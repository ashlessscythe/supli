import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          setupFiles: ["src/__tests__/integration/setup.ts"],
          globalSetup: ["src/__tests__/integration/global-setup.ts"],
          // DB-backed tests must run serially to avoid deadlocks from TRUNCATE
          // and shared database state.
          fileParallelism: false,
          maxWorkers: 1,
          sequence: { concurrent: false },
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
