'use client';
import * as React from 'react';
import { ScheduleEditor, type Schedule } from './schedule-editor';
import { saveLocationHours } from '@/app/(admin)/settings/actions';

/**
 * Wrapper um ScheduleEditor für Location-Öffnungszeiten.
 * Nutzt dieselbe Array-of-Intervals-Shape wie Staff-Schedules.
 */
export function LocationHoursEditor({
  locationId,
  initial,
}: {
  locationId: string;
  initial: Schedule | null;
}): React.JSX.Element {
  return (
    <ScheduleEditor
      initial={initial}
      onSave={async (schedule) => {
        await saveLocationHours(locationId, schedule);
      }}
      title="Öffnungszeiten"
      subtitle="Wird auf Public-Buchungsseite unten angezeigt und bestimmt, welche Slots Kundinnen sehen."
      emptyHint="Leere Öffnungszeiten = keine Online-Booking-Slots möglich."
    />
  );
}
