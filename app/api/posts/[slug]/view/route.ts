import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { incrementViewCount } from "@/lib/posts";
import { recordRead } from "@/lib/reading";

// 浏览埋点：文章页 ISR 化后由客户端挂载时上报一次（同一 SPA 会话内去重）。
// 浏览量 +1 与阅读记录（登录用户）都在这里完成，失败不影响页面。
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const postId =
    body && typeof body === "object" && typeof (body as { postId?: unknown }).postId === "string"
      ? (body as { postId: string }).postId
      : null;
  if (!postId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const wordCountRaw = (body as { wordCount?: unknown }).wordCount;
  const wordCount = typeof wordCountRaw === "number" ? wordCountRaw : null;

  const user = await getCurrentUser();
  await Promise.all([incrementViewCount(postId), recordRead(postId, user?.id, wordCount)]);
  return NextResponse.json({ ok: true });
}
