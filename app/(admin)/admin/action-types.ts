// 后台 Server Actions 通用返回状态类型（各域 actions 文件共享，避免重复定义造成割裂）
export type AdminActionState = { ok: boolean; error?: string; message?: string };
