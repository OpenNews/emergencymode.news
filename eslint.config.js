import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  jsdoc.configs["flat/recommended"],
  {
    files: ["**/*.js"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        // WordPress/jQuery globals
        jQuery: "readonly",
        $: "readonly",
        wp: "readonly",
      },
    },
    plugins: {
      jsdoc,
    },
    rules: {
      // JSDoc validation - Start with warnings, not errors
      "jsdoc/require-jsdoc": "off", // Don't require JSDoc everywhere yet
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns-description": "off",
      "jsdoc/require-param-type": "warn",
      "jsdoc/require-returns-type": "warn",
      "jsdoc/check-types": "warn",
      "jsdoc/valid-types": "warn",
      "jsdoc/no-undefined-types": "off", // Browser types are defined globally

      // General code quality
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off", // Allow console in WordPress context
      "no-useless-assignment": "off", // Allow assignments for side effects/debugging
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: ["node_modules/**", ".venv/**", "dist/**", "tmp/**", "**/*.min.js"],
  },
];
