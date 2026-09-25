import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 下划线前缀的变量/参数视为有意忽略（如从 props 解构排除 react-markdown 的 node）
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    // eslint-config-next 默认忽略项
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 归档和 Prisma 生成代码
    "_legacy/**",
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
