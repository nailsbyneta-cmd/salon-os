import type { Story } from '@ladle/react';

export default {
  title: 'Welcome',
};

export const Overview: Story = () => (
  <div style={{ maxWidth: 640 }}>
    <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
      SALON OS Design-System
    </h1>
    <p style={{ marginBottom: '1rem' }}>
      Diese Ladle-Instance dokumentiert alle Komponenten aus{' '}
      <code>@salon-os/ui</code>. Linker Baum zeigt Kategorien, oben rechts
      Theme-Toggle (light/dark) und Viewport-Breiten (mobile/tablet/desktop).
    </p>
    <ul style={{ lineHeight: 1.7 }}>
      <li><strong>Primitives</strong> — Button, Input, Badge, Avatar, Skeleton</li>
      <li><strong>Feedback</strong> — Toast, EmptyState, Stat</li>
      <li><strong>Overlays</strong> — Modal, Drawer, Popover, Tooltip</li>
      <li><strong>Navigation</strong> — CommandPalette, KeyboardShortcutHelp</li>
      <li><strong>Domain</strong> — AppointmentCard, PriceDisplay</li>
    </ul>
    <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary, #666)' }}>
      Alle Stories nutzen die Design-Tokens aus <code>tokens.css</code>. Stories
      mit a11y-Addon werden bei jedem Render axe-geprüft.
    </p>
  </div>
);
