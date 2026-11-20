const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../scripts/profile.js");

test("nickname is trimmed, collapsed, capped at 12 characters and never empty", () => {
  assert.equal(P.normalizeName("  새 벽  "), "새 벽");
  assert.equal(P.normalizeName("가\n\t나"), "가 나");
  assert.equal(P.normalizeName("가".repeat(12)), "가".repeat(12));
  assert.equal(P.normalizeName("가".repeat(13)), "가".repeat(12), "13 characters are cut to 12");
  assert.equal(Array.from(P.normalizeName("😀".repeat(20))).length, 12, "code points, not UTF-16 units");
  for (const empty of ["", "   ", null, undefined]) assert.equal(P.normalizeName(empty), "하루");
});

test("profile keeps known colors and boolean notices only", () => {
  assert.deepEqual(P.normalize(null), P.DEFAULTS);
  assert.deepEqual(P.normalize({ name: "모모", color: P.COLORS[3], notifyDaily: true, notifyAnalysis: "yes" }), { name: "모모", color: P.COLORS[3], notifyDaily: true, notifyAnalysis: false });
  assert.equal(P.normalize({ color: "red" }).color, P.COLORS[0]);
  assert.equal(P.COLORS.length, 6);
});

test("load and save survive missing, broken or throwing storage", () => {
  const mem = new Map(), storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(P.load(storage), P.DEFAULTS);
  const saved = P.save(storage, { name: "  별  ", color: P.COLORS[2] });
  assert.equal(saved.stored, true);
  assert.deepEqual(P.load(storage), { ...P.DEFAULTS, name: "별", color: P.COLORS[2] });
  assert.equal(mem.has(P.KEY), true);
  mem.set(P.KEY, "{broken");
  assert.deepEqual(P.load(storage), P.DEFAULTS, "corrupt JSON falls back");
  const throwing = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.deepEqual(P.load(throwing), P.DEFAULTS);
  assert.deepEqual(P.save(throwing, { name: "a" }), { profile: { ...P.DEFAULTS, name: "a" }, stored: false });
  assert.deepEqual(P.load(undefined), P.DEFAULTS);
});

test("days together count the first record day as day 1", () => {
  assert.equal(P.daysTogether("2026-11-20", "2026-11-20"), 1);
  assert.equal(P.daysTogether("2026-11-01", "2026-11-20"), 20);
  assert.equal(P.daysTogether("2025-12-31", "2026-01-01"), 2, "crosses the year");
  assert.equal(P.daysTogether("2028-02-28", "2028-03-01"), 3, "leap day");
  assert.equal(P.daysTogether("2026-11-25", "2026-11-20"), 1, "a future first date never goes below 1");
  assert.equal(P.daysTogether(null, "2026-11-20"), null);
  assert.equal(P.daysTogether("2026-02-30", "2026-11-20"), null);
});

test("export text lists records oldest first with card labels, and handles empty and maximum length", () => {
  const records = [
    { recordDate: "2026-11-18", createdAt: "b", text: "둘째 날\r\n줄바꿈" },
    { recordDate: "2026-11-17", createdAt: "a", text: "  첫째 날  " },
    { recordDate: "bad", text: "버림" },
    { recordDate: "2026-11-19" },
  ];
  const text = P.exportText(records, { exportedAt: "2026-11-20", label: r => r.recordDate === "2026-11-18" ? "분석 대기" : "" });
  assert.match(text, /^오늘의 모먼트 · 기록 내보내기\n내보낸 날: 2026-11-20\n기록 2편\n/);
  assert.ok(text.indexOf("2026-11-17 (화)") < text.indexOf("2026-11-18 (수)"), "oldest first");
  assert.ok(text.includes("카드: 분석 대기\n\n둘째 날\n줄바꿈\n"), "CRLF normalized");
  assert.ok(text.includes("\n첫째 날\n") && !text.includes("버림"));
  assert.match(P.exportText([], { exportedAt: "2026-11-20" }), /기록 0편\n\n내보낼 기록이 없어요\./);
  const long = "가".repeat(10000);
  assert.ok(P.exportText([{ recordDate: "2026-11-20", text: long }]).includes(long), "10,000 characters kept whole");
  assert.equal(P.exportFileName("2026-11-20"), "moment-records-20261120.txt");
  assert.equal(P.exportFileName("bad"), "moment-records-export.txt");
});
