import path from "node:path";
import { defineConfig } from "vitest/config";

// Vitest 配置：Node 环境跑纯函数单测，@ 别名对齐 tsconfig paths
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
