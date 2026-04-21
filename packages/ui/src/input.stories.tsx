import type { Story } from '@ladle/react';
import { Field, Input, Select, Textarea } from './input.js';

export default {
  title: 'Primitives / Input',
};

const wrap: React.CSSProperties = {
  display: 'grid',
  gap: '1rem',
  maxWidth: 360,
};

export const Basics: Story = () => (
  <div style={wrap}>
    <Field label="Name">
      <Input placeholder="Alice Muster" />
    </Field>
    <Field label="E-Mail" hint="Wir nutzen die Adresse nur für Termin-Reminder.">
      <Input type="email" placeholder="alice@example.com" />
    </Field>
    <Field label="Telefon" error="Telefonnummer mit Ländervorwahl, z.B. +41 79 …">
      <Input type="tel" defaultValue="079 invalid" />
    </Field>
  </div>
);

export const SelectField: Story = () => (
  <div style={wrap}>
    <Field label="Bevorzugter Stylist">
      <Select defaultValue="">
        <option value="" disabled>
          Stylist wählen…
        </option>
        <option>Neta</option>
        <option>Alma</option>
        <option>Sara</option>
      </Select>
    </Field>
  </div>
);

export const TextareaField: Story = () => (
  <div style={wrap}>
    <Field label="Notizen" hint="Z.B. Allergien, Vorlieben, besondere Wünsche.">
      <Textarea rows={4} placeholder="…" />
    </Field>
  </div>
);
