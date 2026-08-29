// 种子数据：默认分类、示例文章、博主 ADMIN 账号
// 运行方式：npx prisma db seed（配置见 prisma.config.ts）
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { countWords } from "../lib/utils";
import { DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 环境变量校验：未配置时给出明确报错而非 TypeError
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("请在 .env 中配置 ADMIN_EMAIL 和 ADMIN_PASSWORD 后再运行 seed");
  }

  // 1. 博主 SUPER_ADMIN 账号（邮箱/密码从 .env 读取；昵称可在个人资料里修改）
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

  console.log("✅ 博主管理员账号:", admin.email);

  // 2. 默认分类
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

  // 3. 示例文章（仅首次创建）
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
      },
    });
    console.log("✅ 示例文章:", post.title);
  } else {
    console.log("ℹ️ 示例文章已存在，跳过");
  }

  // 4. 默认角色权限配置（复用 lib/permissions 常量，保证种子数据与运行时校验一致）
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
