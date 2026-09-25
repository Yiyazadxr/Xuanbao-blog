import path from "node:path";
import { defineConfig } from "vitest/config";

// Node 测试环境；@ 别名与 tsconfig paths 一致。
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
