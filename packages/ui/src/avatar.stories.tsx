import type { Story } from '@ladle/react';
import { Avatar } from './avatar.js';

export default {
  title: 'Primitives / Avatar',
};

const row: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '1rem',
};

export const Sizes: Story = () => (
  <div style={row}>
    <Avatar name="Alice Muster" size="sm" />
    <Avatar name="Bob Beispiel" size="md" />
    <Avatar name="Carla Chef" size="lg" />
  </div>
);

export const WithPhoto: Story = () => (
  <div style={row}>
    <Avatar
      name="Neta"
      size="lg"
      src="https://i.pravatar.cc/120?u=neta-demo"
    />
    <Avatar name="Dana" size="lg" />
  </div>
);
