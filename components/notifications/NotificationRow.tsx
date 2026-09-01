"use client";

import { Icon } from "@/components/ui/Icon";
import {
  NOTIFICATION_CATEGORY_META,
  formatNotificationText,
  type NotificationItem,
} from "@/lib/notification-types";
import { formatRelativeTime } from "@/lib/utils";

// 通知条目：分类图标 + 触发者/聚合文案 + 标题 + 相对时间 + 删除按钮
// 复用铃铛下拉与通知中心（compact 控制间距与字号）
export function NotificationRow({
  item,
  onDelete,
  compact = false,
}: {
  item: NotificationItem;
  onDelete?: (id: string) => void;
  compact?: boolean;
}) {
  const meta = NOTIFICATION_CATEGORY_META[item.category];
  // 聚合文案
  const text = formatNotificationText(item);

  const body = (
    <>
      <span
        className={`mt-1 flex shrink-0 items-center justify-center ${compact ? "size-8" : "size-10"}`}
      >
        <Icon
          icon={meta.icon}
          width={compact ? 18 : 22}
          height={compact ? 18 : 22}
          className={`${meta.color} ${item.read ? "opacity-40" : ""}`}
          aria-hidden
        />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block ${compact ? "text-sm" : "text-base"} leading-snug ${
            item.read ? "text-muted" : "text-foreground"
          }`}
        >
          {text.actorText && (
            <span className="font-semibold">{text.actorText} </span>
          )}
          {text.title}
          {text.countSuffix && (
            <span className="ml-1 text-xs text-muted">{text.countSuffix}</span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span>{formatRelativeTime(item.createdAt)}</span>
          {!item.read && (
            <span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden />
          )}
        </span>
      </span>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(item.id);
          }}
          aria-label="删除通知"
          className={`shrink-0 cursor-pointer rounded-full text-muted/50 transition-colors duration-150 hover:bg-foreground/10 hover:text-red-500 ${
            compact ? "p-1" : "p-1.5"
          }`}
        >
          <Icon icon="ph:x-bold" width={14} height={14} aria-hidden />
        </button>
      )}
    </>
  );

  const hoverCls = "transition-colors duration-150 hover:bg-foreground/5";
  const padCls = compact ? "px-4 py-3" : "px-5 py-4";

  if (item.link) {
    return (
      <div className={`${hoverCls}`}>
        <a
          href={item.link}
          className={`flex items-start gap-3 ${padCls}`}
        >
          {body}
        </a>
      </div>
    );
  }
  return (
    <div className={`flex items-start gap-3 ${padCls} ${hoverCls}`}>{body}</div>
  );
}
