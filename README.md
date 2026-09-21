# 暄宝xr 的博客

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Content: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

用 Next.js 全栈从零搭建的中文个人博客。沉浸式首页、文章系统、邀请制用户体系、评论与点赞收藏、站内通知、完整后台管理与数据看板。

## 技术栈

- **框架**：Next.js 16（App Router + Turbopack）+ React 19 + TypeScript
- **样式**：Tailwind CSS v4 + @tailwindcss/typography（主题色板集中在 `app/globals.css` 的 CSS 变量，`@theme inline` 映射为 Tailwind 颜色）
- **动效**：framer-motion（LazyMotion + `m` 按需加载）+ Lenis 平滑滚动 + 自绘 Canvas 水墨（远山/墨迹，无 3D 库依赖）
- **数据**：Prisma 7 + PostgreSQL（兼容 Neon）+ `@prisma/adapter-pg`
- **认证**：Auth.js v5（邮箱密码 Credentials + JWT Session）
- **Markdown**：react-markdown + remark-gfm + rehype-highlight + rehype-slug；后台编辑器 @uiw/react-md-editor
- **搜索**：fuse.js（客户端就地过滤，检索索引经 `/api/search-index` 首次输入时按需拉取）
- **图标**：@iconify/react + Phosphor（离线预注册，仅打包用到的图标）
- **其他**：zod 输入校验、hCaptcha 人机验证、Vercel Blob 图片存储（开发回退本地 `public/uploads`）、Vercel Analytics / Speed Insights；看板图表为纯 SVG 自绘

## 本地运行

需要可用的 PostgreSQL（本地实例或 [Neon](https://neon.tech) 等托管服务）。

```bash
pnpm install                # 安装依赖
cp .env.example .env        # 复制环境变量模板并按注释填写（至少 DATABASE_URL、AUTH_SECRET）
npx prisma migrate dev      # 初始化数据库结构
npm run db:seed             # 填充种子数据（默认分类 + 示例文章 + 管理员账号）
npm run dev                 # 启动开发服务器 → http://localhost:3000
```

超级管理员账号来自 `.env` 的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`（种子脚本创建，角色为 SUPER_ADMIN）。

## 常用命令

| 命令 | 用途 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm start` | 生产构建 / 启动 |
| `npm run lint` | ESLint 检查 |
| `npm test` / `npm run test:watch` | Vitest 单元测试（单次 / 监听） |
| `npm run db:seed` | 重建种子数据 |
| `npm run db:deploy` | 生产迁移（`prisma migrate deploy`） |
| `npx prisma studio` | 可视化查看/编辑数据库 |
| `npx tsx scripts/test-invites.ts` | 邀请码逻辑自测 |
| `npx tsx scripts/backfill-*.ts` | 历史数据回填（字数 / 搜索文本 / 摘要） |

> schema 变更后必须执行 `npx prisma generate`（客户端输出到自定义目录 `lib/generated/prisma`）。

## 功能地图

**公开页面**

- `/` 首页：渐变光斑 Hero、精选/最新文章、侧栏分类与标签
- `/blog` 文章列表：就地模糊搜索（索引按需拉取）、分页、归档入口
- `/blog/[slug]` 详情（ISR 缓存）：TOC、阅读进度、点赞/收藏/分享、上下篇与系列导航、评论区、相关阅读；浏览量与阅读记录由客户端埋点上报
- `/blog/category/[slug]`、`/blog/tag/[slug]`、`/blog/series/[slug]`、`/blog/archive` 分类 / 标签 / 系列 / 归档
- `/bookmarks` 我的收藏、`/notifications` 站内通知中心、`/settings` 个人资料与显示偏好
- `/social`、`/tools`、`/about`、`/privacy`、`/terms` 内容与信息页
- `/feed.xml`（全站）及 `/feed.xml/category|tag|series/[slug]`、`/sitemap.xml`、`/robots.txt`、`/opengraph-image`

**账号**

- `/register`：双通道注册 ①提交申请（审核通过后邮件发放登录凭据）②凭邀请码注册；`/login` 登录

**后台（`/admin`，按角色权限细分）**

- 仪表盘：近 N 天趋势、浏览量 / 评论 / 点赞 / 注册统计、热门文章、分类分布（纯 SVG 图表）
- 文章 CRUD（Markdown 编辑器）、版本历史与回滚、置顶 / 精选 / 归档 / 批量操作
- 评论审核、账号申请与邀请码管理、分类 / 系列 / 标签管理
- 用户管理（含禁言）、角色权限管理

## 目录结构

- `lib/`：数据层与纯工具（`posts`/`comments`/`likes`/`bookmarks`/`reading`/`invites`/`notifications`/`stats`/`daily-stats`/`validation`/`rate-limit`/`permissions`/`mail`/`hcaptcha`/`image-storage`/`markdown`/`motion` 等）
- `app/`：路由（路由组 `(blog)` / `(admin)` / `(auth)`）+ `app/**/actions.ts` Server Actions + `app/api/**` 路由处理器
- `components/`：`ui/`（通用）、`admin/`（后台，含 `charts/`）、`layout/`、`blog/`、`home/`、`comments/`、`notifications/`、`settings/`
- `prisma/`：`schema.prisma` + `migrations/` + `seed.ts`；`scripts/`：一次性脚本

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串（Neon 建议用 pooled 连接串） |
| `AUTH_SECRET` | Auth.js 密钥（`openssl rand -base64 32` 生成） |
| `AUTH_TRUST_HOST` | 自托管非标准 Host 时设为 `true`（默认关闭更安全） |
| `NEXT_PUBLIC_SITE_URL` | 正式域名，用于 sitemap / RSS / 元数据 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 种子脚本创建超级管理员 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | QQ 邮箱 SMTP，用于发放登录凭据的审核邮件（未配置则不发送） |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET_KEY` | hCaptcha 人机验证（未配置则跳过验证） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 图片存储（生产上传封面/头像必需） |

带 `NEXT_PUBLIC_` 前缀的值会打进前端产物，切勿用于密钥。

## 内容配置

- **站名 / 简介 / 建站日**：`lib/constants.ts` 的 `SITE`；**正式域名**通过环境变量 `NEXT_PUBLIC_SITE_URL` 注入
- **主色调**：`app/globals.css` 顶部的 CSS 变量，一处修改全站生效
- **社交链接 / 友链 / 工具 / 技能 / 时间线**：`lib/constants.ts`

## 部署到 Vercel

1. 创建 PostgreSQL（如 [Neon](https://neon.tech)），将 `DATABASE_URL` 指向 pooled 连接串
2. 导入本仓库；构建命令使用 `vercel-build`（`prisma migrate deploy && next build`）
3. 在项目环境变量中配置上表全部键值，并创建 Blob Store 以自动注入 `BLOB_READ_WRITE_TOKEN`
4. 将 `NEXT_PUBLIC_SITE_URL` 设为正式域名

## 许可

本项目对代码与内容采用不同的授权方式，完整说明见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。

- **源代码**：[MIT](./LICENSE) © 2026-present Yiyazadr — 可自由使用、修改、商用与再分发，须保留版权与许可声明。
- **文章与图片等内容**：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — 署名、非商业、相同方式共享；**商业使用须事先取得授权**。
- **品牌名称与标识**（「暄宝xr」「Xuanbao」「Xuanbao.dev」及 Logo）：不在开源许可范围内，**不得用作品牌名称或暗示背书**，详见 [NOTICE](./NOTICE)。
- **第三方资源**：字体（Space Grotesk、Geist Mono，SIL OFL 1.1）、图标（Phosphor，MIT）与各依赖的许可信息见 [NOTICE](./NOTICE)。

商用授权或其他授权事宜请联系：412110785@qq.com
