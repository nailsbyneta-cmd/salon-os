import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * SALON OS base ESLint config for Node/TypeScript packages.
 * Web-apps erweitern diese in `@salon-os/config/eslint/react`.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // null-check-Pattern `x != null` (= null OR undefined) weiterhin
      // erlauben — die verbose 2-fach-Version bläht Null-Checks auf.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  { ignores: ['dist/', 'build/', '.next/', 'node_modules/', '*.config.*'] },
);
