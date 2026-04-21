import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './button.js';
import { ErrorBoundary } from './error-boundary.js';

export default {
  title: 'Feedback / ErrorBoundary',
};

function Bomb({ armed }: { armed: boolean }): React.JSX.Element {
  if (armed) throw new Error('Demo-Fehler — z.B. API-Antwort fehlt.');
  return <p className="text-sm">Alles ruhig hier.</p>;
}

export const DefaultFallback: Story = () => {
  const [armed, setArmed] = useState(false);
  return (
    <div className="flex flex-col gap-3" style={{ maxWidth: 440 }}>
      <Button onClick={() => setArmed((v) => !v)}>
        {armed ? 'Fehler deaktivieren' : 'Fehler auslösen'}
      </Button>
      <ErrorBoundary key={String(armed)}>
        <Bomb armed={armed} />
      </ErrorBoundary>
    </div>
  );
};
