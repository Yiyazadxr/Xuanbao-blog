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

// 注册（邀请码制）
export const registerSchema = z.object({
  code: z.string().trim().min(1, "请输入邀请码").max(100),
  name: z.string().trim().min(1, "请输入昵称").max(30, "昵称最长 30 字"),
  email: emailSchema,
  password: z.string().min(8, "密码至少 8 位").max(72, "密码最长 72 位"),
});

// 账号申请
export const applySchema = z.object({
  email: emailSchema,
  message: z.string().trim().max(500, "申请说明最长 500 字").optional(),
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
  categoryId: z.string().trim().max(100).nullable().optional().default(null),
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
