import type { Story } from '@ladle/react';
import { Skeleton } from './skeleton.js';

export default {
  title: 'Feedback / Skeleton',
};

export const ClientRow: Story = () => (
  <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
      >
        <Skeleton
          style={{ height: 40, width: 40, borderRadius: '9999px' }}
        />
        <div style={{ flex: 1 }}>
          <Skeleton style={{ height: 14, width: '60%', marginBottom: 6 }} />
          <Skeleton style={{ height: 12, width: '40%' }} />
        </div>
      </div>
    ))}
  </div>
);
