import type { Story } from '@ladle/react';

import {
  StaffScheduleGrid,
  type StaffScheduleShift,
  type StaffScheduleStaffRow,
} from './staff-schedule-grid.js';

export default {
  title: 'Domain / StaffScheduleGrid',
};

function weekFrom(d: Date): Date[] {
  const out: Date[] = [];
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    out.push(day);
  }
  return out;
}

const staff: StaffScheduleStaffRow[] = [
  { id: 'neta', name: 'Neta', color: '#c026d3' },
  { id: 'alma', name: 'Alma', color: '#7c3aed' },
  { id: 'sara', name: 'Sara', color: '#0ea5e9' },
  { id: 'dana', name: 'Dana', color: '#14b8a6' },
];

export const Week: Story = () => {
  const days = weekFrom(new Date());
  const iso = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const shifts: StaffScheduleShift[] = [
    { id: 's1', staffId: 'neta', dayISO: iso(days[0]!), startMin: 9 * 60, endMin: 13 * 60, label: 'Vormittag' },
    { id: 's2', staffId: 'neta', dayISO: iso(days[0]!), startMin: 14 * 60, endMin: 19 * 60, label: 'Nachmittag' },
    { id: 's3', staffId: 'alma', dayISO: iso(days[1]!), startMin: 10 * 60, endMin: 18 * 60 },
    { id: 's4', staffId: 'alma', dayISO: iso(days[3]!), startMin: 9 * 60, endMin: 20 * 60, tone: 'fully-booked', label: 'Voll gebucht' },
    { id: 's5', staffId: 'sara', dayISO: iso(days[2]!), startMin: 12 * 60, endMin: 16 * 60, tone: 'break', label: 'Shampoo-Shift' },
    { id: 's6', staffId: 'dana', dayISO: iso(days[4]!), startMin: 9 * 60, endMin: 20 * 60, tone: 'time-off', label: 'Urlaub' },
  ];

  return <StaffScheduleGrid days={days} staff={staff} shifts={shifts} />;
};
