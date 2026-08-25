// Auth.js v5 配置：邮箱密码登录（Credentials）+ JWT session
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin, isSuperAdmin, type Role } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // 本地/自托管环境信任 Host 头
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

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

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
    select: { id: true, name: true, email: true, image: true, role: true },
  });
}

// 后台守卫：SUPER_ADMIN 或 ADMIN 通过，否则返回 null
export async function requireAdmin() {
  const user = await getFreshUser();
  if (!user || !canAccessAdmin(user.role)) return null;
  return user;
}

// 超级管理员守卫：仅 SUPER_ADMIN 通过（用于用户角色管理）
export async function requireSuperAdmin() {
  const user = await getFreshUser();
  if (!user || !isSuperAdmin(user.role)) return null;
  return user;
}
