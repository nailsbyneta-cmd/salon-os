import type { Story } from '@ladle/react';
import { Button } from './button.js';
import { Card, CardBody, CardFooter, CardHeader } from './card.js';

export default {
  title: 'Primitives / Card',
};

export const Basic: Story = () => (
  <Card style={{ maxWidth: 420 }}>
    <CardHeader>Termin bestätigen</CardHeader>
    <CardBody>
      <p>
        Freitag, 28. Juni 2026 – 14:30 Uhr.
        <br />
        Schnitt &amp; Föhn bei Neta, St. Gallen Winkeln.
      </p>
    </CardBody>
    <CardFooter>
      <Button variant="secondary">Verschieben</Button>
      <Button>Bestätigen</Button>
    </CardFooter>
  </Card>
);
