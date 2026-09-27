const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "data/", "log/"] },
  js.configs.recommended,
  {
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "object-shorthand": "error",
      "no-var": "error"
    }
  },
  {
    files: ["tests/**"],
    languageOptions: { globals: { ...globals.jest } }
  }
];
