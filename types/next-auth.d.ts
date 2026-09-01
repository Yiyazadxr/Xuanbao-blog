// 扩展 next-auth 的 Session/JWT 类型，加入 id 和 role
import { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    // 昵称/头像等展示字段的上次回源时间（毫秒时间戳），用于定期回源而非每次请求查库
    syncedAt?: number;
  }
}
