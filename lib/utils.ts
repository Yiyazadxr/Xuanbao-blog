// 通用工具函数

// 千分位计数（统计看板/页脚等处统一口径，两端同源）
export function formatCount(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString("zh-CN");
}

// 日期格式化：2026 年 7 月 17 日
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前（超过 30 天回落绝对日期）
export function formatRelativeTime(date: Date | string): string {
  // 未来时间（时钟漂移 / 预发布内容）钳到 0，避免负数导致显示成「刚刚」
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return formatDate(date);
}

// 统计中文字符数 + 英文/数字词数（去除 Markdown 符号/标点）。
// countWords 与 readingTime 共用此计数，保证口径一致（复用而非重写）。
// 用 Unicode 脚本属性替代字面量区间
// 扩展 B~G 区汉字、日文假名、韩文谚文全部漏计（且会被整段粘成一个词）
const CJK_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

function countCjkAndWords(content: string): { cjk: number; words: number } {
  const cjk = (content.match(CJK_RE) ?? []).length;
  const words = content
    .replace(CJK_RE, " ") // CJK 逐字计数，替换为空格避免被连拼
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // 剔除 Markdown 符号/标点（保留字母数字与空白）
    .split(/\s+/)
    .filter(Boolean).length;
  return { cjk, words };
}

// 纯文字字数：数中文字符 + 英文单词，供文章 wordCount 与页脚「合记 N 字」使用
export function countWords(content: string): number {
  const { cjk, words } = countCjkAndWords(content);
  return cjk + words;
}

// 阅读时长估算：按纯文字字数统一折算（中文约 400 字/分钟，英文词并入字数同口径）。
// 列表页不回读正文只能用落库的 wordCount，详情页也从同一函数折算，保证两端读数一致。
export function readingTimeFromWordCount(wordCount: number | null | undefined): number {
  if (!wordCount || wordCount <= 0) return 1;
  return Math.max(1, Math.round(wordCount / 400));
}

// 阅读时长（从正文折算）：与 readingTimeFromWordCount 同源，避免口径分裂
export function readingTime(content: string): number {
  return readingTimeFromWordCount(countWords(content));
}

// 从 Markdown 正文提取纯文本（去掉代码块/图片/链接/Markdown 符号）
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "") // 代码块
    .replace(/!\[.*?\]\(.*?\)/g, "") // 图片
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // 链接保留文字
    .replace(/[#>*`_~\-|]/g, "") // Markdown 符号
    .replace(/\s+/g, " ")
    .trim();
}

// 从 Markdown 正文提取纯文本摘要（无手动摘要时兜底用）
export function plainExcerpt(markdown: string, maxLength = 120): string {
  const text = markdownToText(markdown);
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

// 从正文纯文本中截取命中关键词前后的片段（全文搜索下拉展示用）；
// 关键词未精确命中（如 Fuse 模糊匹配到标题）时返回 null，由调用方回退到摘要
export function searchSnippet(text: string, query: string, radius = 40): string | null {
  const q = query.trim();
  if (!q || !text) return null;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

// 在标题中定位关键词首次出现位置，返回前/中/后三段（用于高亮渲染）；未命中返回 null
export function findTitleMatch(
  title: string,
  query: string
): { before: string; match: string; after: string } | null {
  const q = query.trim();
  if (!q) return null;
  const idx = title.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return null;
  return {
    before: title.slice(0, idx),
    match: title.slice(idx, idx + q.length),
    after: title.slice(idx + q.length),
  };
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
