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
    // Vendored agent skills, not app code.
    ".claude/**",
  ]),
  {
    // The 3D film mutates Three objects every frame by design (R3F's useFrame model);
    // the React Compiler purity rules don't apply to that imperative layer.
    files: ["src/modules/film/scene/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
    },
  },
]);

export default eslintConfig;
