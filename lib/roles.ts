// 角色体系：超级管理员 > 管理员 > 成员 > 游客（未登录，无角色记录）
// 角色值存于 User.role（Postgres 原生支持 ENUM，但用字符串约定可避免迁移成本且更灵活）
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: "超级管理员",
  [ROLES.ADMIN]: "管理员",
  [ROLES.MEMBER]: "成员",
};

// 角色徽标配色（用于后台用户列表）
export const ROLE_BADGE_CLS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  [ROLES.ADMIN]: "bg-accent/10 text-accent",
  [ROLES.MEMBER]: "bg-foreground/5 text-muted",
};

// 是否可进入后台（管理内容：文章/评论/邀请码）
export function canAccessAdmin(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

// 是否超级管理员（可管理用户角色）
export function isSuperAdmin(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN;
}
