'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function CalendarDateJumper({
  currentDate,
  view,
}: {
  currentDate: string;
  view: string;
}): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="date"
      defaultValue={currentDate}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        if (!next || next === currentDate) return;
        startTransition(() => {
          router.push(`/calendar?view=${view}&date=${next}`);
        });
      }}
      className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary transition-colors hover:bg-surface-raised focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
    />
  );
}
