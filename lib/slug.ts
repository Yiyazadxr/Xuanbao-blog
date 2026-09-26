import { pinyin } from "pinyin-pro";

// 标题转 URL slug：中文转拼音，其余保留字母数字，输出只含小写字母、数字、下划线与连字符。
export function slugify(title: string): string {
  const base = pinyin(title, { toneType: "none", type: "array", nonZh: "consecutive" })
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `post-${Date.now().toString(36)}`;
}
