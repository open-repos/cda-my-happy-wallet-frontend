import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/vitest/**/*.test.{js,jsx}"],
  },
});
