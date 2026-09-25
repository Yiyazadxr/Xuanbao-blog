// 为存量文章回填 searchText，否则搜索只能命中标题和摘要。
// 运行：npx tsx scripts/backfill-search-text.ts
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { buildSearchText } from "../lib/utils";

const BATCH_SIZE = 100;

async function main() {
  // 一次取出后分批更新，避免空结果持续匹配 where。
  const targets = await prisma.post.findMany({
    where: { searchText: null },
    select: { id: true, title: true, content: true },
  });

  if (targets.length === 0) {
    console.log("没有需要回填的文章（所有文章都已有 searchText）");
    await prisma.$disconnect();
    return;
  }

  let total = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((p) =>
        prisma.post.update({
          where: { id: p.id },
          data: { searchText: buildSearchText(p.content ?? "") },
        })
      )
    );
    for (const p of batch) {
      console.log(`  ✅ ${p.title}`);
    }
    total += batch.length;
  }

  console.log(`回填完成，共 ${total} 篇`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
