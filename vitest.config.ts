import path from "path";
import { defineConfig } from "vitest/config";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://calsite:calsite@127.0.0.1:5432/calsite_test";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-only-secret-not-for-production-use";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    sequence: { concurrent: false },
    globalSetup: "./tests/global-setup.ts",
    setupFiles: ["./tests/setup.ts"],
    hookTimeout: 60000,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
