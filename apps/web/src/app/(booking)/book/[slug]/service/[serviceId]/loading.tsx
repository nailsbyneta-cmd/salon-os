export default function Loading(): React.JSX.Element {
  return (
    <main className="space-y-6">
      <div className="h-8 animate-pulse rounded bg-surface-raised/60" />
      <div className="h-4 w-24 animate-pulse rounded bg-surface-raised/40" />
      <div className="h-20 animate-pulse rounded-md bg-surface-raised/30" />
      <div className="flex gap-2 overflow-x-auto">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-14 w-12 shrink-0 animate-pulse rounded bg-surface-raised/30" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-raised/30" />
        ))}
      </div>
    </main>
  );
}
