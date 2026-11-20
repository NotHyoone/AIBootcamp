(function (root, factory) {
  const api = factory();
  if (typeof module === "object") module.exports = api;
  else root.MomentProfile = api;
})(globalThis, function () {
  "use strict";
  // Profile and notice preferences (soft UI v1.1 "프로필", 2026-11-20). Kept in their own localStorage
  // key, never inside the diary IndexedDB snapshot. Notices are preferences only: nothing is sent.
  const KEY = "moment-card:profile-v1";
  const NAME_MAX = 12;
  const DEFAULT_NAME = "하루";
  const COLORS = Object.freeze(["#f3cdb6", "#ffb3c7", "#ffe49a", "#a6ebd6", "#aed6ff", "#d9c4ff"]);
  const DEFAULTS = Object.freeze({ name: DEFAULT_NAME, color: COLORS[0], notifyDaily: false, notifyAnalysis: false });
  const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  // Nickname: trimmed, inner whitespace collapsed, at most 12 characters (code points); empty → 하루.
  function normalizeName(value) {
    const name = Array.from(String(value ?? "").replace(/\s+/g, " ").trim()).slice(0, NAME_MAX).join("").trim();
    return name || DEFAULT_NAME;
  }
  function normalize(input) {
    const p = input && typeof input === "object" ? input : {};
    return {
      name: normalizeName(p.name),
      color: COLORS.includes(p.color) ? p.color : DEFAULTS.color,
      notifyDaily: p.notifyDaily === true,
      notifyAnalysis: p.notifyAnalysis === true,
    };
  }
  // Storage may be missing or throw (private mode, blocked site data); the defaults are used then.
  function load(storage) {
    try {
      const raw = storage?.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch { return normalize(null); }
  }
  function save(storage, profile) {
    const next = normalize(profile);
    try { storage?.setItem(KEY, JSON.stringify(next)); return { profile: next, stored: true }; }
    catch { return { profile: next, stored: false }; }
  }
  function parse(date) {
    const m = DATE.exec(date || "");
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
  }
  // "moment와 함께한 지 N일째": the first record day counts as day 1. Null without a valid first date.
  function daysTogether(firstDate, today) {
    const a = parse(firstDate), b = parse(today);
    if (!a || !b) return null;
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }
  // Plain-text export of the real records, oldest first. `label(record)` describes the card state.
  function exportText(records, { exportedAt = "", label = () => "" } = {}) {
    const list = (Array.isArray(records) ? records : [])
      .filter(r => r && typeof r.text === "string" && parse(r.recordDate))
      .slice()
      .sort((x, y) => x.recordDate.localeCompare(y.recordDate) || String(x.createdAt || "").localeCompare(String(y.createdAt || "")));
    const head = `오늘의 모먼트 · 기록 내보내기\n내보낸 날: ${exportedAt}\n기록 ${list.length}편\n`;
    const body = list.map(r => {
      const card = label(r);
      return `\n=== ${r.recordDate} (${WEEKDAYS[parse(r.recordDate).getUTCDay()]}) ===\n${card ? "카드: " + card + "\n" : ""}\n${r.text.replace(/\r\n?/g, "\n").trim()}\n`;
    }).join("");
    return head + (list.length ? body : "\n내보낼 기록이 없어요.\n");
  }
  function exportFileName(date) {
    return `moment-records-${parse(date) ? date.replaceAll("-", "") : "export"}.txt`;
  }
  return { KEY, NAME_MAX, DEFAULT_NAME, COLORS, DEFAULTS, normalize, normalizeName, load, save, daysTogether, exportText, exportFileName };
});
