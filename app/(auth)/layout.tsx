export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 pt-[var(--content-pt)] pb-[var(--content-pb)] sm:px-0">
      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
