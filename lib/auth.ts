// Auth.js v5：Credentials 登录与 JWT session。
import { cache } from "react";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { type Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { isRole, type Role } from "@/lib/roles";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

// JWT 展示字段定期回源，避免每次请求查库。
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DUMMY_PASSWORD_HASH = "$2b$10$7EqJtq98hPqEX7fNZaFWoO7u0w8bJ0Vnq1o8gJr5l9hL0yKc6V8mK";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 生产默认不信任 Host 头；AUTH_TRUST_HOST=true 可显式开启。
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
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = await getClientIp();
        // 放在认证入口，页面 Action 与 Auth.js 回调均受限流约束。
        const ipCheck = await rateLimit.checkAndHit("login-ip", ip, 20, 15 * 60 * 1000);
        if (ipCheck.blocked) return null;
        const emailCheck = await rateLimit.checkAndHit("login-email", email, 5, 15 * 60 * 1000);
        if (emailCheck.blocked) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        if (user.disabled) {
          await bcrypt.compare(password, user.password);
          return null;
        }

        if (!user.activatedAt) {
          await bcrypt.compare(password, user.password);
          return null;
        }

        // 激活后未首次登录则回收：邀请码申请 14 天，普通申请 7 天。
        const graceDays = user.inviteCodeId ? 14 : 7;
        if (
          !user.lastLoginAt &&
          Date.now() - user.activatedAt.getTime() > graceDays * 24 * 60 * 60 * 1000
        ) {
          await prisma.user.update({ where: { id: user.id }, data: { disabled: true } });
          await bcrypt.compare(password, user.password);
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;
        await rateLimit.reset("login-email", email);

        // 首次登录时间用于后续回收判定。
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = user.role;
        (token as { syncedAt?: number }).syncedAt = Date.now();
        return token;
      }
      // 客户端 update() 同步刷新 token 展示字段。
      if (trigger === "update") {
        const s = session as { name?: string; image?: string } | undefined;
        if (s?.name) token.name = s.name;
        if (s?.image) token.picture = s.image;
        return token;
      }
      // 展示字段最多延迟 SYNC_INTERVAL_MS；封禁和回收由 getFreshUser() 实时判定。
      // 自定义字段需显式断言：next-auth/jwt 的模块增强对 re-export 的 JWT 不一定生效
      const syncedAt = (token as { syncedAt?: number }).syncedAt ?? 0;
      if (Date.now() - syncedAt > SYNC_INTERVAL_MS && token.id) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, image: true, role: true },
          });
          if (fresh) {
            token.name = fresh.name;
            token.picture = fresh.image ?? null;
            token.role = fresh.role as Role;
          }
        } catch (e) {
          // 回源失败时沿用旧值，下次重试。
          console.error("同步用户信息失败：", e);
        }
        (token as { syncedAt?: number }).syncedAt = Date.now();
      }
      return token;
    },
    // session 仅透传 JWT；安全字段由 getFreshUser() 实时读取。
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});

// JWT 用户仅用于非敏感场景。
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// 权限校验实时读取数据库；React cache 仅在单次请求内去重。
export const getFreshUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      disabled: true,
      activatedAt: true,
    },
  });
  // 停用和回收不受 JWT 有效期影响。
  const role = user?.role;
  if (!user || user.disabled || !user.activatedAt || !isRole(role)) return null;
  return { ...user, role };
});

export async function requirePermission(permission: Permission) {
  const user = await getFreshUser();
  if (!user) return null;
  const ok = await hasPermission(user.role, permission);
  return ok ? user : null;
}
