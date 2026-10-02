import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/posts";

// 搜索索引按需加载，且仅返回检索字段，避免扩大 /blog 的 RSC payload。
export const revalidate = 60;

export async function GET() {
  const index = await getSearchIndex();
  return NextResponse.json(index);
}
