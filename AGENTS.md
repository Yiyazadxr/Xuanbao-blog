<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 项目规范

个人博客由全栈 Next.js 开发。以下规范与教训请严格遵守。

## 技术栈

- Next.js 16（App Router + Turbopack）、React 19、TypeScript、Tailwind CSS v4
- Prisma 7 + PostgreSQL（兼容 Neon，`@prisma/adapter-pg` + `pg`；本地与生产使用同一 PostgreSQL）、Auth.js v5（JWT）
- 包管理 pnpm（`pnpm-lock.yaml`）；脚本可用 `npm run` 或 `pnpm run`
- next-themes（.dark class）、framer-motion（LazyMotion + `m` 按需加载）、@iconify/react（`ph:` 前缀 Phosphor 图标，离线预注册）、fuse.js（客户端搜索）、zod（输入校验）

## 常用命令

- `npm run dev` / `npm run build` / `npm run lint`
- schema 变更后**必须** `npx prisma generate`（客户端输出到自定义 `lib/generated/prisma`）
- 迁移：`npx prisma migrate dev --name X`（本地 additive）；`npm run db:deploy`（生产）
- `npm run db:seed`（重建种子数据）
- 依赖审计：`pnpm audit --registry https://registry.npmjs.org`（**npm audit 不可用**，本机默认源 npmmirror 不支持 audit）
- 依赖审计结论（已核实，勿重复排查）：socket.dev 报告的 High/Medium CVE 均**不可在生产利用**——postcss/nanoid 等属构建期依赖；fast-uri/hono/valibot/deepmerge-ts/brace-expansion/js-yaml 等全部来自 `prisma` CLI 或 `eslint` 开发工具链，不进生产运行时。@auth/core / @prisma/client 的「高混淆分」是原生模块与打包产物的误报。数据库驱动为 `pg` + `@prisma/adapter-pg`。next@16.2.11 为本项目锁定定制版，勿因分数低而升级。

## 关键约束

- **Server Action 三段式**：先 `requirePermission(具体权限)` → 再 Zod 校验输入（`lib/validation.ts` 的 `parseInput`/`parseId`）→ 处理。不要直接信任客户端入参。
- **权限**：9 项权限（含 `mute_users`）定义在 `lib/permissions.ts`；角色/权限必须从 DB 实时读（`getFreshUser`），不要信任 JWT 里的 role。已移除 `requireAdmin`/`requireSuperAdmin`，新增权限只在 `lib/permissions.ts` 加（零迁移）。
- **.env 已 gitignore**，绝不提交密钥（AUTH_SECRET、SMTP_PASS、HCAPTCHA_SECRET_KEY 等）。带 `NEXT_PUBLIC_` 的会打进前端，密钥绝不能加该前缀。
- **纯常量与 DB 查询分离**：`lib/permissions.ts`（纯，客户端可 import）与 `lib/permissions-server.ts`（依赖 prisma，仅服务端）分开。客户端组件禁止 import `lib/prisma`（依赖 Prisma 生成客户端与 `@prisma/adapter-pg`，属 Node-only，会拖垮浏览器打包）。
- **生产错误**：用 `unstable_retry`（不是已弃用的 `reset`）；不向用户展示 `error.message`/堆栈，用通用文案 + `error.digest`。
- **限流**：`lib/rate-limit.ts` 是 DB 表实现（多实例共享），登录按邮箱+IP、注册/申请按 IP。
- **hCaptcha**：前端 `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`、服务端 `HCAPTCHA_SECRET_KEY`；未配置时自动降级放行。
- **防 XSS**：Markdown 用 react-markdown 渲染，禁止 rehype-raw / dangerouslySetInnerHTML。

## 前后一致

- **共享契约集中在 `lib/`**：客户端与服务端共用的类型、schema、常量（如 `PostListItem`、`Permission`、`NotificationData`、`lib/validation.ts` 的 Zod schema）只定义一份，两端 import 同一来源，禁止各写一份造成割裂。
- **改一端必须同步另一端**：Server Action 的入参/返回值变更时，同步更新所有客户端调用方（曾因 `savePost` 由 `PostPayload` 改为 `unknown` 漏改 `PostEditor` 导致割裂）。
- **纯常量与 DB 查询分离但须一致**：`lib/permissions.ts`（纯）与 `lib/permissions-server.ts`（DB）的权限定义必须一一对应；新增权限同时更新两处。
- **复用而非重写**：权限判断、日期/相对时间格式化、slugify 等统一走 `lib/`，前端不得重复实现服务端已有逻辑，保证行为一致。

## 邮件与通知

- **邮件（QQ SMTP）仅用于注册流程**：审核通过后向申请者发送登录凭据（登录邮箱 + 初始密码，`lib/mail.ts` 的 `sendMail`）。未配置 SMTP 时返回 `false` 不发送（非生产环境仅打印收件人与主题，正文含密码绝不入日志）。
- **其余一切通知走站内通知中心**（`lib/notifications.ts` + `components/layout/NotificationBell.tsx`）：新评论/回复/申请 → 通知管理员；评论通过 → 通知作者；回复通过 → 通知被回复者。通知超 7 天或超 200 条自动清理（创建时惰性清理）。

## React Compiler 规则

- 禁止在 `useEffect` 体内**同步**调用 setState（含调用内部有 setState 的函数）。改用 `.then()` 回调或异步后置。真实需同步外部系统（如 localStorage 恢复草稿）时用块级 `/* eslint-disable react-hooks/set-state-in-effect */`。
- 禁止在**渲染期间**读写/修改 ref（`react-hooks/refs`）。ref 的读写放到 effect 或事件处理器。
- `useSyncExternalStore` 用于挂载检测（SSR false / 客户端 true），避免水合不一致。

## 提交规范

- Conventional Commits + 中文：`feat/fix/perf/chore/refactor: 标题 - 要点摘要（用 + 连接）`，body 用 `- ` 列表。
- **未经用户明确指示，不要 commit 或 push。**

## 目录与架构

- `lib/`：数据层与纯工具（posts/comments/likes/bookmarks/reading/invites/notifications/stats/daily-stats/rss/validation/rate-limit/permissions/permissions-server/mail/hcaptcha/image-storage/image-type/display/profile/mute/legal/metadata/chart/poems/utils/markdown/motion/deferred 等）
- `app/(blog)/(admin)/(auth)/`：路由组；`app/**/actions.ts` 为 `"use server"` Server Actions
- `components/`：`ui/`（通用）、`admin/`（后台）、`admin/charts/`（看板图表）、`layout/`（Header/Footer/Sidebar/NotificationBell）、`blog/`、`home/`、`comments/`、`notifications/`、`settings/`，根级 `Providers.tsx`/`SmoothScroll.tsx`
- **统计看板**：图表全部为纯 SVG + HTML 覆盖层自绘（`components/admin/charts/`，零图表库依赖）；配色与系列定义集中在 `lib/chart.ts`，图例与曲线同源。浏览量按天来自 `DailyViewStat`（文章 `viewCount` 只是累计值，无时间维度，埋点在 `incrementViewCount` 内）；评论/点赞/注册自带 `createdAt`，由 `lib/stats.ts` 按天分桶推算，勿重复入表。日键统一东八区（`lib/daily-stats.ts`）。
- 主题色集中在 `app/globals.css` 的 `:root` / `.dark` CSS 变量，经 `@theme inline` 映射为 Tailwind 颜色；暗色判定用 next-themes `useTheme`
- 后台分页/批量在服务端取数 + 客户端交互；公开列表页与文章详情页用 ISR（`revalidate = 60`），分类/标签/系列页配 `generateStaticParams`

## 角色体系

SUPER_ADMIN（超级管理员，全权限锁定）> ADMIN（管理员）> MEMBER（成员）> 游客（未登录）。后台入口 `canAccessAdmin`（ADMIN/SUPER_ADMIN），具体操作再按权限细分。
