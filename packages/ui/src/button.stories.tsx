import type { Story } from '@ladle/react';
import { Button } from './button.js';

export default {
  title: 'Primitives / Button',
};

const row: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '1rem',
  flexWrap: 'wrap',
};

export const Variants: Story = () => (
  <div>
    <div style={row}>
      <Button variant="primary">Primary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="link">Link</Button>
    </div>
  </div>
);

export const Sizes: Story = () => (
  <div style={row}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const States: Story = () => (
  <div style={row}>
    <Button>Default</Button>
    <Button loading>Loading</Button>
    <Button disabled>Disabled</Button>
  </div>
);

export const WithIcons: Story = () => (
  <div style={row}>
    <Button iconLeft={<span aria-hidden>✨</span>}>Book appointment</Button>
    <Button variant="secondary" iconRight={<span aria-hidden>→</span>}>
      Continue
    </Button>
  </div>
);
