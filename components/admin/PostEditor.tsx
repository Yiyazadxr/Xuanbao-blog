"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useTransition } from "react";
import { savePost } from "@/app/(admin)/admin/actions";
import { errorCls, inputCls, labelCls, primaryBtnCls } from "@/components/ui/form-styles";
import { slugify } from "@/lib/utils";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

// Markdown 编辑器体积大且依赖浏览器 API，动态引入并关闭 SSR
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-border text-sm text-muted">
      编辑器加载中…
    </div>
  ),
});

type Category = { id: string; name: string };

type EditorPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  categoryId: string | null;
  published: boolean;
  pinned: boolean;
  featured: boolean;
  tags: { tag: { name: string } }[];
};

// 草稿自动保存：仅新建文章时生效，保存在 localStorage（浏览器崩溃/误关可恢复）
const DRAFT_KEY = "post-draft-v1";

// 文章编辑器：新建（post 为空）与编辑共用
export function PostEditor({ categories, post }: { categories: Category[]; post?: EditorPost }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [tags, setTags] = useState(post?.tags.map((t) => t.tag.name).join(", ") ?? "");
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [content, setContent] = useState(post?.content ?? "");
  const [error, setError] = useState("");
  const [autosaved, setAutosaved] = useState(false);

  // 新建文章时恢复上次的草稿（仅在客户端挂载时执行一次；从 localStorage 同步外部状态）
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (post) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<EditorPost> & { tags?: string };
      if (d.title) setTitle(d.title);
      if (d.slug) {
        setSlug(d.slug);
        setSlugTouched(true);
      }
      if (d.excerpt) setExcerpt(d.excerpt);
      if (d.categoryId) setCategoryId(d.categoryId);
      if (typeof d.tags === "string") setTags(d.tags);
      if (typeof d.pinned === "boolean") setPinned(d.pinned);
      if (typeof d.featured === "boolean") setFeatured(d.featured);
      if (d.content) setContent(d.content);
    } catch {
      // 忽略损坏的草稿
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // 自动保存草稿（防抖，仅新建文章时）
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (post) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title, slug, excerpt, categoryId, tags, pinned, featured, content })
        );
        setAutosaved(true);
      } catch {
        // 存储失败忽略
      }
    }, 800);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [title, slug, excerpt, categoryId, tags, pinned, featured, content, post]);

  function handleTitleChange(value: string) {
    setTitle(value);
    // slug 未被手动改过时跟随标题自动生成
    if (!slugTouched) setSlug(slugify(value));
  }

  function submit(published: boolean) {
    setError("");
    const payload = {
      id: post?.id,
      title,
      slug,
      content,
      excerpt,
      categoryId,
      tags,
      published,
      featured,
      pinned,
      archived: false,
    };
    startTransition(async () => {
      const result = await savePost(payload);
      if (result.ok) {
        localStorage.removeItem(DRAFT_KEY);
        router.push("/admin/posts");
        router.refresh();
      } else {
        setError(result.error ?? "保存失败");
      }
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className={errorCls}>
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="post-title" className={labelCls}>
            标题
          </label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="文章标题"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="post-slug" className={labelCls}>
            Slug（URL 标识）
          </label>
          <input
            id="post-slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="url-friendly-slug"
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="post-excerpt" className={labelCls}>
          摘要（选填，列表页展示）
        </label>
        <textarea
          id="post-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="不填则自动截取正文开头"
          className={`${inputCls} h-auto py-3`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="post-category" className={labelCls}>
            分类
          </label>
          <select
            id="post-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">（无分类）</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="post-tags" className={labelCls}>
            标签（逗号分隔）
          </label>
          <input
            id="post-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Next.js, 前端"
            className={inputCls}
          />
        </div>
      </div>

      <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
        <label className={labelCls}>正文（Markdown）</label>
        <MDEditor value={content} onChange={(v) => setContent(v ?? "")} height={420} />
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--accent)]"
          />
          置顶（列表页排最前）
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--accent)]"
          />
          设为精选（首页展示）
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(true)}
          className={`${primaryBtnCls} w-auto px-8`}
        >
          {pending ? "保存中…" : "发布"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(false)}
          className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-border px-8 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          存为草稿
        </button>
        {!post && autosaved && (
          <span className="text-xs text-muted">已自动保存草稿</span>
        )}
      </div>
    </div>
  );
}
