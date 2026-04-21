import type { Story } from '@ladle/react';
import { AvatarGroup } from './avatar-group.js';

export default {
  title: 'Primitives / AvatarGroup',
};

const people = [
  { id: '1', name: 'Neta Kuzhnini', color: '#c026d3', vip: true },
  { id: '2', name: 'Alma Berisha', color: '#7c3aed' },
  { id: '3', name: 'Sara Luzi', color: '#0ea5e9' },
  { id: '4', name: 'Dana Hoti', color: '#14b8a6' },
  { id: '5', name: 'Ema Krasniqi', color: '#f59e0b' },
  { id: '6', name: 'Linda Shala', color: '#ef4444' },
];

export const SmallTeam: Story = () => (
  <AvatarGroup people={people.slice(0, 3)} />
);

export const WithOverflow: Story = () => <AvatarGroup people={people} max={4} />;

export const Large: Story = () => <AvatarGroup people={people} size="lg" max={5} />;
