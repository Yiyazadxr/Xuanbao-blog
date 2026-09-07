// 统一 API 输入校验（Zod）：所有 Server Action / Route Handler 不直接信任客户端入参
import { z } from "zod";
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FOOTER_PY_MAX,
  FOOTER_PY_MIN,
  HEADER_H_MAX,
  HEADER_H_MIN,
  SPACING_SCALE_MAX,
  SPACING_SCALE_MIN,
  WAVE_INTENSITY_MAX,
  WAVE_INTENSITY_MIN,
} from "@/lib/display";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notification-types";

// 全局中文兜底：zod 默认文案是英文，任何漏写文案的规则都会经 parseInput/parseId 直接透给用户。
// 各 schema 上显式声明的文案优先级更高，这里只兜住没写到的边角（类型不符、越界等）。
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        return "参数类型不合法";
      case "too_small":
        return "参数值过小";
      case "too_big":
        return "参数值过大";
      case "invalid_value":
        return "参数值不合法";
      case "invalid_format":
        return "参数格式不正确";
      case "unrecognized_keys":
        return "存在多余参数";
      default:
        return "参数不合法";
    }
  },
});

// 通用：数据库记录 ID（cuid 等字符串主键）
// parseId 会传播 zod 首条文案并直接展示给用户，故每条规则都要有中文文案，避免漏出 zod 默认英文
export const idSchema = z.object({
  id: z.string({ error: "ID 不合法" }).trim().min(1, "缺少 ID").max(100, "ID 过长"),
});

export const emailSchema = z
  .string({ error: "邮箱格式不正确" })
  .trim()
  .toLowerCase()
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "邮箱格式不正确");

// 登录
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "密码不合法" }).min(1, "请输入密码").max(200, "密码过长"),
});

// 昵称（注册与修改昵称共用同一约束，保证前后一致）
export const displayNameSchema = z
  .string({ error: "昵称不合法" })
  .trim()
  .min(1, "请输入昵称")
  .max(30, "昵称最长 30 字");

// 注册（邀请码制）
export const registerSchema = z.object({
  code: z.string({ error: "邀请码不合法" }).trim().min(1, "请输入邀请码").max(100, "邀请码过长"),
  name: displayNameSchema,
  email: emailSchema,
  password: z.string({ error: "密码不合法" }).min(8, "密码至少 8 位").max(72, "密码最长 72 位"),
});

// 账号申请
export const applySchema = z.object({
  email: emailSchema,
  message: z.string({ error: "申请说明不合法" }).trim().max(500, "申请说明最长 500 字").optional(),
});

// 修改昵称
export const updateNameSchema = z.object({ name: displayNameSchema });

// 修改密码
export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: "密码不合法" }).min(1, "请输入当前密码").max(72, "密码过长"),
  newPassword: z.string({ error: "密码不合法" }).min(8, "新密码至少 8 位").max(72, "新密码最长 72 位"),
  confirmPassword: z.string({ error: "密码不合法" }).min(1, "请再次输入新密码"),
});

// 摘要最大字数：前后端共用同一来源，消除 PostEditor maxLength 与 Zod 约束漂移
export const EXCERPT_MAX = 500;

// 文章保存/发布
export const postSchema = z.object({
  id: z.string().trim().max(100, "文章 ID 过长").optional(),
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题最长 200 字"),
  slug: z.string().trim().max(200, "链接标识过长").optional().default(""),
  content: z
    .string()
    .max(1_000_000, "正文过长")
    .refine((v) => v.trim().length > 0, "正文不能为空"),
  excerpt: z.string().trim().max(EXCERPT_MAX, `摘要最长 ${EXCERPT_MAX} 字`).optional().default(""),
  coverImage: z.string().trim().max(500, "封面地址过长").nullable().optional().default(null),
  categoryId: z.string().trim().max(100, "分类 ID 过长").nullable().optional().default(null),
  seriesId: z.string().trim().max(100, "系列 ID 过长").nullable().optional().default(null),
  tags: z.string().max(1000, "标签过长").optional().default(""),
  published: z.boolean(),
  featured: z.boolean(),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
});

// 评论
export const commentSchema = z.object({
  postId: z.string({ error: "文章 ID 不合法" }).trim().min(1, "缺少文章 ID").max(100, "文章 ID 过长"),
  slug: z.string({ error: "文章标识不合法" }).trim().min(1, "缺少文章标识").max(200, "文章标识过长"),
  content: z.string().trim().min(1, "评论内容不能为空").max(1000, "评论最多 1000 字"),
  parentId: z.string().trim().max(100, "父评论 ID 过长").nullable().optional(),
});

// 点赞
export const likeSchema = z.object({
  postId: z.string({ error: "文章 ID 不合法" }).trim().min(1, "缺少文章 ID").max(100, "文章 ID 过长"),
  slug: z.string({ error: "文章标识不合法" }).trim().min(1, "缺少文章标识").max(200, "文章标识过长"),
});

// 评论分页读取（公开侧，游客也可查看；校验 postId/skip 防滥用）
export const commentPageSchema = z.object({
  postId: z.string({ error: "文章 ID 不合法" }).trim().min(1, "缺少文章 ID").max(100, "文章 ID 过长"),
  skip: z.number().int().min(0, "分页偏移不合法").max(100_000, "分页偏移不合法"),
});

// 修改用户角色（角色值运行时也再校验一次，见 users/actions.ts）
export const roleSchema = z.object({
  userId: z.string({ error: "用户 ID 不合法" }).trim().min(1, "缺少用户 ID").max(100, "用户 ID 过长"),
  role: z.enum(["ADMIN", "MEMBER"], "角色不合法"),
});

// 禁言/解除禁言：days 为禁言时长（天，1~3650）；days=0 表示永久禁言；解禁走 unmuteUser
export const muteSchema = z.object({
  userId: z.string({ error: "用户 ID 不合法" }).trim().min(1, "缺少用户 ID").max(100, "用户 ID 过长"),
  days: z.number().int().min(0, "禁言时长不合法").max(3650, "禁言时长不合法"),
  reason: z.string().trim().max(200, "原因最长 200 字").optional().default(""),
});

// 保存角色权限
export const permissionSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"], "角色不合法"),
  permissions: z.array(z.string({ error: "权限名不合法" }).max(100, "权限名过长")),
});

// 分类
export const categorySchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称最长 50 字"),
  description: z.string().trim().max(200, "描述最长 200 字").optional().default(""),
});

// 标签
export const tagSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称最长 50 字"),
});

// 系列/专题
export const seriesSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称最长 50 字"),
  description: z.string().trim().max(200, "描述最长 200 字").optional().default(""),
});

// 显示偏好跨设备同步（范围常量复用 lib/display，保证前后一致）
export const displayPreferencesSchema = z.object({
  fontScale: z.number().min(FONT_SCALE_MIN, "字体缩放参数不合法").max(FONT_SCALE_MAX, "字体缩放参数不合法"),
  spacingScale: z.number().min(SPACING_SCALE_MIN, "页面间距参数不合法").max(SPACING_SCALE_MAX, "页面间距参数不合法"),
  density: z.enum(["compact", "normal", "comfortable", "custom"], "界面密度参数不合法"),
  headerH: z
    .number()
    .int()
    .min(HEADER_H_MIN, "页头高度参数不合法")
    .max(HEADER_H_MAX, "页头高度参数不合法")
    .nullable(),
  footerPy: z
    .number()
    .int()
    .min(FOOTER_PY_MIN, "页脚间距参数不合法")
    .max(FOOTER_PY_MAX, "页脚间距参数不合法")
    .nullable(),
  waveIntensity: z
    .number()
    .min(WAVE_INTENSITY_MIN, "水墨强度参数不合法")
    .max(WAVE_INTENSITY_MAX, "水墨强度参数不合法")
    .nullable(),
  inkEnabled: z.boolean().nullable(),
  reduceMotion: z.boolean().nullable(),
});

// 文章批量操作
export const batchPostsSchema = z.object({
  ids: z
    .array(z.string({ error: "文章 ID 不合法" }).min(1, "缺少文章 ID").max(100, "文章 ID 过长"))
    .min(1, "请选择文章")
    .max(200, "一次最多 200 篇"),
  operation: z.enum(["publish", "unpublish", "archive", "delete", "category"], "操作类型不合法"),
  categoryId: z.string().max(100, "分类 ID 过长").nullable().optional(),
});

// 通用邀请码生成参数（有效期天数 + 可用次数，带默认值）
export const freeInviteSchema = z.object({
  expiresInDays: z.number().int().min(1, "有效期至少 1 天").max(365, "有效期最长 365 天").optional().default(7),
  maxUses: z.number().int().min(1, "可用次数至少 1 次").max(1000, "可用次数最多 1000 次").optional().default(1),
});

// 通知分类枚举（与 NOTIFICATION_CATEGORIES 同源，新增分类时 schema 自动同步）
export const notificationCategorySchema = z.enum(
  Object.values(NOTIFICATION_CATEGORIES) as [NotificationCategory, ...NotificationCategory[]],
  "通知分类不合法"
);

// 通知列表查询参数：分类（all 或具体分类）+ 游标
export const notificationsQuerySchema = z.object({
  category: z.union([z.literal("all"), notificationCategorySchema]),
  cursor: z.string().trim().max(200, "游标过长").optional(),
});

// 通用解析：返回统一错误信息，避免把 Zod 原始错误结构暴露给客户端
export type ParseOutcome<T> = { data: T | null; error?: string };

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): ParseOutcome<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { data: null, error: result.error.issues[0]?.message ?? "参数不合法" };
  }
  return { data: result.data };
}

// 解析单个 ID 参数：传播 zod 首条错误信息（如「缺少 ID」），调用方用 ?? 兜底
export function parseId(id: unknown): ParseOutcome<string> {
  const result = idSchema.safeParse({ id });
  if (!result.success) return { data: null, error: result.error.issues[0]?.message ?? "参数不合法" };
  return { data: result.data.id };
}
