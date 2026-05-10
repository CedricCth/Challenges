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
    /*
     * Server Components (App Router pages/layouts), Route Handlers, server
     * actions, and middleware are server-side by default. They can import
     * from `@/server/*`. Client components opt in with `'use client'` and
     * are blocked by the rule above (also belt-and-braces: server modules
     * use `import "server-only"` so any leak fails the build).
     */
    files: [
      "src/server/**/*.{ts,tsx}",
      "src/app/**/page.{ts,tsx}",
      "src/app/**/layout.{ts,tsx}",
      "src/app/**/route.{ts,tsx}",
      "src/app/**/error.{ts,tsx}",
      "src/app/**/not-found.{ts,tsx}",
      "src/app/**/loading.{ts,tsx}",
      "src/app/**/template.{ts,tsx}",
      "src/middleware.ts",
      "src/**/actions.ts",
      "src/**/repo.ts",
      "src/**/service.ts",
      "**/*.config.{ts,mjs}",
      "drizzle.config.ts",
    ],
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
