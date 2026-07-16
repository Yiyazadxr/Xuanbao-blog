import type { Metadata } from "next";

export const metadata: Metadata = { title: "管理后台" };
export const dynamic = "force-dynamic";

// 占位仪表盘：Phase 4 填充统计与管理入口
export default function AdminPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">管理后台</h1>
      <p className="mt-3 text-muted">仪表盘建设中（Phase 4）。你已通过管理员鉴权。</p>
    </>
  );
}
