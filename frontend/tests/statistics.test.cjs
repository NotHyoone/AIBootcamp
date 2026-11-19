const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../scripts/statistics.js"),
  C = require("../scripts/core.js");
const probabilities = Object.fromEntries(
  C.IDS.map((id, i) => [id, i === 0 ? 1 : 0]),
);
const row = (date, analysis = { status: "valid", probabilities }) => ({
  recordDate: date,
  version: 1,
  analysis: analysis && { version:1, taxonomy_version:C.TAXONOMY, ...analysis },
});
test("counts records separately from days, supports leap months and missing analysis", () => {
  const s = S.monthSummary(
    [
      row("2024-02-01"),
      row("2024-02-01"),
      row("2024-02-29", { status: "pending" }),
      row("2024-03-01"),
    ],
    "2024-02",
  );
  assert.equal(s.total, 3);
  assert.equal(s.writtenDays, 2);
  assert.equal(s.valid, 2);
  assert.equal(s.missing, 1);
  assert.equal(s.days.length, 29);
  assert.equal(s.days[1].summary.leaf, null);
  assert.equal(s.days[1].count, 0);
});
test("monthly distribution weights source records, not daily averages", () => {
  const neutral = Object.fromEntries(
    C.IDS.map((id) => [id, id === "neu_1" ? 1 : 0]),
  );
  const s = S.monthSummary(
    [
      row("2026-11-01"),
      row("2026-11-01"),
      row("2026-11-02", { status: "valid", probabilities: neutral }),
    ],
    "2026-11",
  );
  assert.equal(s.distribution.leaf.pos_1, 2 / 3);
  assert.equal(s.days[1].summary.parents.neutral, 1);
});
test("invalid, absent and empty analysis are distinct from neutral", () => {
  const s = S.monthSummary(
    [
      row("2026-11-01", { status: "valid", probabilities: { neutral: 1 } }),
      row("2026-11-02", null),
    ],
    "2026-11",
  );
  assert.equal(s.total, 2);
  assert.equal(s.valid, 0);
  assert.equal(s.missing, 2);
  assert.equal(s.distribution.leaf, null);
  assert.equal(S.monthSummary([], "2026-11").total, 0);
});

test("old taxonomies, stale records and truncated results are excluded without changing record counts", () => {
  const old = row('2026-11-01',{status:'valid',probabilities,taxonomy_version:'old'});
  const stale = {...row('2026-11-01'), version:2};
  const truncated = row('2026-11-01',{status:'valid',probabilities,truncated:true});
  const s=S.monthSummary([row('2026-11-01'),old,stale,truncated],'2026-11');
  assert.equal(s.total,4);assert.equal(s.valid,1);assert.equal(s.missing,3);
  assert.equal(s.distribution.leaf.pos_1,1);
});

const vector = id => Object.fromEntries(C.IDS.map(x => [x, x === id ? 1 : 0]));
test("insight is withheld below 3 analyzed records and reports ties", () => {
  const rows = n => Array.from({ length: n }, () => row("2026-11-02", { status: "valid", probabilities: vector("neg_2") }));
  for (const n of [0, 1, 2]) {
    const i = S.insight(S.monthSummary(rows(n), "2026-11"));
    assert.equal(i.ready, false); assert.equal(i.valid, n); assert.equal(i.needed, 3 - n);
  }
  const ready = S.insight(S.monthSummary(rows(3), "2026-11"));
  assert.equal(ready.ready, true); assert.equal(ready.leaf, "neg_2"); assert.equal(ready.parent, "negative");
  // Pending records count toward totals, never toward the insight minimum.
  const mixed = S.monthSummary([...rows(2), row("2026-11-03", { status: "pending" })], "2026-11");
  assert.equal(S.insight(mixed).ready, false);
  const tie = S.monthSummary([...rows(2), row("2026-11-04", { status: "valid", probabilities: vector("pos_1") }), row("2026-11-05", { status: "valid", probabilities: vector("pos_1") })], "2026-11");
  assert.deepEqual(S.insight(tie).leafTies, ["pos_1", "neg_2"], "ties follow taxonomy order");
  for (const bad of [null, undefined, {}, { valid: 5 }]) assert.equal(S.insight(bad).ready, false);
});

test("day emotion is the dominant analyzed leaf and null without valid analysis", () => {
  const s = S.monthSummary([row("2026-11-02", { status: "valid", probabilities: vector("neu_3") }), row("2026-11-03", { status: "pending" })], "2026-11");
  assert.equal(S.dayEmotion(s.days[1]), "neu_3");
  assert.equal(S.dayEmotion(s.days[2]), null);
  assert.equal(S.dayEmotion(s.days[0]), null);
  assert.equal(S.dayEmotion(undefined), null);
});

test("month shift crosses years and never passes the current month", () => {
  assert.equal(S.shiftMonth("2026-01", -1), "2025-12");
  assert.equal(S.shiftMonth("2025-12", 1), "2026-01");
  assert.equal(S.shiftMonth("2026-11", 1, "2026-11"), "2026-11", "blocked at current month");
  assert.equal(S.shiftMonth("2026-10", 1, "2026-11"), "2026-11");
  assert.equal(S.shiftMonth("2026-11", -13), "2025-10");
  for (const [m, step] of [["bad", 1], ["2026-11", 1.5], ["2026-11", NaN]]) assert.equal(S.shiftMonth(m, step), m);
});

test("weeks start on Sunday and cross month and year boundaries", () => {
  assert.equal(S.weekStart("2026-11-15"), "2026-11-15", "a Sunday starts its own week");
  assert.equal(S.weekStart("2026-11-21"), "2026-11-15", "Saturday belongs to the same week");
  assert.equal(S.weekStart("2026-12-02"), "2026-11-29", "week spans the month change");
  assert.equal(S.weekStart("2027-01-01"), "2026-12-27", "week spans the year change");
  assert.deepEqual(S.weekDates("2026-12-31"), ["2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  for (const bad of ["", "2026-13-01", "2026-02-30", "2026-1-5", null, undefined]) {
    assert.equal(S.weekStart(bad), null);
    assert.deepEqual(S.weekDates(bad), []);
  }
  assert.equal(S.addDays("2028-02-28", 1), "2028-02-29", "leap day");
  assert.equal(S.addDays("bad", 1), "bad");
});

test("week shift never passes the week of today", () => {
  assert.equal(S.shiftWeek("2026-11-15", -1, "2026-11-19"), "2026-11-08");
  assert.equal(S.shiftWeek("2026-11-15", 1, "2026-11-19"), "2026-11-15", "blocked at the current week");
  assert.equal(S.shiftWeek("2026-11-08", 1, "2026-11-19"), "2026-11-15");
  assert.equal(S.shiftWeek("2026-11-18", -1, "2026-11-19"), "2026-11-08", "a mid-week date is normalized first");
  assert.equal(S.shiftWeek("2026-12-27", -53, "2027-01-01"), "2025-12-21");
  for (const step of [1.5, NaN]) assert.equal(S.shiftWeek("2026-11-08", step, "2026-11-19"), "2026-11-08");
  assert.equal(S.shiftWeek("bad", 1, "2026-11-19"), "bad");
});
