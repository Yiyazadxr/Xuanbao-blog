export default function BlogPostLoading() {
  return (
    <article className="mx-auto max-w-4xl animate-pulse">
      <header className="mb-12">
        <p className="mb-3 h-4 w-16 rounded bg-border" />
        <div className="space-y-3">
          <div className="h-10 w-3/4 rounded bg-border" />
          <div className="h-10 w-1/2 rounded bg-border" />
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="h-4 w-20 rounded bg-border" />
          <div className="h-4 w-32 rounded bg-border" />
          <div className="h-4 w-24 rounded bg-border" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-5 w-14 rounded-full bg-border" />
          <div className="h-5 w-14 rounded-full bg-border" />
        </div>
      </header>
      <div className="space-y-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-border" style={{ width: `${80 - (i % 4) * 10}%` }} />
        ))}
      </div>
    </article>
  );
}
