// 通用工具函数

// 日期格式化：2026 年 7 月 17 日
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
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
