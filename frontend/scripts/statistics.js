(function (root, factory) {
  const api = factory(
    typeof module === "object" ? require("./core.js") : root.CardexCore,
  );
  if (typeof module === "object") module.exports = api;
  else root.DiaryStatistics = api;
})(globalThis, function (C) {
  "use strict";
  function monthSummary(records, month) {
    const days = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5)),
      0,
    ).getDate();
    const selected = records.filter((r) => r.recordDate?.slice(0, 7) === month);
    const buckets = Array.from({ length: days }, (_, i) => ({
      date: month + "-" + String(i + 1).padStart(2, "0"),
      count: 0,
      rows: [],
    }));
    for (const r of selected) {
      const b = buckets.find((b) => b.date === r.recordDate);
      if (!b) continue;
      b.count++;
      if (
        r.analysis?.status === "valid" &&
        Number.isSafeInteger(r.version) && r.version > 0 && r.analysis.version === r.version
      ) {
        try {
          C.validateAnalysis(r.analysis);
          b.rows.push({
            status: "valid",
            probabilities: r.analysis.probabilities,
          });
        } catch {
          /* Invalid analysis is excluded, never replaced by neutral. */
        }
      }
    }
    const rows = buckets.flatMap((b) => b.rows);
    return {
      total: buckets.reduce((n, b) => n + b.count, 0),
      writtenDays: buckets.filter((b) => b.count).length,
      valid: rows.length,
      missing: selected.length - rows.length,
      distribution: C.aggregate(rows),
      days: buckets.map((b) => ({ ...b, summary: C.aggregate(b.rows) })),
    };
  }
  // Monthly takeaway from model analysis only; withheld until enough records are analyzed.
  const INSIGHT_MINIMUM = 3;
  function insight(stats, minimum = INSIGHT_MINIMUM) {
    const valid = Number.isSafeInteger(stats?.valid) ? stats.valid : 0;
    const d = stats?.distribution;
    if (valid < minimum || !d?.leaf) return { ready: false, valid, needed: Math.max(0, minimum - valid) };
    return { ready: true, valid, leaf: d.dominantLeaf, leafTies: d.leafTies, parent: d.dominantParent, parents: d.parents };
  }
  // Representative emotion of one calendar day, or null when the day has no valid analysis.
  function dayEmotion(day) {
    return day?.summary?.validCount ? day.summary.dominantLeaf : null;
  }
  // Month navigation never goes past the current month.
  function shiftMonth(month, step, current) {
    if (!/^\d{4}-\d{2}$/.test(month) || !Number.isSafeInteger(step)) return month;
    const [y, m] = month.split("-").map(Number), total = y * 12 + (m - 1) + step;
    const next = String(Math.floor(total / 12)).padStart(4, "0") + "-" + String((total % 12) + 1).padStart(2, "0");
    return current && next > current ? month : next;
  }
  return { monthSummary, insight, dayEmotion, shiftMonth, INSIGHT_MINIMUM };
});
