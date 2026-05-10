import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*"],
              message:
                "Server-only modules cannot be imported from client code. If this is server code, the rule is misfiring — open an issue.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.{ts,tsx}", "src/middleware.ts", "src/**/actions.ts", "**/*.config.{ts,mjs}", "drizzle.config.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "src/server/db/migrations/**",
  ]),
]);

export default eslintConfig;
