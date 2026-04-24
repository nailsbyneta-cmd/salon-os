export default function Loading(): React.JSX.Element {
  return (
    <main className="space-y-6">
      <div className="h-8 animate-pulse rounded bg-surface-raised/60" />
      <div className="h-4 w-24 animate-pulse rounded bg-surface-raised/40" />
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-surface-raised/40" />
        <div className="h-24 animate-pulse rounded-md bg-surface-raised/30" />
        <div className="h-24 animate-pulse rounded-md bg-surface-raised/30" />
        <div className="h-24 animate-pulse rounded-md bg-surface-raised/30" />
      </div>
    </main>
  );
}
