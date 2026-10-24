import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
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
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
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
