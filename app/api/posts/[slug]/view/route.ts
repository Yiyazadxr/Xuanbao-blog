import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { incrementViewCount } from "@/lib/posts";
import { recordRead } from "@/lib/reading";

// ISR 页面在客户端上报浏览；同一 SPA 会话去重，失败不影响页面。
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
