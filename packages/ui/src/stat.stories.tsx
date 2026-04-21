import type { Story } from '@ladle/react';
import { Stat } from './stat.js';

export default {
  title: 'Feedback / Stat',
};

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '1rem',
};

export const Dashboard: Story = () => (
  <div style={row}>
    <Stat
      label="Umsatz heute"
      value="CHF 1'240"
      trend={{ value: '+12 %', direction: 'up' }}
    />
    <Stat
      label="Auslastung"
      value="86 %"
      trend={{ value: '-4 %', direction: 'down' }}
    />
    <Stat
      label="Neue Kundinnen (7 T.)"
      value="23"
      trend={{ value: '+5', direction: 'up' }}
    />
    <Stat
      label="No-Shows (30 T.)"
      value="2"
      trend={{ value: '-1', direction: 'down' }}
    />
  </div>
);
