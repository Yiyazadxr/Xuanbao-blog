import Link from "next/link";
import { SITE } from "@/lib/constants";

// 全站页脚
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} {SITE.shortName}
        </p>
        <nav aria-label="页脚导航" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link
            href="/privacy"
            className="text-sm text-muted transition-colors duration-200 hover:text-foreground"
          >
            隐私政策
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted transition-colors duration-200 hover:text-foreground"
          >
            用户协议
          </Link>
        </nav>
      </div>
    </footer>
  );
}
