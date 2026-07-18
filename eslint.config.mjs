import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    
    // General JavaScript rules
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "off",
    "no-useless-escape": "off",

    // ---------------------------------------------------------------------
    // Security-01 — SQL-injection guardrails.
    // Prisma already parameterises $queryRaw / $executeRaw when called with
    // tagged template literals, but raw-string calls (`db.$queryRaw(str)`)
    // bypass parameterisation and are the classic injection vector. We ban
    // any call form that takes a plain string argument so the only way to
    // use $queryRaw is via the safe tagged-template form:
    //   db.$queryRaw`SELECT * FROM User WHERE id = ${userId}`
    // ---------------------------------------------------------------------
    "no-restricted-syntax": [
      "error",
      // Ban: db.$queryRawUnsafe("...") — always a string, always injectable.
      {
        selector: "CallExpression[callee.property.name='$queryRawUnsafe']",
        message: "Do not use $queryRawUnsafe — use the tagged-template $queryRaw`...` form so Prisma parameterises inputs. See docs/RESEARCH-SECURITY.md.",
      },
      // Ban: db.$executeRawUnsafe("...") — same risk.
      {
        selector: "CallExpression[callee.property.name='$executeRawUnsafe']",
        message: "Do not use $executeRawUnsafe — use the tagged-template $executeRaw`...` form so Prisma parameterises inputs. See docs/RESEARCH-SECURITY.md.",
      },
      // Ban: db.$queryRaw("string-literal" or template-literal with ${var})
      // The SAFE form is a tagged template: db.$queryRaw`...` (no parens).
      // A CALLED form: db.$queryRaw(`...`) is treated as a normal function
      // call and is NOT parameterised by Prisma.
      {
        selector: "CallExpression[callee.property.name='$queryRaw']",
        message: "Do not CALL $queryRaw as a function — use it as a tagged template: db.$queryRaw`SELECT ...`. See docs/RESEARCH-SECURITY.md.",
      },
      {
        selector: "CallExpression[callee.property.name='$executeRaw']",
        message: "Do not CALL $executeRaw as a function — use it as a tagged template: db.$executeRaw`UPDATE ...`. See docs/RESEARCH-SECURITY.md.",
      },
    ],

    // ---------------------------------------------------------------------
    // Security-01 — React XSS guardrails.
    // React auto-escapes JSX children, so the only way to inject HTML is via
    // `dangerouslySetInnerHTML`. We allow it but require an eslint-disable
    // comment on the same line, which forces code reviewers to acknowledge
    // the risk. The rule below flags the prop usage; the reviewer must add
    // `// eslint-disable-next-line react/no-danger` to silence it.
    // ---------------------------------------------------------------------
    "react/no-danger": "warn",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "upload/**", "engine-staging/**", "engine/**", ".secrets/**", "pip-melaka-blueprint/**"]
}];

export default eslintConfig;
