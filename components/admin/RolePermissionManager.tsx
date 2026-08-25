"use client";

import { useState, useTransition } from "react";
import { saveRolePermissions } from "@/app/(admin)/admin/permissions/actions";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
} from "@/lib/permissions";

type RoleKey = "ADMIN" | "MEMBER";

const ROLE_META: { key: RoleKey; label: string; description: string }[] = [
  { key: "ADMIN", label: "管理员", description: "可进入后台，按勾选的权限管理内容" },
  { key: "MEMBER", label: "成员", description: "注册用户，可评论与点赞" },
];

// 权限管理表单：按角色勾选权限（权限目录来自 PERMISSION_GROUPS，扩容自动适配）
export function RolePermissionManager({
  adminPermissions,
  memberPermissions,
}: {
  adminPermissions: Permission[];
  memberPermissions: Permission[];
}) {
  const [state, setState] = useState<Record<RoleKey, Permission[]>>({
    ADMIN: adminPermissions,
    MEMBER: memberPermissions,
  });
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Record<RoleKey, string>>({ ADMIN: "", MEMBER: "" });

  function toggle(role: RoleKey, perm: Permission) {
    setState((prev) => {
      const cur = prev[role];
      const next = cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm];
      return { ...prev, [role]: next };
    });
  }

  function save(role: RoleKey) {
    setMsg((prev) => ({ ...prev, [role]: "" }));
    startTransition(async () => {
      const res = await saveRolePermissions(role, state[role]);
      setMsg((prev) => ({
        ...prev,
        [role]: res.ok ? "已保存" : (res.error ?? "保存失败"),
      }));
    });
  }

  return (
    <div className="mt-8 space-y-6">
      {ROLE_META.map(({ key, label, description }) => (
        <section key={key} className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">{label}</h2>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => save(key)}
              disabled={pending}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
          {msg[key] && (
            <p
              className={`mt-3 text-sm ${
                msg[key] === "已保存" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              }`}
            >
              {msg[key]}
            </p>
          )}

          <div className="mt-6 space-y-6">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                  <span className="ml-2 font-normal normal-case text-muted/70">
                    {group.description}
                  </span>
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {group.permissions.map((perm) => (
                    <label
                      key={perm}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors duration-200 hover:border-accent"
                    >
                      <input
                        type="checkbox"
                        checked={state[key].includes(perm)}
                        onChange={() => toggle(key, perm)}
                        className="size-4 accent-accent"
                      />
                      <span className="text-sm">{PERMISSION_LABELS[perm]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
