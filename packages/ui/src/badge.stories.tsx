import type { Story } from '@ladle/react';
import { Badge, Kbd } from './badge.js';

export default {
  title: 'Primitives / Badge',
};

const row: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap',
};

export const Variants: Story = () => (
  <div style={row}>
    <Badge>Neutral</Badge>
    <Badge tone="success">Paid</Badge>
    <Badge tone="warning">Deposit pending</Badge>
    <Badge tone="danger">Overdue</Badge>
    <Badge tone="info">New</Badge>
  </div>
);

export const Keyboard: Story = () => (
  <div style={row}>
    <span>Press</span>
    <Kbd>⌘</Kbd>
    <Kbd>K</Kbd>
    <span>to open the command palette.</span>
  </div>
);
