// 禁言相关类型（纯常量，客户端/服务端共用同一来源，禁止各写一份造成割裂）
export type MuteInfo = {
  muted: boolean;
  permanent: boolean;
  until: string | null; // 定时解禁时间（ISO 字符串），永久禁言为 null
  reason: string | null;
};
