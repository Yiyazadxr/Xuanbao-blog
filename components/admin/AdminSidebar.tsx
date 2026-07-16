"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { label: "仪表盘", href: "/admin", icon: "ph:gauge-bold", exact: true },
  { label: "文章管理", href: "/admin/posts", icon: "ph:article-bold", exact: false },
  { label: "评论审核", href: "/admin/comments", icon: "ph:chats-bold", exact: false },
  { label: "申请与邀请码", href: "/admin/invites", icon: "ph:ticket-bold", exact: false },
];

// 后台侧栏导航（移动端为横向标签）
export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="后台导航" className="flex gap-1 overflow-x-auto md:w-48 md:flex-col">
      {ADMIN_LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
              active
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <Icon icon={link.icon} width={18} height={18} aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
