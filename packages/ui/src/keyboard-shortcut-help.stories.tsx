import type { Story } from '@ladle/react';

import { KeyboardShortcutHelp } from './keyboard-shortcut-help.js';

export default {
  title: 'Navigation / KeyboardShortcutHelp',
};

export const Default: Story = () => (
  <div>
    <p className="mb-4 text-sm text-text-secondary">
      Drücke <kbd>?</kbd> um das Shortcut-Dialog zu öffnen.
    </p>
    <KeyboardShortcutHelp
      shortcuts={[
        {
          group: 'Navigation',
          items: [
            { keys: ['⌘', 'K'], description: 'Command-Palette öffnen' },
            { keys: ['G', 'C'], description: 'Zum Kalender' },
            { keys: ['G', 'K'], description: 'Zu Kundinnen' },
          ],
        },
        {
          group: 'Termine',
          items: [
            { keys: ['N'], description: 'Neuen Termin anlegen' },
            { keys: ['Ctrl', 'Enter'], description: 'Termin speichern' },
            { keys: ['Esc'], description: 'Abbrechen' },
          ],
        },
        {
          group: 'Allgemein',
          items: [
            { keys: ['?'], description: 'Diese Liste öffnen' },
            { keys: ['/'], description: 'Suche fokussieren' },
          ],
        },
      ]}
    />
  </div>
);
