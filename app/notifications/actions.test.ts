import { beforeEach, expect, it, vi } from "vitest";
const { getFreshUser, updateMany, deleteMany } = vi.hoisted(() => ({ getFreshUser: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getFreshUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { updateMany, deleteMany } } }));
vi.mock("@/lib/notifications", () => ({ getUserNotifications: vi.fn(), getUnreadSummary: vi.fn() }));
import { markNotificationRead, markAllNotificationsRead, markCategoryRead, clearReadNotifications, deleteNotification } from "./actions";

beforeEach(() => { vi.resetAllMocks(); getFreshUser.mockResolvedValue({ id: "owner" }); });

it("会话失效时所有写操作失败，不产生假成功", async () => {
  getFreshUser.mockResolvedValue(null);
  for (const operation of [() => markNotificationRead("id"), markAllNotificationsRead, () => markCategoryRead("like"), clearReadNotifications, () => deleteNotification("id")]) {
    await expect(operation()).rejects.toThrow("NOTIFICATION_AUTH_REQUIRED");
  }
  expect(updateMany).not.toHaveBeenCalled();
  expect(deleteMany).not.toHaveBeenCalled();
});

it("空 ID 不会执行数据库写入", async () => {
  await expect(markNotificationRead(" " )).rejects.toThrow("INVALID_NOTIFICATION_ID");
  await expect(deleteNotification("")).rejects.toThrow("INVALID_NOTIFICATION_ID");
  expect(updateMany).not.toHaveBeenCalled();
  expect(deleteMany).not.toHaveBeenCalled();
});

it("通知写入始终限制当前用户归属", async () => {
  await markNotificationRead("notice");
  expect(updateMany).toHaveBeenLastCalledWith({ where: { id: "notice", userId: "owner", read: false }, data: { read: true } });
  await markCategoryRead("like");
  expect(updateMany).toHaveBeenLastCalledWith({ where: { userId: "owner", category: "like", read: false }, data: { read: true } });
  await deleteNotification("notice");
  expect(deleteMany).toHaveBeenLastCalledWith({ where: { id: "notice", userId: "owner" } });
});

it("数据库失败传递给客户端错误分支", async () => {
  deleteMany.mockRejectedValue(new Error("DB_FAILURE"));
  await expect(deleteNotification("notice")).rejects.toThrow("DB_FAILURE");
});
