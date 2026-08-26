"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCategory,
  createSeries,
  createTag,
  deleteCategory,
  deleteSeries,
  deleteTag,
  updateCategory,
  updateSeries,
  updateTag,
} from "@/app/(admin)/admin/taxonomy/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { errorCls, inputCls, labelCls, successCls } from "@/components/ui/form-styles";

type NamedItem = { id: string; name: string; slug: string; description: string | null; postCount: number };
type Tag = { id: string; name: string; slug: string; postCount: number };

type NamedActions = {
  create: (name: string, description?: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  update: (id: string, name: string, description?: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  remove: (id: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
};

// 分类/标签/系列管理：列表 + 新建 + 内联编辑 + 删除
export function TaxonomyManager({
  categories,
  tags,
  series,
}: {
  categories: NamedItem[];
  tags: Tag[];
  series: NamedItem[];
}) {
  return (
    <div className="space-y-12">
      <section aria-labelledby="category-heading">
        <h2 id="category-heading" className="text-lg font-bold">分类</h2>
        <NamedSection
          idPrefix="cat"
          title="分类"
          items={categories}
          createLabel="新建分类"
          emptyText="还没有分类"
          confirmText={(n) => `确定删除分类「${n}」吗？其下文章将变为无分类。`}
          actions={{ create: createCategory, update: updateCategory, remove: deleteCategory }}
        />
      </section>

      <section aria-labelledby="series-heading">
        <h2 id="series-heading" className="text-lg font-bold">系列 / 专题</h2>
        <NamedSection
          idPrefix="series"
          title="系列"
          items={series}
          createLabel="新建系列"
          emptyText="还没有系列"
          confirmText={(n) => `确定删除系列「${n}」吗？其下文章将变为无系列。`}
          actions={{ create: createSeries, update: updateSeries, remove: deleteSeries }}
        />
      </section>

      <section aria-labelledby="tag-heading">
        <h2 id="tag-heading" className="text-lg font-bold">标签</h2>
        <TagSection tags={tags} />
      </section>
    </div>
  );
}

function NamedSection({
  idPrefix,
  title,
  items,
  createLabel,
  emptyText,
  confirmText,
  actions,
}: {
  idPrefix: string;
  title: string;
  items: NamedItem[];
  createLabel: string;
  emptyText: string;
  confirmText: (name: string) => string;
  actions: NamedActions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await actions.create(name, description);
      setMsg({ ok: res.ok, text: res.message ?? res.error ?? "" });
      if (res.ok) {
        setName("");
        setDescription("");
        router.refresh();
      }
    });
  }

  function startEdit(c: NamedItem) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description ?? "");
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const res = await actions.update(id, editName, editDesc);
      setMsg({ ok: res.ok, text: res.message ?? res.error ?? "" });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-name`} className={labelCls}>名称</label>
          <input id={`${idPrefix}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="如：技术" className={inputCls} />
        </div>
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-desc`} className={labelCls}>描述（选填）</label>
          <input id={`${idPrefix}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话说明" className={inputCls} />
        </div>
        <button type="submit" disabled={pending || !name.trim()} className="h-11 shrink-0 cursor-pointer rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-50">
          {createLabel}
        </button>
      </form>

      {msg && <p className={`mt-3 ${msg.ok ? successCls : errorCls}`}>{msg.text}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                {editingId === c.id ? (
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} aria-label={`${title}名称`} />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className={inputCls} aria-label={`${title}描述`} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(c.id)} disabled={pending} className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90">保存</button>
                      <button type="button" onClick={() => setEditingId(null)} className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground">取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-muted">{c.slug}</code>
                        <span className="text-xs text-muted">{c.postCount} 篇文章</span>
                      </div>
                      {c.description && <p className="mt-0.5 text-xs text-muted">{c.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => startEdit(c)} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-foreground/5 hover:text-foreground">编辑</button>
                      <AdminActionButton variant="danger" confirmText={confirmText(c.name)} action={() => actions.remove(c.id)}>删除</AdminActionButton>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TagSection({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createTag(name);
      setMsg({ ok: res.ok, text: res.message ?? res.error ?? "" });
      if (res.ok) {
        setName("");
        router.refresh();
      }
    });
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const res = await updateTag(id, editName);
      setMsg({ ok: res.ok, text: res.message ?? res.error ?? "" });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        className="mt-4 flex items-end gap-3"
      >
        <div className="flex-1">
          <label htmlFor="tag-name" className={labelCls}>名称</label>
          <input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：Next.js" className={inputCls} />
        </div>
        <button type="submit" disabled={pending || !name.trim()} className="h-11 shrink-0 cursor-pointer rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-50">
          新建标签
        </button>
      </form>

      {msg && <p className={`mt-3 ${msg.ok ? successCls : errorCls}`}>{msg.text}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {tags.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">还没有标签</p>
        ) : (
          <ul className="divide-y divide-border">
            {tags.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                {editingId === t.id ? (
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputCls} sm:max-w-xs`} aria-label="标签名称" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(t.id)} disabled={pending} className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90">保存</button>
                      <button type="button" onClick={() => setEditingId(null)} className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground">取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">#{t.name}</span>
                      <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-muted">{t.slug}</code>
                      <span className="text-xs text-muted">{t.postCount} 篇文章</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-foreground/5 hover:text-foreground">编辑</button>
                      <AdminActionButton variant="danger" confirmText={`确定删除标签「${t.name}」吗？`} action={() => deleteTag(t.id)}>删除</AdminActionButton>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
