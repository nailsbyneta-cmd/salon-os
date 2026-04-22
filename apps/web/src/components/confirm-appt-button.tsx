'use client';
import { useFormStatus } from 'react-dom';

interface Props {
  label: string;
}

/**
 * Submit-Button mit Pending-State für das Bestätigen eines Termins aus
 * dem Dashboard. Nutzt React's useFormStatus — muss in einem <form> stehen,
 * dessen action eine Server Action ist. Verhindert doppelte POST-Requests
 * bei langsamer Netzverbindung durch disabled={pending}.
 */
export function ConfirmApptButton({ label }: Props): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      aria-busy={pending}
      className="inline-flex h-10 items-center gap-1 rounded-md border border-success bg-success px-3 text-xs font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-70 md:h-9"
    >
      {pending ? '…' : '✓ Bestätigt'}
    </button>
  );
}
