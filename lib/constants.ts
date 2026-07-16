// 站点全局配置常量
export const SITE = {
  name: "暄宝xr的博客",
  shortName: "暄宝xr",
  description: "暄宝xr的个人博客——记录技术、生活与一切让我着迷的东西。",
  url: "http://localhost:3000", // 部署后替换为正式域名
};

// 顶部导航栏目
export const NAV_LINKS = [
  { label: "首页", href: "/" },
  { label: "文章", href: "/blog" },
  { label: "社交", href: "/social" },
  { label: "工具", href: "/tools" },
  { label: "关于作者", href: "/about" },
] as const;
