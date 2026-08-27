// 统一 API 输入校验（Zod）：所有 Server Action / Route Handler 不直接信任客户端入参
import { z } from "zod";

// 通用：数据库记录 ID（cuid 等字符串主键）
export const idSchema = z.object({ id: z.string().trim().min(1, "缺少 ID").max(100) });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "邮箱格式不正确");

// 登录
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "请输入密码").max(200, "密码过长"),
});

// 昵称（注册与修改昵称共用同一约束，保证前后一致）
export const displayNameSchema = z.string().trim().min(1, "请输入昵称").max(30, "昵称最长 30 字");

// 注册（邀请码制）
export const registerSchema = z.object({
  code: z.string().trim().min(1, "请输入邀请码").max(100),
  name: displayNameSchema,
  email: emailSchema,
  password: z.string().min(8, "密码至少 8 位").max(72, "密码最长 72 位"),
});

// 账号申请
export const applySchema = z.object({
  email: emailSchema,
  message: z.string().trim().max(500, "申请说明最长 500 字").optional(),
});

// 修改昵称
export const updateNameSchema = z.object({ name: displayNameSchema });

// 修改密码
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码").max(72),
  newPassword: z.string().min(8, "新密码至少 8 位").max(72, "新密码最长 72 位"),
  confirmPassword: z.string().min(1, "请再次输入新密码"),
});

// 文章保存/发布
export const postSchema = z.object({
  id: z.string().trim().max(100).optional(),
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题最长 200 字"),
  slug: z.string().trim().max(200, "slug 过长").optional().default(""),
  content: z
    .string()
    .max(1_000_000, "正文过长")
    .refine((v) => v.trim().length > 0, "正文不能为空"),
  excerpt: z.string().trim().max(500, "摘要最长 500 字").optional().default(""),
  coverImage: z.string().trim().max(500).nullable().optional().default(null),
  categoryId: z.string().trim().max(100).nullable().optional().default(null),
  seriesId: z.string().trim().max(100).nullable().optional().default(null),
  tags: z.string().max(1000).optional().default(""),
  published: z.boolean(),
  featured: z.boolean(),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
});

// 评论
export const commentSchema = z.object({
  postId: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1, "评论内容不能为空").max(1000, "评论最多 1000 字"),
  parentId: z.string().trim().max(100).nullable().optional(),
});

// 点赞
export const likeSchema = z.object({
  postId: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(200),
});

// 修改用户角色（角色值运行时也再校验一次，见 users/actions.ts）
export const roleSchema = z.object({
  userId: z.string().trim().min(1).max(100),
  role: z.enum(["ADMIN", "MEMBER"]),
});

// 保存角色权限
export const permissionSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
  permissions: z.array(z.string().max(100)),
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

// 文章批量操作
export const batchPostsSchema = z.object({
  ids: z.array(z.string().min(1).max(100)).min(1, "请选择文章").max(200, "一次最多 200 篇"),
  operation: z.enum(["publish", "unpublish", "archive", "delete", "category"]),
  categoryId: z.string().max(100).nullable().optional(),
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

// 解析单个 ID 参数
export function parseId(id: unknown): ParseOutcome<string> {
  const result = idSchema.safeParse({ id });
  if (!result.success) return { data: null, error: "参数不合法" };
  return { data: result.data.id };
}
