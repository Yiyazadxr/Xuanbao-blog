// Markdown 相关工具：目录（TOC）提取
import GithubSlugger from "github-slugger";

export type TocItem = { id: string; text: string; level: number };

// 从 Markdown 提取 h2/h3 生成目录；slug 算法与 rehype-slug 一致（github-slugger）
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const items: TocItem[] = [];
  for (const line of withoutCode.split("\n")) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const text = match[2].replace(/[*_`~]/g, "").trim();
    items.push({ id: slugger.slug(text), text, level: match[1].length });
  }
  return items;
}
