import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 客户端单例：开发环境热重载时复用同一个实例，避免连接数暴涨
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Vercel Serverless 每个 lambda 持独立连接池，max 过高会打满 Neon 连接上限
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
