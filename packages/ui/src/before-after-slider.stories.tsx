import type { Story } from '@ladle/react';

import { BeforeAfterSlider } from './before-after-slider.js';

export default {
  title: 'Domain / BeforeAfterSlider',
};

export const Demo: Story = () => (
  <div style={{ maxWidth: 640 }}>
    <BeforeAfterSlider
      beforeSrc="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=640"
      afterSrc="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=640"
      beforeAlt="Vorher-Foto"
      afterAlt="Nachher-Foto"
    />
    <p className="mt-2 text-sm text-text-secondary">
      Drag the handle or use ← / → keys to reveal the after-state.
    </p>
  </div>
);
