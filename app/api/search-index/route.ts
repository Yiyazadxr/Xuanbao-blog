import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/posts";

// 搜索索引按需接口：客户端首次搜索时才拉取，避免把全站正文文本打进 /blog 的 RSC payload。
// createdAt 不参与搜索，这里只保留检索需要的字段以减小体积。
export const revalidate = 60;

export async function GET() {
  const index = await getSearchIndex();
  return NextResponse.json(
    index.map(({ slug, title, excerpt, text }) => ({ slug, title, excerpt, text }))
  );
}
