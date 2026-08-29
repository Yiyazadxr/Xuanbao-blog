import { getAvatarColor } from "@/lib/avatar";

// 用户头像：有 image 显示图片，无则纯色底 + 昵称首字。
// shape 控制形状：rounded 圆角矩形(默认)/ circle 圆形。
// 桌面侧栏大图(圆角矩形)、导航栏小图(圆形)、设置页等各处复用。
export function Avatar({
  image,
  name,
  className = "",
  seed,
  shape = "rounded",
}: {
  image?: string | null;
  name?: string | null;
  className?: string;
  seed?: string;
  shape?: "rounded" | "circle";
}) {
  const initial = (name ?? "?").slice(0, 1);
  const color = getAvatarColor(seed || name || "");
  const radiusCls = shape === "circle" ? "rounded-full" : "rounded-2xl";

  if (image) {
    // 有头像：object-cover 裁成方形（显示层裁剪，无需服务端处理）
    return (
      <span className={`relative inline-flex shrink-0 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          className={`size-full object-cover ${radiusCls}`}
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  // 无头像：随机纯色底 + 昵称首字
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-bold text-white ${radiusCls} ${className}`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}
