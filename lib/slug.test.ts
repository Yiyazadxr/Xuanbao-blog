import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("英文标题转 kebab-case", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("中文标题转拼音", () => {
    expect(slugify("我的第一篇文章")).toBe("wo-de-di-yi-pian-wen-zhang");
  });

  it("中英混排只保留 ASCII", () => {
    expect(slugify("Next.js 16 全栈")).toBe("next-js-16-quan-zhan");
    expect(slugify("iPhone 中文")).toBe("iphone-zhong-wen");
  });

  it("结果不含中文", () => {
    expect(slugify("你好 世界")).toMatch(/^[\w-]+$/);
    expect(slugify("你好 世界")).toBe("ni-hao-shi-jie");
  });

  it("空标题回落到 post- 前缀", () => {
    expect(slugify("   ")).toMatch(/^post-/);
  });
});
