// Home and archive share the same record rows and ordering.
function recordRow(record) {
  const card = DiaryCards.resolve(record);
  return `<button type="button" class="entry" data-open="${E(record.id)}"><span class="mini-art" data-grade="${DiaryCards.grade(card)}" aria-hidden="true">${miniCard(record)}</span><span class="entry-meta"><strong class="entry-preview">${E(record.text.split("\n")[0])}</strong><small>${E(record.recordDate)} · ${E(timeLabel(record.createdAt))}</small><span class="entry-state">${record.favorite ? "★ 즐겨찾기 · " : ""}${E(cardLabel(record))}</span></span><span aria-hidden="true" class="entry-arrow">›</span></button>`;
}
// Live counter shown under the editor; hidden from the live region to avoid per-keystroke announcements.
function charCountText(text) {
  const s = DiaryCore.lengthState(text), n = s.count.toLocaleString("ko-KR"), max = s.limit.toLocaleString("ko-KR");
  if (s.level === "over") return { level: s.level, label: `${n} / ${max}자 · ${(s.count - s.limit).toLocaleString("ko-KR")}자 초과` };
  if (s.level === "warn") return { level: s.level, label: `${n} / ${max}자 · 곧 한도예요` };
  return { level: s.level, label: `${n} / ${max}자` };
}
function charCount() {
  const c = charCountText(state.text);
  return `<span id="char-count" class="char-count" data-level="${c.level}">${E(c.label)}</span>`;
}
// Warns from 25 real records so the 30-record limit never arrives as a save error first.
function limitNotice() {
  const s = DiaryCore.recordLimitState(state.mode === "real" ? state.sessions.length : 0);
  if (s.level === "full") return `<p id="privacy" class="privacy-note limit-note" data-level="full">보관 한도 30편에 도달했어요. 새 기록은 정리한 뒤에 남길 수 있어요. ${btn("archive-records", "지난 기록 정리하기")}</p>`;
  if (s.level === "near") return `<p id="privacy" class="privacy-note limit-note" data-level="near">이 브라우저에만 보관돼요 · <strong>${s.remaining}편 남았어요</strong> (최대 30편)</p>`;
  return `<p id="privacy" class="muted privacy-note">이 브라우저에만 보관돼요 · 최대 30편</p>`;
}
// Shown until the first record exists: how a record becomes an analyzed card.
function firstRunGuide() {
  return `<ol class="first-run" aria-label="이렇게 사용해요"><li>오늘의 기록을 한 줄이라도 남겨요.</li><li>감정 분석 모델이 기록을 읽어요. <small>지금은 분석 준비 중이에요.</small></li><li>분석된 감정이 카드와 캐릭터 도감으로 모여요.</li></ol><p class="small muted latest-storage">분류 확률은 감정의 강도가 아니에요. 설정 › 예시 모드에서 미리 볼 수 있어요.</p>`;
}
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const dayLabel = date => `${date} (${WEEKDAYS[new Date(date + "T12:00:00").getDay()]})`;
const monthTitle = month => `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;
// First non-empty line of the day's latest record, cut to a few words for calendar cells.
const SNIPPET_LIMIT = 24;
function daySnippet(date) {
  const record = repository.query({ date }).slice().sort(compareRecords)[0];
  const line = record ? record.text.split("\n").map(s => s.trim()).find(Boolean) || "" : "";
  return line.length > SNIPPET_LIMIT ? line.slice(0, SNIPPET_LIMIT) + "…" : line;
}
// Count, analyzed emotion and snippet of one day; month summaries are cached per render call.
function dayInfo(date, cache = {}) {
  const month = date.slice(0, 7);
  cache[month] ||= DiaryStatistics.monthSummary(repository.query({ month }), month);
  const day = cache[month].days.find(d => d.date === date);
  return { count: day?.count || 0, emotion: DiaryStatistics.dayEmotion(day), snippet: daySnippet(date) };
}
const shortDate = date => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일`;
function dayLabelText(date, info) {
  const today = date === localDate();
  return `${shortDate(date)} ${WEEKDAYS[new Date(date + "T12:00:00").getDay()]}요일${today ? ", 오늘" : ""}, ${info.count ? "기록 " + info.count + "편" : "기록 없음"}${info.emotion ? ", 대표 감정 " + CardexCore.type(info.emotion).name : ""}${info.snippet ? ", " + info.snippet : ""}`;
}
// One month of day buttons ("일별"). A day shows the first words of its record and its analyzed
// representative emotion as a tint; unanalyzed records never get an emotion color.
function monthCalendar(month) {
  const stats = DiaryStatistics.monthSummary(repository.query({ month }), month), cache = { [month]: stats };
  const first = new Date(month + "-01T12:00:00").getDay();
  const total = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const cells = Array.from({ length: total }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    const info = dayInfo(date, cache), today = date === localDate();
    const dot = info.emotion ? `<i class="day-emotion" style="background:var(--${info.emotion})" aria-hidden="true"></i>` : "";
    return `<button type="button" class="calendar-day ${info.count ? "has-records" : ""} ${today ? "is-today" : ""} ${(first + i) % 7 === 0 ? "is-sunday" : ""}" data-month-date="${date}" aria-label="${E(dayLabelText(date, info))}" ${today ? 'aria-current="date"' : ""}${info.emotion ? ` style="--day-tone:var(--${info.emotion})"` : ""}><strong>${i + 1}</strong><span class="day-snippet">${info.snippet ? E(info.snippet) : today ? "TODAY" : ""}</span>${dot}</button>`;
  });
  return { stats, html: `<div class="calendar-grid">${WEEKDAYS.map((d, i) => `<span class="weekday${i === 0 ? " is-sunday" : ""}">${d}</span>`).join("")}${'<span aria-hidden="true"></span>'.repeat(first)}${cells.join("")}</div>` };
}
// Seven rows of one week ("주별"): weekday, date and the first words of that day's record.
function weekCalendar(start) {
  const today = localDate(), cache = {};
  const rows = DiaryStatistics.weekDates(start).map((date, i) => {
    const info = dayInfo(date, cache), isToday = date === today, future = date > today;
    const dot = info.emotion ? `<i class="day-emotion" style="background:var(--${info.emotion})" aria-hidden="true"></i>` : "";
    const text = info.snippet ? E(info.snippet) : isToday ? "오늘의 기록을 기다려요" : future ? "" : "기록 없음";
    return `<li><button type="button" class="calendar-day week-row ${info.count ? "has-records" : ""} ${isToday ? "is-today" : ""} ${i === 0 ? "is-sunday" : ""}" data-month-date="${date}" aria-label="${E(dayLabelText(date, info))}" ${isToday ? 'aria-current="date"' : ""} ${future ? "disabled" : ""}${info.emotion ? ` style="--day-tone:var(--${info.emotion})"` : ""}><span class="week-date"><b>${WEEKDAYS[i]}</b><strong>${Number(date.slice(8))}</strong></span><span class="day-snippet">${isToday && !info.snippet ? "TODAY · " : ""}${text}</span>${dot}</button></li>`;
  });
  return `<ol class="week-list" aria-label="${E(weekTitle(start))}">${rows.join("")}</ol>`;
}
function weekTitle(start) {
  const end = DiaryStatistics.addDays(start, 6);
  return `${shortDate(start)} ~ ${start.slice(5, 7) === end.slice(5, 7) ? Number(end.slice(8)) + "일" : shortDate(end)}`;
}
// Keeps the week view inside the month the user just moved to (this week for the current month).
function syncCalendarWeek(month) {
  const today = localDate();
  state.calendarWeek = DiaryStatistics.weekStart(month === today.slice(0, 7) ? today : month + "-01");
}
// [주별 | 일별] switch shared by the record calendar (desktop) and the statistics calendar (phones).
function calendarSwitch() {
  return `<div class="calendar-switch" role="group" aria-label="달력 보기">${[["week", "주별"], ["day", "일별"]].map(([id, label]) => `<button type="button" data-calendar-view="${id}" aria-pressed="${state.calendarView === id}">${label}</button>`).join("")}</div>`;
}
// Round previous/next button with an SVG chevron, so the mark sits in the exact centre
// (text glyphs like ‹ › sit on the font baseline and drift low).
function navArrow(dir, attrs, label, disabled = false) {
  return `<button type="button" class="nav-arrow" data-dir="${dir < 0 ? "prev" : "next"}" ${attrs} aria-label="${label}" ${disabled ? "disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5.5 8.5 12l6.5 6.5"/></svg></button>`;
}
function weekNav(level = 2) {
  const latest = state.calendarWeek >= DiaryStatistics.weekStart(localDate());
  return `<div class="calendar-head week-head">${navArrow(-1, 'data-week-step="-1"', "이전 주")}<div><h${level} class="calendar-title">${weekTitle(state.calendarWeek)}</h${level}></div>${navArrow(1, 'data-week-step="1"', "다음 주", latest)}</div>`;
}
function homeCalendar() {
  const month = state.homeMonth || localDate().slice(0, 7), thisMonth = localDate().slice(0, 7);
  const head = state.calendarView === "week" ? weekNav()
    : `<div class="calendar-head">${navArrow(-1, 'data-home-month="-1"', "이전 달")}<div><h2 class="calendar-title">${monthTitle(month)}</h2><p class="small muted">날짜를 누르면 그날의 기록이 보여요</p></div>${navArrow(1, 'data-home-month="1"', "다음 달", month >= thisMonth)}</div>`;
  return `<section class="panel calendar-panel" aria-label="나의 기록 달력">${calendarSwitch()}${head}${state.calendarView === "week" ? weekCalendar(state.calendarWeek) : monthCalendar(month).html}</section>`;
}
// 말해보카-style strip for the current week: written days get a filled check stamp.
function weekStreak() {
  const today = localDate(), dates = DiaryStatistics.weekDates(today);
  const written = dates.map(date => repository.query({ date }).length > 0);
  const cells = dates.map((date, i) => {
    const isToday = date === today, future = date > today, done = written[i];
    const label = `${shortDate(date)} ${WEEKDAYS[i]}요일${isToday ? ", 오늘" : ""}, ${done ? "기록함" : future ? "아직 오지 않은 날" : "기록 없음"}`;
    const inner = `<span class="streak-label">${isToday ? "오늘" : WEEKDAYS[i]}</span><span class="streak-mark" aria-hidden="true">${done ? "✓" : Number(date.slice(8))}</span>`;
    const cls = `week-day${done ? " is-done" : ""}${isToday ? " is-today" : ""}${future ? " is-future" : ""}${i === 0 ? " is-sunday" : ""}`;
    return `<li>${done ? `<button type="button" class="${cls}" data-month-date="${date}" aria-label="${label}">${inner}</button>` : `<span class="${cls}" role="img" aria-label="${label}">${inner}</span>`}</li>`;
  });
  const count = written.filter(Boolean).length;
  return `<section class="week-streak" aria-label="이번 주 기록"><p class="streak-title"><strong>이번 주 ${count}일</strong> 기록했어요${written[dates.indexOf(today)] ? "" : " · 오늘도 남겨 볼까요?"}</p><ol class="streak-days">${cells.join("")}</ol></section>`;
}
// The saved record's card opens on the card page right after saving (2026-11-20), so the home
// screen no longer carries a "today's card" row; saved records are reached from recent records.
function homeView() {
  const recent = activeRecords().slice().sort(compareRecords).slice(0, 3);
  const latest = recent[0];
  return `<section class="editor home-editor" aria-labelledby="write-title"><div class="editor-content">
    <div class="chip-row"><span class="chip chip-today">TODAY · ${E(dayLabel(state.date))}</span><span class="chip${state.mode === "example" ? " example-badge" : ""}">${state.mode === "example" ? "예시 모드 · " : ""}하루 한 편</span></div>
    ${weekStreak()}
    <h1 id="write-title"><span class="desktop-title">오늘은 어떤 하루였나요?</span><span class="mobile-title">오늘은 어떤 하루였나요?</span></h1>
    <label for="diary-text" class="sr-only">오늘의 기록</label><textarea id="diary-text" placeholder="마음에 남은 순간을 적어 보세요." aria-describedby="char-count privacy save-status feedback">${E(state.text)}</textarea>
    <div class="storage-row">${charCount()}<span id="save-status" role="status">${E(storageMessage)}</span><button type="button" class="storage-details" data-action="storage-details" ${lastStorageError || !storeReady ? '' : 'hidden'}>저장 실패 · 원문은 유지돼요 ⓘ</button></div>
    ${limitNotice()}
    </div><div class="write-actions">${btn(lastStorageError ? "retry-save" : "save", lastStorageError ? "저장 재시도" : "기록 남기기 · 오늘의 카드 받기", "primary")}${more("draft-more", btn("help-write", "무엇을 쓸까요?", "quiet", 'aria-haspopup="dialog"') + btn("clear-draft", "초안 지우기") + '<p class="menu-note">기록은 다른 기기와 동기화되지 않아요. 브라우저 데이터를 삭제하면 기록도 사라져요.</p>', "작성 옵션")}</div></section>
    <aside class="home-aside" aria-label="나의 기록 달력과 최근 기록">${homeCalendar()}
    <section class="panel recent-panel" aria-labelledby="recent-title"><div class="row"><h2 id="recent-title">최근 기록 <small class="muted">${activeRecords().length}편</small></h2><div class="recent-tools">${btn("archive-records", "⌕ 기록 검색", "chip")}${btn("favorite-records", "☆ 즐겨찾기만", "chip")}</div></div><div class="entry-list recent-list">${recent.map(recordRow).join("") || '<div class="recent-empty"><span class="mystery-mini" aria-hidden="true">?</span><div><strong>아직 기록이 없어요</strong><small>첫 기록을 남기면 카드가 도착해요.</small></div></div>'}</div>${latest ? "" : firstRunGuide()}</section></aside>`;
}
// Soft UI v1.1 top bar: brand on the left, three tabs in the middle, the profile avatar on
// the right (settings live on the profile page). Under 960px the tabs become a floating
// bottom bar (CSS only) while the brand and avatar stay at the top.
const NAV_TABS = [
  { id: "record", action: "write", label: "기록", icon: '<path d="M4 17.5V20h2.5L17 9.5 14.5 7 4 17.5Z"/><path d="m14.5 7 2.5 2.5 1.6-1.6a1.4 1.4 0 0 0 0-2L17.1 4.4a1.4 1.4 0 0 0-2 0L13.5 6"/>' },
  { id: "review", action: "review-month", label: "통계", icon: '<path d="M5 20v-8M12 20V5M19 20v-5"/><path d="M3.5 20h17"/>' },
  { id: "catalog", action: "catalog", label: "도감", icon: '<rect x="4.5" y="4" width="11" height="15" rx="2.5"/><path d="M18.5 7.5v10a3 3 0 0 1-3 3H9"/>' },
];
function currentTab() {
  if (state.view === "settings" || state.view === "themes") return "profile";
  if (state.view === "history") return state.archiveTab === "stats" ? "review" : state.archiveTab === "catalog" ? "catalog" : "record";
  if (state.view === "share") return state.shareFrom === "catalog" ? "catalog" : "record";
  return "record";
}
function mainNavigation() {
  const current = currentTab(), tab = NAV_TABS.find(t => t.id === current);
  const title = state.view === "share" ? "공유하기" : state.view === "history" && state.archiveTab === "records" ? "지난 기록" : current === "profile" ? "프로필" : tab.label;
  const tabs = NAV_TABS.map(t => btn(t.action, `<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg><span>${t.label}</span>`, "tab", t.id === current ? 'aria-current="page"' : "")).join("");
  return `<button type="button" class="brand" data-action="write" aria-label="오늘의 모먼트 · 기록으로"><span class="brand-dot" aria-hidden="true"></span><span class="brand-word">moment</span><span class="screen-title sr-only">${title}</span></button><nav class="tabs" aria-label="주요 메뉴">${tabs}</nav><button type="button" class="avatar" data-action="settings" aria-label="프로필·설정"${current === "profile" ? ' aria-current="page"' : ""}><span class="avatar-face" aria-hidden="true"></span></button>`;
}
