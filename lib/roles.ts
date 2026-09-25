// 角色层级：SUPER_ADMIN > ADMIN > MEMBER；游客无角色记录。
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (Object.values(ROLES) as string[]).includes(value);
}

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

// ADMIN 和 SUPER_ADMIN 可进入后台。
export function canAccessAdmin(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN;
}
