const assert = require("node:assert/strict"),
  path = require("node:path"),
  os = require("node:os"),
  fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { chromium } = require(
  process.env.CARDEX_PLAYWRIGHT ||
    path.join(
      os.tmpdir(),
      "aibootcamp-frontend-review/node_modules/playwright",
    ),
);
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CARDEX_CHROMIUM ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  let checks = 0;
  const errors = [],
    requests = [];
  try {
    const p = await b.newPage({ offline: true, acceptDownloads: true });
    p.on("pageerror", (e) => errors.push(e.message));
    const dialogs = [];
    let confirmAnswer = true;
    p.on("dialog", (dialog) => {
      dialogs.push(dialog.type());
      if (dialog.type() === "confirm" && !confirmAnswer) dialog.dismiss();
      else dialog.accept();
    });
    p.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await p.goto(pathToFileURL(path.resolve(__dirname, "../index.html")).href);
    const click = (a) => p.locator(`[data-action="${a}"]`).first().click();
    const fits = async () => {
      assert.equal(
        await p.evaluate(
          () =>
            document.documentElement.scrollWidth > innerWidth ||
            document.documentElement.scrollHeight > innerHeight + 1,
        ),
        false,
      );
      checks++;
    };
    await p.locator("#diary-text").fill("PRIVATE_RECORD_오늘 기록");
    await click("save");
    const appState = () => p.evaluate(() => DiaryReview.getState());
    const status = () => p.locator("#feedback").innerText();
    assert.equal((await appState()).sessions.length, 1);

    // Back/forward stays inside the app and restores screens.
    const appURL = p.url();
    await click("history");
    assert.equal((await appState()).view, "history");
    await p.goBack();
    assert.ok(["write", "card"].includes((await appState()).view));
    assert.equal(p.url(), appURL);
    await p.goForward();
    assert.equal((await appState()).view, "history");

    // Single-day overwrite of a record not being continued asks first.
    await click("settings");
    await p.locator('[name=policy][value="multi"]').check();
    await p.locator('[name=policy][value="single"]').check();
    await click("write");
    await p.locator("#diary-text").fill("PRIVATE_RECORD_덮어쓴 기록");
    confirmAnswer = false;
    await click("save");
    assert.equal(dialogs.at(-1), "confirm");
    assert.equal((await appState()).sessions[0].text, "PRIVATE_RECORD_오늘 기록");
    confirmAnswer = true;
    await click("save");
    const overwritten = await appState();
    assert.equal(overwritten.sessions.length, 1);
    assert.equal(overwritten.sessions[0].text, "PRIVATE_RECORD_덮어쓴 기록");
    assert.equal(overwritten.sessions[0].version, 2);

    // Real-record wording, edit draft kept across tabs, leave guard.
    await click("history");
    await p.locator("[data-open]").first().click();
    await click("edit-example");
    await p.locator("#sample-text").fill("PRIVATE_RECORD_수정 중");
    await p.locator('[data-record-tab="card"]').click();
    await p.locator('[data-record-tab="text"]').click();
    assert.equal(await p.locator("#sample-text").inputValue(), "PRIVATE_RECORD_수정 중");
    confirmAnswer = false;
    await click("history");
    assert.equal((await appState()).view, "entry");
    confirmAnswer = true;
    await click("save-example");
    assert.ok((await status()).includes("기록을 수정했어요"));
    assert.ok(!(await status()).includes("예시"));

    // Delete then undo restores the record in place.
    await click("delete-example");
    assert.ok((await status()).includes("이 기록을 삭제"));
    await click("delete-example");
    assert.equal((await appState()).sessions.length, 0);
    assert.ok((await status()).includes("기록을 삭제했어요"));
    await click("undo-delete");
    assert.equal((await appState()).sessions.length, 1);
    assert.equal(await p.locator('[data-action="undo-delete"]').count(), 0);

    await click("history");
    assert.ok(
      (await p.locator(".entry-list").innerText()).includes("PRIVATE_RECORD"),
    );
    await p.locator('[data-archive="catalog"]').click();
    assert.ok(
      (await p.locator(".archive-panel").innerText()).includes("0 / 21"),
    );
    await p.locator('[data-archive="stats"]').click();
    assert.ok(
      (await p.locator(".stats-summary").innerText()).includes("기록 1편"),
    );
    await click("settings");
    await click("preview");
    assert.equal(
      await p.evaluate(() => DiaryReview.getState().mode),
      "example",
    );
    assert.ok(
      !(await p.locator(".entry-list").innerText()).includes("PRIVATE_RECORD"),
    );
    for (const size of [
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 360, height: 640 },
      { width: 320, height: 568 },
    ]) {
      await p.setViewportSize(size);
      await click("history");
      await p.locator('[data-archive="catalog"]').click();
      await fits();
      await p.locator('[data-stage="1"]').click();
      await fits();
      await p.locator('[data-archive="stats"]').click();
      for (const tab of ["trend", "count", "distribution"]) {
        await p.locator(`[data-stats="${tab}"]`).click();
        await fits();
      }
      await p.locator('[data-archive="records"]').click();
      await fits();
      await p.locator('[data-open="sample-1"]').click();
      await fits();
      await p.locator('[data-record-tab="card"]').click();
      await fits();
    }
    const d = p.waitForEvent("download");
    await click("download");
    const file = await d;
    const bytes = fs.readFileSync(await file.path());
    assert.equal(bytes.readUInt32BE(16), 1080);
    assert.equal(bytes.readUInt32BE(20), 1620);
    await click("card-catalog");
    assert.equal(await p.locator("[data-stage]").count(), 3);
    await click("catalog-records");
    await p.locator("[data-open]").first().click();
    await click("edit-example");
    await p.locator("#sample-text").fill("원문 수정");
    await click("save-example");
    assert.ok((await status()).includes("예시를 수정했어요"));
    await p.locator('[data-record-tab="card"]').click();
    assert.equal(await p.locator('[data-action="download"]').count(), 0);
    await p.reload();
    assert.ok(dialogs.includes("beforeunload"));
    assert.equal(
      await p.evaluate(() => DiaryReview.getState().sessions.length),
      0,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log({ checks, PNG: "1080x1620", errors, requests });
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
