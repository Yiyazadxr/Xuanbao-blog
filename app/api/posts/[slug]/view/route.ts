import { NextResponse } from "next/server";
import { getFreshUser } from "@/lib/auth";
import { incrementViewCount } from "@/lib/posts";
import { recordRead } from "@/lib/reading";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { parseInput, postViewSchema } from "@/lib/validation";
import { createHash } from "node:crypto";

// ISR 页面在客户端上报浏览；同一 SPA 会话去重，失败不影响页面。
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // 浏览量不需要跨站上报。拒绝浏览器跨站请求，但不把 Origin 当作反机器人凭据。
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(req.url).origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // 流式限制实际字节数，不能仅信任 Content-Length。
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { body = null; }
  const parsed = parseInput(postViewSchema, body);
  if (!parsed.data) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { slug } = await params;
  if (!slug || slug.length > 200) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ip = await getClientIp();
  // 无可信地址时跳过可选统计，不让 unknown 共享桶影响正常业务。
  if (ip === "unknown") return NextResponse.json({ ok: true });
  const key = createHash("sha256").update(ip).digest("hex");
  const pre = await rateLimit.isBlocked("view-ip", key, 30);
  const check = pre.blocked ? pre : await rateLimit.checkAndHit("view-ip", key, 30, 60_000);
  if (check.blocked) return NextResponse.json({ error: "rate_limited" }, {
    status: 429, headers: { "Retry-After": String(check.retryAfterSec) },
  });
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, slug, published: true, archived: false },
    select: { id: true, wordCount: true },
  });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const dedupKey = `${key}:${post.id}`;
  const seen = await rateLimit.isBlocked("view-post", dedupKey, 0);
  if (seen.blocked) return NextResponse.json({ ok: true });
  const claimed = await rateLimit.checkAndHit("view-post", dedupKey, 1, 30 * 60_000);
  if (claimed.blocked) return NextResponse.json({ ok: true });
  if (!(await incrementViewCount(post.id))) return NextResponse.json({ ok: true });
  const user = await getFreshUser();
  await recordRead(post.id, user?.id, post.wordCount);
  return NextResponse.json({ ok: true });
}
