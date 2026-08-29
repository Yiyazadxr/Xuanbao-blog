// 回填文章 wordCount：为已存在但 wordCount 为 null 的文章计算纯文字字数
// 运行：npx tsx scripts/backfill-wordcount.ts
import "dotenv/config";
import { countWords } from "../lib/utils";
import { prisma } from "../lib/prisma";

async function main() {
  const posts = await prisma.post.findMany({
    where: { wordCount: null },
    select: { id: true, title: true, content: true },
  });

  if (posts.length === 0) {
    console.log("没有需要回填的文章（所有文章都已有 wordCount）");
    await prisma.$disconnect();
    return;
  }

  console.log(`将回填 ${posts.length} 篇文章的 wordCount…`);

  for (const post of posts) {
    const wordCount = countWords(post.content ?? "");
    await prisma.post.update({
      where: { id: post.id },
      data: { wordCount },
    });
    console.log(`  ✅ ${post.title} -> ${wordCount} 字`);
  }

  console.log("回填完成");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
