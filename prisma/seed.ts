// 种子数据：默认分类、示例文章、博主 SUPER_ADMIN 账号
// 运行方式：npx prisma db seed（配置见 prisma.config.ts）
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { buildSearchText, countWords } from "../lib/utils";
import { DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 缺少环境变量时抛出明确错误。
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("请在 .env 中配置 ADMIN_EMAIL 和 ADMIN_PASSWORD 后再运行 seed");
  }

  // 博主 SUPER_ADMIN 账号；凭据来自 .env。
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    // 种子账号始终保持激活。
    update: { activatedAt: new Date(), disabled: false },
    create: {
      name: "暄宝xr",
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: "SUPER_ADMIN",
      activatedAt: new Date(),
    },
  });

  console.log("✅ 博主管理员账号:", admin.email);

  const categories = [
    { name: "生活", slug: "life" },
    { name: "技术", slug: "tech" },
    { name: "设计", slug: "design" },
    { name: "随笔", slug: "essay" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug },
    });
  }
  console.log("✅ 默认分类:", categories.map((c) => c.name).join(", "));

  // 示例文章仅首次创建。
  const existing = await prisma.post.findFirst({ where: { slug: "hello-world" } });
  if (!existing) {
    const tech = await prisma.category.findUnique({ where: { slug: "tech" } });
    const content = "这是我的第一篇博客文章。欢迎来到暄宝xr的个人博客！\n\n在这里，我会分享关于技术、设计和生活的思考。";
    const post = await prisma.post.create({
      data: {
        title: "Hello World",
        slug: "hello-world",
        content,
        excerpt: "欢迎来到暄宝xr的个人博客！",
        published: true,
        publishedAt: new Date(),
        authorId: admin.id,
        categoryId: tech?.id ?? null,
        wordCount: countWords(content),
        searchText: buildSearchText(content),
      },
    });
    console.log("✅ 示例文章:", post.title);
  } else {
    console.log("ℹ️ 示例文章已存在，跳过");
  }

  // 角色权限与运行时共用 lib/permissions 常量。
  const rolePermissions = [
    { role: "ADMIN", permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN },
    { role: "MEMBER", permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER },
  ];
  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { role: rp.role },
      update: {},
      create: { role: rp.role, permissions: JSON.stringify(rp.permissions) },
    });
  }
  console.log("✅ 默认角色权限:", rolePermissions.map((r) => r.role).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
