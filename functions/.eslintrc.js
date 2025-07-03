// functions/.eslintrc.js
module.exports = {
  root: true, // <-- Убедитесь, что это первый ключ
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    quotes: ["error", "single", { "allowTemplateLiterals": true }],
    "no-console": "off",
    "no-case-declarations": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
};
