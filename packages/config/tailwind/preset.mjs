/**
 * SALON OS Tailwind v4 preset.
 * Apps importieren diese Datei in ihrer `tailwind.config.mjs`
 * oder in `@theme { ... }` im globals.css.
 *
 * Farb-/Spacing-Tokens werden in Phase 1 ausgebaut, sobald das Design-System steht.
 */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
};
