// 通用工具函数

// 日期格式化：2026 年 7 月 17 日
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前（超过 30 天回落绝对日期）
export function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return formatDate(date);
}

// 阅读时长估算：中文约 400 字/分钟，英文约 200 词/分钟
export function readingTime(content: string): number {
  const cjkCount = (content.match(/[一-鿿]/g) ?? []).length;
  const wordCount = content
    .replace(/[一-鿿]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(cjkCount / 400 + wordCount / 200));
}

// 从 Markdown 正文提取纯文本摘要（无手动摘要时兜底用）
export function plainExcerpt(markdown: string, maxLength = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, "") // 代码块
    .replace(/!\[.*?\]\(.*?\)/g, "") // 图片
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // 链接保留文字
    .replace(/[#>*`_~\-|]/g, "") // Markdown 符号
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

// 标题转 URL slug（后台新建文章时用）
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `post-${Date.now().toString(36)}`;
}
