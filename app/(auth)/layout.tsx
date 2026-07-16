// (auth) 路由组共享布局：居中窄卡片
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-24 pt-32 sm:px-0">
      {children}
    </div>
  );
}
