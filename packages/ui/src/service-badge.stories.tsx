import type { Story } from '@ladle/react';

import { ServiceBadge } from './service-badge.js';

export default {
  title: 'Domain / ServiceBadge',
};

const row: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  alignItems: 'center',
};

export const ServiceCatalog: Story = () => (
  <div style={row}>
    <ServiceBadge name="Haarschnitt" durationMin={30} />
    <ServiceBadge name="Coloration" durationMin={90} />
    <ServiceBadge name="Balayage" durationMin={150} />
    <ServiceBadge name="Keratin" durationMin={120} />
    <ServiceBadge name="Waschen & Föhnen" durationMin={20} />
    <ServiceBadge name="Augenbrauen" durationMin={15} />
  </div>
);

export const WithCustomColor: Story = () => (
  <div style={row}>
    <ServiceBadge name="VIP Premium" color="rgba(250, 204, 21, 0.15)" />
  </div>
);
