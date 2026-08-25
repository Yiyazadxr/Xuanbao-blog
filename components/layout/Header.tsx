"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useFocusTrap } from "@/lib/use-focus-trap";

// 全站吸顶导航：玻璃拟态，滚动后加深背景；移动端折叠为汉堡菜单
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 移动端菜单打开时锁定焦点、关闭时归还给汉堡按钮
  useFocusTrap(menuPanelRef, menuOpen);

  // Escape 键关闭移动端菜单
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav
        aria-label="主导航"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        {/* Logo + 站名 */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Image
            src="/images/main_logo.webp"
            alt=""
            width={32}
            height={32}
            className="rounded-full"
            priority
          />
          <span className="font-display text-base font-bold tracking-tight">
            {SITE.shortName}
          </span>
        </Link>

        {/* 桌面端导航 */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "text-foreground"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
          {/* 移动端汉堡按钮 */}
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
          >
            <Icon icon={menuOpen ? "ph:x-bold" : "ph:list-bold"} width={22} height={22} />
          </button>
        </div>
      </nav>

      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <div
          ref={menuPanelRef}
          id="mobile-menu"
          className="border-b border-border bg-background/95 backdrop-blur-md md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-3 text-base font-medium transition-colors duration-200 ${
                    active
                      ? "bg-foreground/5 text-foreground"
                      : "text-muted hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
