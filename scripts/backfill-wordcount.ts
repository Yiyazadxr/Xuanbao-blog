// 回填文章 wordCount：为已存在但 wordCount 为 null 的文章计算纯文字字数
// 运行：npx tsx scripts/backfill-wordcount.ts
import "dotenv/config";
import { countWords } from "../lib/utils";
import { prisma } from "../lib/prisma";

const BATCH_SIZE = 100;

async function main() {
  let total = 0;
  for (;;) {
    const posts = await prisma.post.findMany({
      where: { wordCount: null },
      select: { id: true, title: true, content: true },
      take: BATCH_SIZE,
    });
    if (posts.length === 0) break;

    console.log(`回填第 ${total + 1}-${total + posts.length} 篇…`);
    await prisma.$transaction(
      posts.map((p) =>
        prisma.post.update({
          where: { id: p.id },
          data: { wordCount: countWords(p.content ?? "") },
        })
      )
    );
    for (const p of posts) {
      console.log(`  ✅ ${p.title} -> ${countWords(p.content ?? "")} 字`);
    }
    total += posts.length;
  }

  if (total === 0) {
    console.log("没有需要回填的文章（所有文章都已有 wordCount）");
  } else {
    console.log(`回填完成，共 ${total} 篇`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
