export default function BlogGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 pt-[var(--content-pt)] pb-[var(--content-pb)] sm:px-6"
    >
      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
