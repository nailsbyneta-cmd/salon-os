import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './button.js';
import { SyncBanner, type SyncState } from './sync-banner.js';

export default {
  title: 'Micro-Interactions / SyncBanner',
};

const states: SyncState[] = ['online', 'syncing', 'offline', 'error'];

export const AllStates: Story = () => {
  const [state, setState] = useState<SyncState>('syncing');
  return (
    <div style={{ minHeight: 200, position: 'relative' }}>
      <SyncBanner
        state={state}
        position="top"
        onRetry={() => setState('syncing')}
      />
      <div style={{ marginTop: 48, display: 'flex', gap: '0.5rem' }}>
        {states.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === state ? 'primary' : 'secondary'}
            onClick={() => setState(s)}
          >
            {s}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-sm text-text-secondary">
        Aktueller Zustand: <strong>{state}</strong>
      </p>
    </div>
  );
};
