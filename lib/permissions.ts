// 权限纯常量可供客户端引用；新增权限需同步分组和默认值。
import { ROLES, type Role } from "@/lib/roles";

export const PERMISSIONS = {
  // 内容互动
  COMMENT: "comment",
  LIKE: "like",
  // 文章管理
  MANAGE_POSTS: "manage_posts",
  // 评论管理
  APPROVE_COMMENTS: "approve_comments",
  DELETE_COMMENTS: "delete_comments",
  // 申请与邀请码
  REVIEW_REQUESTS: "review_requests",
  MANAGE_INVITES: "manage_invites",
  // 用户管理
  MANAGE_USERS: "manage_users",
  MUTE_USERS: "mute_users",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// null 表示配置损坏；空数组表示合法的零权限。
export function normalizePermissions(value: unknown): Permission[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return [];
  const valid = [
    ...new Set(
      value.filter(
        (permission): permission is Permission =>
          typeof permission === "string" &&
          (ALL_PERMISSIONS as readonly string[]).includes(permission)
      )
    ),
  ];
  return valid.length > 0 ? valid : null;
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  comment: "发表评论",
  like: "点赞",
  manage_posts: "管理文章：新建、编辑、删除、发布",
  approve_comments: "审核评论",
  delete_comments: "删除评论",
  review_requests: "处理账号申请",
  manage_invites: "管理邀请码",
  manage_users: "管理用户：改角色、删除",
  mute_users: "禁言用户：禁言、解除禁言",
};

export const PERMISSION_GROUPS: {
  label: string;
  description: string;
  permissions: Permission[];
}[] = [
  {
    label: "内容互动",
    description: "前台用户的基础操作",
    permissions: [PERMISSIONS.COMMENT, PERMISSIONS.LIKE],
  },
  {
    label: "文章管理",
    description: "后台文章相关操作",
    permissions: [PERMISSIONS.MANAGE_POSTS],
  },
  {
    label: "评论管理",
    description: "后台评论审核操作",
    permissions: [PERMISSIONS.APPROVE_COMMENTS, PERMISSIONS.DELETE_COMMENTS],
  },
  {
    label: "申请与邀请码",
    description: "账号申请与邀请码管理",
    permissions: [PERMISSIONS.REVIEW_REQUESTS, PERMISSIONS.MANAGE_INVITES],
  },
  {
    label: "用户管理",
    description: "用户角色与账号管理",
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MUTE_USERS],
  },
];

// 未配置角色回落到默认权限；SUPER_ADMIN 固定全开。
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLES.ADMIN]: [
    PERMISSIONS.COMMENT,
    PERMISSIONS.LIKE,
    PERMISSIONS.MANAGE_POSTS,
    PERMISSIONS.APPROVE_COMMENTS,
    PERMISSIONS.DELETE_COMMENTS,
    PERMISSIONS.REVIEW_REQUESTS,
    PERMISSIONS.MANAGE_INVITES,
  ],
  [ROLES.MEMBER]: [PERMISSIONS.COMMENT, PERMISSIONS.LIKE],
};
