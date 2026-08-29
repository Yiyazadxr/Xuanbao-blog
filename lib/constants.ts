// 站点全局配置常量
export const SITE = {
  name: "Xuanbao.dev",
  shortName: "暄宝xr",
  description: "暄宝xr的个人博客——记录技术、生活与一切让我着迷的东西。",
  // 生产环境通过 NEXT_PUBLIC_SITE_URL 注入正式域名，用于 sitemap/RSS/元数据
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // 建站日：用于页脚「运行 N 天」等叙事（2026-07-17）
  launchedAt: "2026-07-17",
};

// 联系方式（集中管理，避免散落硬编码）。
// 邮箱与 QQ 号仅在客户端组件中拼接渲染，不出现在 SSR HTML（见 EmailCard / QQCard）
export const CONTACT = {
  email: "412110785@qq.com",
  qq: "412110785",
} as const;

// 顶部导航栏目
export const NAV_LINKS = [
  { label: "首页", href: "/" },
  { label: "文章", href: "/blog" },
  { label: "社交", href: "/social" },
  { label: "工具", href: "/tools" },
  { label: "关于作者", href: "/about" },
] as const;

/* ===== 以下为内容配置：改这里即可更新对应页面 ===== */

// 社交链接（social 页 + 关于页使用）
// 注意：QQ 号 / 邮箱不在此列，改为客户端组件 QQCard / EmailCard 反爬取渲染
export const SOCIAL_LINKS = [
  {
    name: "GitHub",
    icon: "ph:github-logo-bold",
    url: "https://github.com/Yiyazadxr",
    description: "我的开源项目和代码",
  },
] as const;

// 友情链接（social 页使用）
export const FRIEND_LINKS: { name: string; url: string; description: string }[] = [
  // { name: "示例友链", url: "https://example.com", description: "一句话介绍" },
];

// 常用工具推荐（tools 页使用）
export const TOOLS = [
  {
    name: "VS Code",
    icon: "ph:code-bold",
    url: "https://code.visualstudio.com/",
    description: "主力代码编辑器，插件生态丰富",
  },
  {
    name: "Iconify",
    icon: "ph:palette-bold",
    url: "https://icon-sets.iconify.design/",
    description: "20 万+ 免费图标，本站图标都来自这里",
  },
  {
    name: "TinyPNG",
    icon: "ph:image-bold",
    url: "https://tinypng.com/",
    description: "在线图片压缩，博客配图必备",
  },
  {
    name: "Excalidraw",
    icon: "ph:pencil-line-bold",
    url: "https://excalidraw.com/",
    description: "手绘风格白板，画示意图很好看",
  },
] as const;

// 技能标签（about 页使用，按 基础 → 前端 → 桌面 → 移动 → 后端/运维 排序）
export const SKILLS = [
  "HTML / CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind CSS",
  "shadcn/ui",
  "Electron",
  "Kotlin",
  "Flutter",
  "Node.js",
  "Python",
  "Docker",
] as const;

// 时间线（about 页使用，从新到旧）
export const TIMELINE = [
  { time: "2026", title: "博客全站重构", description: "用 Next.js 全栈重写个人博客，就是你现在看到的这个网站" },
  { time: "2025", title: "开始搭建个人博客", description: "从纯手写 HTML/CSS 起步，迈出建站第一步" },
] as const;
