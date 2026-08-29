// Auth.js v5 配置：邮箱密码登录（Credentials）+ JWT session
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { type Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { type Role } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 本地/自托管开发环境信任 Host 头；生产默认关闭，防 Host 头注入，可用 AUTH_TRUST_HOST=true 显式开启
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // 被回收/禁用的账号拒绝登录
        if (user.disabled) return null;

        // 待审核（邀请码路径提交后、审核通过前）不可登录
        if (!user.activatedAt) return null;

        // 回收判定：激活后超期未首次登录 → 禁用并拒绝
        // 邀请码路径 14 天，普通申请 7 天
        const graceDays = user.inviteCodeId ? 14 : 7;
        if (
          !user.lastLoginAt &&
          Date.now() - user.activatedAt.getTime() > graceDays * 24 * 60 * 60 * 1000
        ) {
          await prisma.user.update({ where: { id: user.id }, data: { disabled: true } });
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // 首次登录写 lastLoginAt（用于后续回收判定）
        if (!user.lastLoginAt) {
          await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    // 把 id 和 role 写进 JWT，再透传到 session
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = user.role;
      }
      // 客户端 update()（如改昵称/头像）时同步刷新 token 里的展示字段
      if (trigger === "update") {
        const s = session as { name?: string; image?: string } | undefined;
        if (s?.name) token.name = s.name;
        if (s?.image) token.picture = s.image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        // 展示字段实时从 DB 读，避免 JWT 快照过期
        // （改头像/昵称/角色后无需重新登录即可立即生效，与「不要信任 JWT 可变字段」规范一致）
        if (token.id) {
          const uid = token.id as string;
          return prisma.user
            .findUnique({
              where: { id: uid },
              select: { name: true, image: true, role: true },
            })
            .then((u) => {
              if (u) {
                session.user.name = u.name ?? session.user.name;
                session.user.image = u.image ?? session.user.image;
                session.user.role = u.role as Role;
              }
              return session;
            })
            .catch(() => session);
        }
      }
      return session;
    },
  },
});

// 获取当前登录用户（基于 JWT，轻量；用于展示/评论等非敏感场景）
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// 从数据库读取当前用户最新信息（含角色）。
// 权限校验用这个，确保角色变更/封禁即时生效，不依赖可能过期的 JWT。
export async function getFreshUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });
}

// 按具体权限校验：用户拥有该权限时返回用户，否则返回 null
export async function requirePermission(permission: Permission) {
  const user = await getFreshUser();
  if (!user) return null;
  const ok = await hasPermission(user.role as Role, permission);
  return ok ? user : null;
}
