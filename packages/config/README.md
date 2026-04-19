# @salon-os/config

Geteilte Konfigs für ESLint, TypeScript, Tailwind.

## Verwendung

**ESLint (Node/Backend):**
```js
// eslint.config.mjs
import base from '@salon-os/config/eslint/base';
export default base;
```

**ESLint (React):**
```js
import react from '@salon-os/config/eslint/react';
export default react;
```

**Tailwind-Preset:**
```js
// tailwind.config.mjs (v3-Stil) — oder via @theme in v4 globals.css
import preset from '@salon-os/config/tailwind/preset';
export default { presets: [preset], content: ['./src/**/*.{ts,tsx}'] };
```

## TSConfig-Presets

Wir benutzen `tsconfig.base.json` im Repo-Root statt Dependencies — apps
erweitern per `"extends": "../../tsconfig.base.json"`. Das hält die Präsetze
eng am Tree und vermeidet eine zusätzliche Publish-Schleife.
