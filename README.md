# 暄宝xr 的博客

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Content: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

用 Next.js 全栈从零搭建的中文个人博客。深色沉浸式首页、文章系统、邀请码制用户体系、评论与点赞、完整后台管理。

## 技术栈

- **框架**：Next.js（App Router）+ TypeScript + React
- **样式**：Tailwind CSS v4（主题色板集中在 `app/globals.css` 的 CSS 变量）
- **动效**：framer-motion + Lenis 平滑滚动 + React Three Fiber 粒子场
- **数据**：Prisma 7 + SQLite（本地）→ 未来可一行迁移 Neon/Postgres
- **认证**：Auth.js v5（邮箱密码 Credentials + JWT session）
- **Markdown**：react-markdown + remark-gfm + rehype-highlight；后台编辑器 @uiw/react-md-editor

## 本地运行

```bash
pnpm install               # 安装依赖
cp .env.example .env       # 复制环境变量模板并按注释填写
npx prisma migrate dev     # 初始化数据库
npx prisma db seed         # 填充种子数据（默认分类 + 示例文章 + 管理员账号）
pnpm dev                   # 启动开发服务器 → http://localhost:3000
```

超级管理员账号来自 `.env` 的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`（种子脚本创建，角色为 SUPER_ADMIN）。

常用命令：

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 开发服务器 |
| `pnpm build && pnpm start` | 生产构建与启动 |
| `npx prisma studio` | 可视化查看/编辑数据库 |
| `npx tsx scripts/test-invites.ts` | 邀请码逻辑自测 |

## 功能地图

- `/` 沉浸式首页（粒子场 Hero + 精选/最新文章 + 分类入口）
- `/blog` 文章列表（分页、搜索 `?q=`）；`/blog/[slug]` 详情（TOC、阅读进度、点赞、评论、上下篇）
- `/blog/category/[slug]`、`/blog/tag/[slug]`、`/blog/archive` 分类/标签/归档
- `/social`、`/tools`、`/about` 内容页（数据在 `lib/constants.ts` 配置）
- `/register` 邀请码制注册：提交申请 → 博主邮箱收到通知 → 后台发邀请码 → 凭码注册
- `/admin` 后台：仪表盘、文章 CRUD（Markdown 编辑器）、评论审核、申请与邀请码管理
- `/feed.xml` RSS、`/sitemap.xml`、`/robots.txt`

## 内容配置

- **站名/描述/正式域名**：`lib/constants.ts` 的 `SITE`（部署后记得改 `url`）
- **主色调**：`app/globals.css` 顶部的 CSS 变量，一处修改全站生效
- **社交链接/友链/工具/技能/时间线**：`lib/constants.ts`

## 部署到 Vercel（未来）

1. 数据库换成 [Neon](https://neon.tech)：修改 `prisma/schema.prisma` 的 `provider = "postgresql"`，`.env` 换连接串，重新 `prisma migrate dev`
2. 移除 `@prisma/adapter-better-sqlite3`，`lib/prisma.ts` 改用 Neon adapter
3. Vercel 环境变量填入 `.env` 中的全部键值
4. `lib/constants.ts` 的 `SITE.url` 改为正式域名

## 许可

本项目对代码与内容采用不同的授权方式，完整说明见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。

- **源代码**：[MIT](./LICENSE) © 2026-present Yiyazadr — 可自由使用、修改、商用与再分发，须保留版权与许可声明。
- **文章与图片等内容**：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — 署名、非商业、相同方式共享；**商业使用须事先取得授权**。
- **品牌名称与标识**（「暄宝xr」「Xuanbao」「Xuanbao.dev」及 Logo）：不在开源许可范围内，**不得用作品牌名称或暗示背书**，详见 [NOTICE](./NOTICE)。
- **第三方资源**：字体（Space Grotesk、Geist Mono，SIL OFL 1.1）、图标（Phosphor，MIT）与各依赖的许可信息见 [NOTICE](./NOTICE)。

商用授权或其他授权事宜请联系：412110785@qq.com
