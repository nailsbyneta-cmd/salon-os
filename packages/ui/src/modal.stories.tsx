import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from './button.js';
import { Modal } from './modal.js';

export default {
  title: 'Overlays / Modal',
};

export const ConfirmCancellation: Story = () => (
  <Modal
    title="Termin wirklich stornieren?"
    description="Die Kundin wird automatisch per E-Mail benachrichtigt, falls ihre Einstellungen das erlauben."
    trigger={<Button variant="danger">Termin stornieren</Button>}
    footer={
      <>
        <Button variant="ghost">Abbrechen</Button>
        <Button variant="danger">Ja, stornieren</Button>
      </>
    }
  >
    <p className="text-sm text-text-secondary">
      Diese Aktion lässt sich nicht rückgängig machen.
    </p>
  </Modal>
);

export const ControlledOpen: Story = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Controlled Modal öffnen</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Kontrolliert geöffnet"
        size="sm"
        footer={<Button onClick={() => setOpen(false)}>Schliessen</Button>}
      >
        <p className="text-sm">
          Die Parent-Komponente hält das `open`-State selbst.
        </p>
      </Modal>
    </div>
  );
};
