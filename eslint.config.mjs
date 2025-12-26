import nextPlugin from "@next/eslint-plugin-next";
import typescriptEslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "*.config.ts", 
      "*.config.mjs",
      "next-env.d.ts"
    ]
  },
  ...typescriptEslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];

export default eslintConfig;
