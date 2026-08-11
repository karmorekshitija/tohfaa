const eslintPluginSecurity = require("eslint-plugin-security");
const eslintPluginNoUnsanitized = require("eslint-plugin-no-unsanitized");

module.exports = [
  {
    files: ["**/*.js"],
    plugins: {
      security: eslintPluginSecurity,
      "no-unsanitized": eslintPluginNoUnsanitized,
    },
    rules: {
      ...eslintPluginSecurity.configs.recommended.rules,
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
    },
  },
];
