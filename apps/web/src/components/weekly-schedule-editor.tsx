'use client';
import * as React from 'react';
import { ScheduleEditor, type Schedule } from './schedule-editor';
import { saveWeeklySchedule } from '@/app/(admin)/staff/[id]/shifts/actions';

/**
 * Dünner Wrapper um ScheduleEditor für Staff-Wochen-Vorlage.
 * Speichert via saveWeeklySchedule-Server-Action.
 */
export function WeeklyScheduleEditor({
  staffId,
  initial,
}: {
  staffId: string;
  initial: Schedule | null;
}): React.JSX.Element {
  return (
    <ScheduleEditor
      initial={initial}
      onSave={async (schedule) => {
        await saveWeeklySchedule(staffId, schedule);
      }}
      title="Wöchentliche Arbeitszeiten"
      subtitle="Einmal einstellen — gilt bis auf weiteres. Generierte Schichten nutzen diese Vorlage."
      emptyHint="Leere Vorlage = Fallback auf Öffnungszeiten der Location."
    />
  );
}
