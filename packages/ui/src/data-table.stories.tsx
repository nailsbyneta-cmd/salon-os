import type { ColumnDef } from '@tanstack/react-table';
import type { Story } from '@ladle/react';

import { Badge } from './badge.js';
import { DataTable } from './data-table.js';

export default {
  title: 'Data / DataTable',
};

interface ClientRow {
  id: string;
  name: string;
  email: string;
  lifetimeValue: number;
  lastVisit: string;
  status: 'active' | 'vip' | 'at-risk';
}

const demo: ClientRow[] = [
  { id: '1', name: 'Alma Berisha', email: 'alma@example.com', lifetimeValue: 2_450, lastVisit: '2026-04-14', status: 'vip' },
  { id: '2', name: 'Sara Luzi', email: 'sara@example.com', lifetimeValue: 1_180, lastVisit: '2026-04-02', status: 'active' },
  { id: '3', name: 'Dana Hoti', email: 'dana@example.com', lifetimeValue: 640, lastVisit: '2025-10-18', status: 'at-risk' },
  { id: '4', name: 'Ema Krasniqi', email: 'ema@example.com', lifetimeValue: 3_120, lastVisit: '2026-04-20', status: 'vip' },
  { id: '5', name: 'Linda Shala', email: 'linda@example.com', lifetimeValue: 890, lastVisit: '2026-03-11', status: 'active' },
];

const toneMap = { active: 'info', vip: 'accent', 'at-risk': 'warning' } as const;

const columns: ColumnDef<ClientRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'E-Mail' },
  {
    accessorKey: 'lifetimeValue',
    header: 'Lifetime',
    cell: ({ getValue }) => `CHF ${(getValue<number>()).toLocaleString('de-CH')}`,
  },
  { accessorKey: 'lastVisit', header: 'Letzter Besuch' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const v = getValue<ClientRow['status']>();
      return <Badge tone={toneMap[v]}>{v}</Badge>;
    },
  },
];

export const Basic: Story = () => <DataTable columns={columns} data={demo} />;

export const SearchableAndPaginated: Story = () => (
  <DataTable
    columns={columns}
    data={[...demo, ...demo.map((d) => ({ ...d, id: d.id + 'b' }))]}
    searchable
    pageSize={3}
    searchPlaceholder="Nach Name oder E-Mail…"
  />
);

export const Empty: Story = () => (
  <DataTable
    columns={columns}
    data={[]}
    emptyTitle="Keine Kundinnen"
    emptyDescription="Lege die erste Kundin an oder importiere eine CSV."
  />
);
