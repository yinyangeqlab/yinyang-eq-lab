import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { settings: { next: { rootDir: "site/" } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "site/.next/**",
    "site/dist/**",
    "out/**",
    "scripts/build/**",
    "site/next-env.d.ts",
    // Generated local evidence, archived worktrees and emulator output are not source.
    "artifacts/**",
    "work/**",
    ".wrangler/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    files: ["scripts/recovery/prepare-local-worker.mjs", "scripts/recovery/recovery.mjs", "scripts/recovery/snapshot-d1.mjs"],
    rules: {
      // Recovery source is hash-pinned. Retain these legacy bindings until a recovery baseline rotation.
      "@typescript-eslint/no-unused-vars": ["warn", {
        varsIgnorePattern: "^(rmSync|relative)$", caughtErrorsIgnorePattern: "^e$",
        argsIgnorePattern: "^_", ignoreRestSiblings: true,
      }],
    },
  },
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      // These synthetic Node harnesses deliberately use the CommonJS module format.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["site/components/ui/**/*.{ts,tsx}", "site/components/hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
