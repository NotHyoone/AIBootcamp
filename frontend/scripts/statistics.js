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
  // Smooth trend path (Catmull-Rom → cubic Bézier). `points` holds [x, y] or null for days
  // without analysis; nulls split the line so missing days stay visible as gaps.
  // Control points are clamped between neighbouring values, so the curve never overshoots.
  function smoothSegments(points) {
    const runs = [];
    let run = [];
    for (const p of Array.isArray(points) ? points : []) {
      const ok = Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
      if (ok) run.push(p);
      else if (run.length) { runs.push(run); run = []; }
    }
    if (run.length) runs.push(run);
    const f = (n) => Math.round(n * 100) / 100;
    const clamp = (v, a, b) => Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));
    return runs.map((r) => {
      let d = `M${f(r[0][0])} ${f(r[0][1])}`;
      for (let i = 0; i < r.length - 1; i++) {
        const p0 = r[i - 1] || r[i], p1 = r[i], p2 = r[i + 1], p3 = r[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6, p1[1], p2[1])];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6, p1[1], p2[1])];
        d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
      }
      return { d, points: r, start: r[0], end: r[r.length - 1] };
    });
  }
  // Calendar weeks run Sunday to Saturday (same as the month grid). Dates are local YYYY-MM-DD
  // strings, so arithmetic happens in UTC to stay clear of daylight-saving shifts.
  const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  function parseDate(date) {
    const m = DATE.exec(date);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
  }
  const formatDate = d => d.toISOString().slice(0, 10);
  function addDays(date, days) {
    const d = parseDate(date);
    if (!d || !Number.isSafeInteger(days)) return date;
    d.setUTCDate(d.getUTCDate() + days);
    return formatDate(d);
  }
  function weekStart(date) {
    const d = parseDate(date);
    return d ? addDays(date, -d.getUTCDay()) : null;
  }
  // The seven dates of the week that contains `date`, or [] for an invalid date.
  function weekDates(date) {
    const start = weekStart(date);
    return start ? Array.from({ length: 7 }, (_, i) => addDays(start, i)) : [];
  }
  // Week navigation never goes past the week of `today`.
  function shiftWeek(start, step, today) {
    const from = weekStart(start), limit = weekStart(today);
    if (!from || !limit || !Number.isSafeInteger(step)) return from || start;
    const next = addDays(from, step * 7);
    return next > limit ? limit : next;
  }
  return { monthSummary, insight, dayEmotion, shiftMonth, smoothSegments, weekStart, weekDates, shiftWeek, addDays, INSIGHT_MINIMUM };
});
