export default function Loading(): React.JSX.Element {
  return (
    <main className="space-y-6">
      <div className="h-8 animate-pulse rounded bg-surface-raised/60" />
      <div className="h-40 animate-pulse rounded-lg bg-surface-raised/40" />
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded bg-surface-raised/30" />
        <div className="h-10 animate-pulse rounded bg-surface-raised/30" />
        <div className="h-10 animate-pulse rounded bg-surface-raised/30" />
      </div>
    </main>
  );
}
