import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

// 统一空状态：sm 为列表/表格/图表内的轻量文案，lg 为整板块/整页的虚线边框大卡。
// 新增空态一律使用本组件，禁止手写散落的样式与文案结构。
export function EmptyState({
  title,
  description,
  icon,
  action,
  size = "sm",
  className = "",
}: {
  title: string;
  description?: string;
  icon?: string;
  action?: ReactNode;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (size === "lg") {
    return (
      <div
        className={`flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16 text-center ${className}`}
      >
        {icon && <Icon icon={icon} width={40} height={40} className="text-muted/40" aria-hidden />}
        <p className="text-lg font-medium">{title}</p>
        {description && <p className="text-sm text-muted">{description}</p>}
        {action}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 py-8 text-center ${className}`}>
      {icon && <Icon icon={icon} width={32} height={32} className="text-muted/40" aria-hidden />}
      <p className="text-sm text-muted">{title}</p>
      {description && <p className="text-xs text-muted">{description}</p>}
      {action}
    </div>
  );
}
