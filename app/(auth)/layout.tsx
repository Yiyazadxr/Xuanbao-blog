// (auth) 路由组共享布局：居中窄卡片
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 pt-[var(--content-pt)] pb-[var(--content-pb)] sm:px-0">
      {/* 不透明底，遮挡水墨背景 */}
      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
