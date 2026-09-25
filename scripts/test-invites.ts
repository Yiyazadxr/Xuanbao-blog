// 注册流程自测；运行后自动清理测试数据。
// 运行：npx tsx scripts/test-invites.ts
import "dotenv/config";
import { decryptSecret } from "../lib/crypto";
import {
  createInviteCode,
  submitAccountRequest,
  submitInviteRequest,
} from "../lib/invites";
import { prisma } from "../lib/prisma";

const TEST_EMAIL = "invite-test@example.com";
const TEST_EMAIL2 = "invite-test2@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL2] } } });
  await prisma.accountRequest.deleteMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL2] } } });
  await prisma.inviteCode.deleteMany({ where: { code: { startsWith: "XR-" } } });
}

function assert(name: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${name}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  await cleanup();

  const apply = await submitAccountRequest(TEST_EMAIL, "自测申请");
  assert("普通申请提交成功", apply.ok === true);

  const applyDup = await submitAccountRequest(TEST_EMAIL);
  assert("重复申请被拒", applyDup.ok === false);

  const invite = await createInviteCode(7, 1);
  assert("邀请码格式 XR-XX-12位", /^XR-[A-Z]{2}-[A-Za-z0-9]{12}$/.test(invite.code));

  const badCode = await submitInviteRequest({
    code: "XR-INVALID0",
    email: TEST_EMAIL2,
    password: "password123",
    name: "测试用户",
  });
  assert("无效邀请码被拒", badCode.ok === false);

  const ok = await submitInviteRequest({
    code: invite.code,
    email: TEST_EMAIL2,
    password: "password123",
    name: "测试用户",
  });
  assert("邀请码申请成功", ok.ok === true);

  // 邀请申请会预建待审核账号、关联邀请码并消耗次数。
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL2 } });
  assert("邀请码路径建号待激活", user?.activatedAt === null && user?.inviteCodeId === invite.id);
  const inviteAfter = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
  assert("邀请码已消耗 1 次", inviteAfter?.usedCount === 1);

  const reuse = await submitInviteRequest({
    code: invite.code,
    email: "another@example.com",
    password: "password123",
    name: "又一位",
  });
  assert("次数用尽被拒", reuse.ok === false);

  // 申请密码仅以可解密密文暂存，供审核通过邮件使用。
  const req = await prisma.accountRequest.findFirst({ where: { email: TEST_EMAIL2, status: "PENDING" } });
  assert("申请记录不存明文密码", req?.password !== "password123" && Boolean(req?.password));
  assert("密文可解密还原", req?.password ? decryptSecret(req.password) === "password123" : false);

  await cleanup();
  console.log("\n自测完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
