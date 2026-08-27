// 种子数据：默认分类、示例文章、博主 ADMIN 账号
// 运行方式：npx prisma db seed（配置见 prisma.config.ts）
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. 博主 SUPER_ADMIN 账号（邮箱/密码从 .env 读取；昵称可在个人资料里修改）
  // 邮箱统一小写：登录时 authorize 会把输入转小写查库，此处必须一致
  const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    // 已存在则确保处于已激活状态（历史数据/迁移后可能 activatedAt 为 null）
    update: { activatedAt: new Date(), disabled: false },
    create: {
      name: "暄宝xr",
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: "SUPER_ADMIN",
      activatedAt: new Date(),
    },
  });
  console.log(`✔ 管理员账号：${adminEmail}（密码见 .env 的 ADMIN_PASSWORD）`);

  // 2. 默认分类
  const categories = [
    { name: "技术", slug: "tech", description: "编程与技术分享" },
    { name: "生活", slug: "life", description: "日常生活记录" },
    { name: "随笔", slug: "essay", description: "随想与感悟" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`✔ 默认分类：${categories.map((c) => c.name).join("、")}`);

  // 3. 默认标签
  const tags = [
    { name: "Next.js", slug: "nextjs" },
    { name: "前端", slug: "frontend" },
    { name: "碎碎念", slug: "murmur" },
  ];
  for (const t of tags) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t });
  }

  // 4. 示例文章
  const tech = await prisma.category.findUnique({ where: { slug: "tech" } });
  const essay = await prisma.category.findUnique({ where: { slug: "essay" } });

  const posts = [
    {
      title: "你好，世界：博客开张了",
      slug: "hello-world",
      excerpt: "这是本博客的第一篇文章，记录建站的开始。",
      content: `# 你好，世界\n\n欢迎来到 **暄宝xr 的博客**！这是用 Next.js 全栈重建后的第一篇文章。\n\n## 为什么要建这个博客\n\n- 记录学习与生活\n- 练习前端与全栈技术\n- 和大家交流\n\n## 技术栈\n\n\`\`\`ts\nconst stack = ["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "SQLite"];\nconsole.log("Powered by", stack.join(" + "));\n\`\`\`\n\n> 万事开头难，先把第一篇发出来。\n`,
      published: true,
      featured: true,
      categoryId: essay?.id,
      tagSlugs: ["murmur"],
    },
    {
      title: "用 Next.js + Prisma 搭建博客的记录",
      slug: "build-blog-with-nextjs",
      excerpt: "从零开始用 Next.js App Router、Prisma 和 SQLite 搭建个人博客的过程记录。",
      content: `# 用 Next.js + Prisma 搭建博客\n\n本文记录搭建过程中的关键步骤。\n\n## 初始化项目\n\n\`\`\`bash\npnpm create next-app@latest my-blog --typescript --tailwind --app\n\`\`\`\n\n## 定义数据模型\n\n\`\`\`prisma\nmodel Post {\n  id    String @id @default(cuid())\n  title String\n  slug  String @unique\n}\n\`\`\`\n\n## 小结\n\n1. App Router 的 Server Components 很适合博客\n2. Prisma Studio 调试数据非常方便\n3. 遇到问题先看官方文档\n`,
      published: true,
      featured: false,
      categoryId: tech?.id,
      tagSlugs: ["nextjs", "frontend"],
    },
    {
      title: "一篇还没写完的草稿",
      slug: "draft-example",
      excerpt: "这是一篇草稿，前台不应该看到它。",
      content: "# 草稿\n\n这篇文章还在写……（用于验证草稿在前台不可见）\n",
      published: false,
      featured: false,
      categoryId: essay?.id,
      tagSlugs: [],
    },
  ];

  for (const p of posts) {
    const { tagSlugs, ...data } = p;
    const post = await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...data, authorId: admin.id },
    });
    for (const slug of tagSlugs) {
      const tag = await prisma.tag.findUnique({ where: { slug } });
      if (tag) {
        await prisma.postTag.upsert({
          where: { postId_tagId: { postId: post.id, tagId: tag.id } },
          update: {},
          create: { postId: post.id, tagId: tag.id },
        });
      }
    }
  }
  console.log(`✔ 示例文章：${posts.length} 篇（含 1 篇草稿）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
