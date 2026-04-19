export default async function BookingSuccess({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await searchParams;
  return (
    <main className="space-y-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-7 w-7"
        >
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Termin gebucht</h1>
      <p className="text-sm text-neutral-600">
        Du erhältst gleich eine Bestätigung per E-Mail. Bis bald!
      </p>
      {id ? (
        <p className="text-xs text-neutral-400">
          Referenz: <span className="font-mono">{id.slice(0, 8)}</span>
        </p>
      ) : null}
    </main>
  );
}
