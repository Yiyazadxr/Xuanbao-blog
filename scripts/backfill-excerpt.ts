// 为存量文章回填 excerpt 和缺失的 wordCount。
// 运行：npx tsx scripts/backfill-excerpt.ts
import "dotenv/config";
import { plainExcerpt, countWords } from "../lib/utils";
import { prisma } from "../lib/prisma";

const BATCH_SIZE = 100;

async function main() {
  // 一次取出后分批更新，避免空正文或纯图片文章持续匹配 where。
  const targets = await prisma.post.findMany({
    where: { OR: [{ excerpt: null }, { excerpt: "" }] },
    select: { id: true, title: true, content: true, wordCount: true },
  });

  if (targets.length === 0) {
    console.log("没有需要回填的文章（所有文章都已有摘要）");
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
          data: {
            // 空结果存为 null，与列表展示口径一致。
            excerpt: plainExcerpt(p.content ?? "") || null,
            // 同时补齐缺失的字数。
            wordCount: p.wordCount ?? countWords(p.content ?? ""),
          },
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
