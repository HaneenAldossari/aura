import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Server-side unit tests only. The client has its own toolchain.
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
