import { after } from "next/server";

// 收尾任务绑定 Next 请求生命周期；无请求上下文时退回 fire-and-forget。
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
