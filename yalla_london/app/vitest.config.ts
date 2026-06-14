import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.spec.ts", "tests/**/*.spec.ts", "tests/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "e2e/**",
      "**/*.d.ts",
      // Playwright e2e tests — run with `npx playwright test`, not vitest
      "tests/admin-workflow-e2e.test.ts",
      "tests/api-endpoint-validation.test.ts",
      "tests/api-staging.spec.ts",
      "tests/comprehensive-integration.test.ts",
      "tests/e2e-staging.spec.ts",
      "tests/feature-flags-api.spec.ts",
      "tests/json-ld.spec.ts",
      // Integration tests requiring live database
      "test/integration/ai-content-generation.spec.ts",
      "test/integration/dashboard-functionality.spec.ts",
      "test/integration/dashboard-public-connection.spec.ts",
    ],
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
      include: [
        "lib/**/*.ts",
        "app/api/**/*.ts",
        "app/admin/**/*.tsx",
        "components/**/*.tsx",
      ],
      exclude: [
        "node_modules/**",
        "test/**",
        "tests/**",
        "e2e/**",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
