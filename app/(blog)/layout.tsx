// (blog) 路由组共享布局：为固定导航栏留出顶部空间
export default function BlogGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 pt-[var(--content-pt)] pb-[var(--content-pb)] sm:px-6"
    >
      {children}
    </div>
  );
}
