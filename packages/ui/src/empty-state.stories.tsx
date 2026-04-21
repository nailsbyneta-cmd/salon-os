import type { Story } from '@ladle/react';
import { Button } from './button.js';
import { EmptyState } from './empty-state.js';

export default {
  title: 'Feedback / EmptyState',
};

export const NoClients: Story = () => (
  <div style={{ maxWidth: 520 }}>
    <EmptyState
      title="Noch keine Kund:innen"
      description="Leg die erste Kundin an oder importiere deine bestehende Liste aus Phorest, Fresha oder Booksy."
      action={<Button>Kundin anlegen</Button>}
    />
  </div>
);

export const NoSearchResults: Story = () => (
  <div style={{ maxWidth: 520 }}>
    <EmptyState
      title="Kein Treffer"
      description="Für 'xyzzy' gibt's noch nichts. Versuch einen anderen Namen oder die Telefonnummer."
    />
  </div>
);
