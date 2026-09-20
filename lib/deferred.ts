import { after } from "next/server";

// 把收尾任务交给 Next 的请求生命周期：响应结束后继续执行（Vercel 上等价 waitUntil），
// 避免 serverless 响应返回后任务被中断。不在请求上下文（如构建期）时退回 fire-and-forget。
export function runAfter(task: () => Promise<unknown>): void {
  const run = () => {
    void task().catch((e) => console.error("后台任务失败：", e));
  };
  try {
    after(run);
  } catch {
    run();
  }
}
