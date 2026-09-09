import { expect, test } from "@playwright/test";

test("参加、問題公開、回答、正解発表、終了まで進行できる", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const participantContext = await browser.newContext();
  const inactiveParticipantContext = await browser.newContext();
  const admin = await adminContext.newPage();
  const participant = await participantContext.newPage();
  const inactiveParticipant = await inactiveParticipantContext.newPage();

  await admin.goto("/admin");
  await admin.getByLabel("パスワード").fill(process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-password");
  await admin.getByRole("button", { name: "ログイン" }).click();
  await expect(admin.getByText("Quiz Control")).toBeVisible();

  await admin.getByText("データのリセット").click();
  await admin.getByLabel("リセット確認用Adminパスワード").fill("wrong-password");
  await admin.getByRole("button", { name: "リセット" }).click();
  await expect(admin.getByText("Adminパスワードが正しくありません")).toBeVisible();
  await admin.getByLabel("リセット確認用Adminパスワード").fill(process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-password");
  await admin.getByRole("button", { name: "リセット" }).click();
  await expect(admin.getByRole("button", { name: "第1問を開始" })).toBeVisible();

  await participant.goto("/quiz");
  await participant.getByLabel("ニックネーム").fill("テスト参加者");
  await participant.getByRole("button", { name: "参加する" }).click();
  await expect(participant.getByText("まもなく開始します")).toBeVisible();

  await inactiveParticipant.goto("/quiz");
  await inactiveParticipant.getByLabel("ニックネーム").fill("未回答参加者");
  await inactiveParticipant.getByRole("button", { name: "参加する" }).click();
  await expect(inactiveParticipant.getByText("まもなく開始します")).toBeVisible();

  await admin.getByRole("button", { name: "第1問を開始" }).click();
  await expect(participant.getByText("HTTPステータスコード『418』が表すものは？")).toBeVisible();
  await participant.getByRole("button", { name: /私はティーポット/ }).click();
  await expect(participant.getByText("回答を受け付けました")).not.toBeVisible();
  await expect(participant.getByRole("button", { name: "この回答で送信" })).toBeEnabled();
  await expect(participant.getByText("回答を受け付けました")).toBeVisible({ timeout: 20_000 });

  await expect(admin.getByRole("button", { name: "正解を発表" })).toBeVisible({ timeout: 5_000 });
  await expect(admin.locator(".metric").filter({ hasText: "回答" }).getByText("1人")).toBeVisible();
  await admin.getByRole("button", { name: "正解を発表" }).click();
  await expect(participant.getByText("正解発表")).toBeVisible();

  await admin.getByRole("button", { name: "クイズを終了" }).click();
  await expect(participant.getByText("おつかれさまでした！")).toBeVisible();
  await expect(participant.getByText("1,000 pt").first()).toBeVisible();

  await admin.getByLabel("リセット確認用Adminパスワード").fill(process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-password");
  await admin.getByRole("button", { name: "リセット" }).click();
  await expect(participant.getByRole("heading", { name: "クイズに参加" })).toBeVisible();
  await expect(admin.getByRole("button", { name: "第1問を開始" })).toBeVisible();

  await adminContext.close();
  await participantContext.close();
  await inactiveParticipantContext.close();
});

test("投影待機画面に現在のホストを使った参加QRコードを表示する", async ({ page }) => {
  await page.goto("/screen");

  await expect(page.getByRole("img", { name: /クイズ参加用QRコード/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /\/quiz/ })).toHaveAttribute("href", `${new URL(page.url()).origin}/quiz`);
  await expect(page.getByRole("button", { name: "参加URLをコピー" })).toBeVisible();
});
