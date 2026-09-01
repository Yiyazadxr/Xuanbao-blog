// 回填文章摘要：为 excerpt 为空的文章按正文生成纯文本摘要
// 背景：文章列表查询已不再回读 content 全文，摘要与字数改为落库（excerpt / wordCount），
// 存量数据中未填摘要的文章需要补一次，否则列表页摘要为空。
// 运行：npx tsx scripts/backfill-excerpt.ts
import "dotenv/config";
import { plainExcerpt, countWords } from "../lib/utils";
import { prisma } from "../lib/prisma";

const BATCH_SIZE = 100;

async function main() {
  // 一次性取出所有待回填文章，再分批更新：避免依赖「处理后不再匹配 where」，
  // 否则空正文/纯图片文章经 plainExcerpt 仍返回空串，会永远匹配 where 导致死循环
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
            // 空结果归为 null，与列表查询 `row.excerpt ?? ""` 展示口径一致
            excerpt: plainExcerpt(p.content ?? "") || null,
            // 早期文章可能也没算过字数，顺带补齐
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
