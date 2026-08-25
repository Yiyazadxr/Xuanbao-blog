// Phase 3 邀请码逻辑自测脚本（运行后自动清理测试数据）
// 运行：npx tsx scripts/test-invites.ts
import "dotenv/config";
import { createInviteCode, registerWithInvite, submitAccountRequest } from "../lib/invites";
import { prisma } from "../lib/prisma";

const TEST_EMAIL = "invite-test@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.accountRequest.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.inviteCode.deleteMany({ where: { email: TEST_EMAIL } });
}

function assert(name: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${name}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  await cleanup();

  // 1. 提交申请
  const apply = await submitAccountRequest(TEST_EMAIL, "自测申请");
  assert("提交申请成功", apply.ok === true);

  // 2. 重复申请被拒
  const applyDup = await submitAccountRequest(TEST_EMAIL);
  assert("重复申请被拒", applyDup.ok === false);

  // 3. 生成绑定邮箱的邀请码
  const invite = await createInviteCode(TEST_EMAIL);
  assert("邀请码生成（XR- 前缀）", invite.code.startsWith("XR-"));

  // 4. 用错误邮箱注册被拒（邀请码绑定了 TEST_EMAIL）
  const wrongEmail = await registerWithInvite({
    code: invite.code,
    email: "other@example.com",
    password: "password123",
    name: "路人",
  });
  assert("绑定邮箱不符被拒", wrongEmail.ok === false);

  // 5. 无效邀请码被拒
  const badCode = await registerWithInvite({
    code: "XR-INVALID0",
    email: TEST_EMAIL,
    password: "password123",
    name: "测试用户",
  });
  assert("无效邀请码被拒", badCode.ok === false);

  // 6. 正确注册
  const ok = await registerWithInvite({
    code: invite.code,
    email: TEST_EMAIL,
    password: "password123",
    name: "测试用户",
  });
  assert("邀请码注册成功", ok.ok === true);

  // 7. 已用邀请码不能再次使用
  const reuse = await registerWithInvite({
    code: invite.code,
    email: "another@example.com",
    password: "password123",
    name: "又一位",
  });
  assert("已用邀请码被拒", reuse.ok === false);

  // 8. 注册后申请状态变为 APPROVED、用户角色为 MEMBER
  const req = await prisma.accountRequest.findFirst({ where: { email: TEST_EMAIL } });
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  assert("申请状态已变更为 APPROVED", req?.status === "APPROVED");
  assert("新用户角色为 MEMBER 且密码已哈希", user?.role === "MEMBER" && user.password !== "password123");

  await cleanup();
  console.log("\n自测完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
