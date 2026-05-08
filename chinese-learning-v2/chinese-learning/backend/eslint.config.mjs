import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // ── Lỗi nghiêm trọng ──
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-duplicate-case": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",

      // ── Bảo mật ──
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // ── Best practices ──
      "eqeqeq": ["warn", "smart"],
      "no-var": "error",
      "prefer-const": "warn",
      "no-throw-literal": "error",
      "no-return-await": "warn",

      // ── Style (không quá strict) ──
      "no-trailing-spaces": "warn",
      "no-multiple-empty-lines": ["warn", { max: 2 }],
    },
  },
  {
    ignores: ["node_modules/", "data/"],
  },
];
