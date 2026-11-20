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
// ── Soft UI v1.1 record screen (Figma "기록 · 입력됨", "월간 달력", "카드 모달") ──
const weekdayName = date => WEEKDAYS[new Date(date + "T12:00:00").getDay()] + "요일";
const longDate = date => `${shortDate(date)} ${weekdayName(date)}`;
// The day's latest record (real records are one per day; the example set has two on some days).
// Reads activeRecords() directly so an archive card filter never hides a calendar day.
function dayRecord(date) {
  return activeRecords().filter(r => r.recordDate === date).sort(compareRecords)[0] || null;
}
// Dates that have a record, oldest first (the card modal steps through these).
function recordDays() {
  return [...new Set(activeRecords().map(r => r.recordDate))].sort();
}
const SAVE_LABEL = '<span class="save-long">기록하고 </span>카드 받기';
// One calendar slot: the day's mini card (opens the card modal) or an empty frame.
// Today has an ink outline; days after today are dashed and never clickable.
function dayCard(date, today) {
  const record = dayRecord(date), isToday = date === today, future = date > today;
  const label = `${longDate(date)}${isToday ? ", 오늘" : ""}, ${record ? cardLabel(record) + ", " + firstLine(record.text, SNIPPET_LIMIT) : future ? "아직 오지 않은 날" : "기록 없음"}`;
  const cls = `day-card${isToday ? " is-today" : ""}${future ? " is-future" : ""}${record ? " has-record" : ""}`;
  const current = isToday ? ' aria-current="date"' : "";
  return record
    ? `<button type="button" class="${cls}" data-card-day="${date}" aria-label="${E(label)}"${current}>${miniCard(record)}</button>`
    : `<span class="${cls}" role="img" aria-label="${E(label)}"${current}><span class="day-slot"></span></span>`;
}
// 주간: seven mini cards, Sunday to Saturday.
function weekRail() {
  const today = localDate();
  return `<ol class="week-rail" aria-label="${E(weekTitle(state.calendarWeek))}">${DiaryStatistics.weekDates(state.calendarWeek).map((date, i) => `<li><span class="rail-day${i === 0 ? " is-sunday" : ""}" aria-hidden="true">${date === today ? "오늘" : WEEKDAYS[i]}</span>${dayCard(date, today)}</li>`).join("")}</ol>`;
}
// 월간: the whole month as mini cards; the row below opens the latest recorded day of the month.
function monthCards(month) {
  const today = localDate(), first = new Date(month + "-01T12:00:00").getDay();
  const total = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const cells = Array.from({ length: total }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    return `<div class="month-cell${(first + i) % 7 === 0 ? " is-sunday" : ""}"><span class="cell-date" aria-hidden="true">${i + 1}</span>${dayCard(date, today)}</div>`;
  });
  const days = recordDays().filter(d => d.startsWith(month));
  const pick = days.includes(state.calendarDay) ? state.calendarDay : days[days.length - 1];
  const record = pick ? dayRecord(pick) : null;
  const summary = record
    ? `<button type="button" class="month-summary-row" data-card-day="${pick}"><span><strong>${E(longDate(pick))}${pick === today ? " · 오늘" : ""}</strong><small>${E(cardLabel(record))} · ${E(firstLine(record.text, SNIPPET_LIMIT))}</small></span><span class="entry-arrow" aria-hidden="true">›</span></button>`
    : `<p class="month-summary-row is-empty muted">이 달에는 아직 기록이 없어요.</p>`;
  return `<div class="month-cards" aria-label="${E(monthTitle(month))} 카드 달력">${WEEKDAYS.map((d, i) => `<span class="weekday${i === 0 ? " is-sunday" : ""}" aria-hidden="true">${d}</span>`).join("")}${'<span class="month-cell is-pad" aria-hidden="true"></span>'.repeat(first)}${cells.join("")}</div>${summary}`;
}
function writeCalendar() {
  const monthView = state.writeCalendar === "month", today = localDate(), thisMonth = today.slice(0, 7);
  const month = state.homeMonth || thisMonth;
  const streak = DiaryStatistics.streakDays(activeRecords().map(r => r.recordDate), today);
  const label = DiaryStatistics.weekLabel(state.calendarWeek);
  const nav = monthView
    ? `${navArrow(-1, 'data-home-month="-1"', "이전 달")}<h2 class="calendar-title">${monthTitle(month)}</h2>${navArrow(1, 'data-home-month="1"', "다음 달", month >= thisMonth)}`
    : `${navArrow(-1, 'data-week-step="-1"', "이전 주")}<h2 class="calendar-title">${label.month}월 ${label.week}주<span class="sr-only"> (${E(weekTitle(state.calendarWeek))})</span></h2>${navArrow(1, 'data-week-step="1"', "다음 주", state.calendarWeek >= DiaryStatistics.weekStart(today))}`;
  const toggle = `<div class="calendar-switch" role="group" aria-label="달력 보기">${[["week", "주간"], ["month", "월간"]].map(([id, text]) => `<button type="button" data-write-calendar="${id}" aria-pressed="${(state.writeCalendar || "week") === id}">${text}</button>`).join("")}</div>`;
  return `<section class="panel write-calendar" aria-label="나의 카드 달력"><div class="calendar-head"><div class="calendar-nav">${nav}</div>${streak ? `<span class="streak-chip">${streak}일 연속</span>` : ""}${toggle}</div>${monthView ? monthCards(month) : weekRail()}</section>`;
}
// Today's card: the saved record's mini card, or a fan of locked cards until today is written.
function todayPanel() {
  const today = localDate(), record = dayRecord(today);
  if (record) {
    const card = DiaryCards.resolve(record);
    const copy = card.status === "ready" ? "카드를 눌러 그날의 기록과 함께 볼 수 있어요" : card.status === "pending" ? "감정 분석이 끝나면 카드가 열려요" : "카드를 눌러 오늘의 기록을 볼 수 있어요";
    return `<section class="panel today-panel has-card" aria-labelledby="today-title"><button type="button" class="today-card" data-card-day="${today}" aria-label="오늘의 카드 열기, ${E(cardLabel(record))}">${miniCard(record)}</button><div class="today-copy"><p class="today-eyebrow">오늘의 카드</p><h2 id="today-title">${E(cardLabel(record))}</h2><p class="muted">${copy}</p></div></section>`;
  }
  const failed = state.mode === "real" && !loading && Boolean(lastStorageError || !storeReady);
  return `<section class="panel today-panel" aria-labelledby="today-title"><span class="card-fan" aria-hidden="true"><span class="fan-card f1"></span><span class="fan-card f2"></span>${lockedMiniCard("오늘의 카드")}</span><div class="today-copy"><p class="today-eyebrow">TODAY</p><h2 id="today-title">오늘의 카드</h2><p class="muted today-hint">${failed ? "저장되면 카드가 열려요" : "기록을 남기면 카드가 열려요"}</p></div></section>`;
}
// Recent record tile: emotion-colored orb, first line, "11.17 · 기쁨·활력 · 2단계". Opens the record page.
function recentTile(record) {
  const card = DiaryCards.resolve(record), ready = card.status === "ready";
  const meta = `${record.recordDate.slice(5).replace("-", ".")} · ${ready ? CardexCore.type(card.type).name + " · " + card.stage + "단계" : cardLabel(record)}${record.favorite ? " · ★" : ""}`;
  return `<button type="button" class="entry recent-tile" data-open="${E(record.id)}" data-grade="${DiaryCards.grade(card)}"><span class="tile-orb" aria-hidden="true"${ready ? ` style="--orb:var(--card-base-${card.type.replace("_", "-")});--orb-deep:var(--card-deep-${card.type.replace("_", "-")})"` : ""}></span><strong class="entry-preview">${E(firstLine(record.text, 40))}</strong><small>${E(meta)}</small></button>`;
}
function homeView() {
  const recent = activeRecords().slice().sort(compareRecords).slice(0, 2);
  const failed = Boolean(!loading && (lastStorageError || !storeReady));
  const example = state.mode === "example" ? '<span class="chip example-badge">예시 모드</span>' : "";
  return `<section class="write-main" aria-labelledby="write-title">
    <div class="page-heading write-heading"><p class="page-date">${E(longDate(state.date))}${example}</p><h1 id="write-title">오늘은 어떤 하루였나요?</h1></div>
    <div class="panel write-panel write-editor" data-storage-error="${failed}">
      <label for="diary-text" class="sr-only">오늘의 기록</label><textarea id="diary-text" placeholder="마음에 남은 순간을 적어 보세요. 하루에 한 편이에요." aria-describedby="char-count privacy save-status feedback">${E(state.text)}</textarea>
      <div class="write-bar"><span class="status-dot" aria-hidden="true"></span><p class="write-status">${charCount()}<span class="status-sep" aria-hidden="true"> · </span><span id="save-status" role="status">${E(storageMessage)}</span></p><p class="save-error"><strong>저장하지 못했어요.</strong> 다시 시도해 주세요. <button type="button" class="storage-details" data-action="storage-details" ${failed ? "" : "hidden"}>저장 실패 원인 ⓘ</button></p><div class="write-actions">${more("draft-more", btn("help-write", "무엇을 쓸까요?", "quiet", 'aria-haspopup="dialog"') + btn("clear-draft", "초안 지우기") + '<p class="menu-note">기록은 다른 기기와 동기화되지 않아요. 브라우저 데이터를 삭제하면 기록도 사라져요.</p>', "작성 옵션")}${btn(lastStorageError ? "retry-save" : "save", lastStorageError ? "다시 시도" : SAVE_LABEL, "primary")}</div></div>
      <p class="save-note">작성한 내용은 이 화면에 그대로 남아 있어요. 저장되기 전에 창을 닫으면 사라질 수 있어요.</p>
    </div>
    ${limitNotice()}
    <section class="recent-panel" aria-labelledby="recent-title"><div class="recent-head"><h2 id="recent-title">최근 기록 <small class="muted">${activeRecords().length}편</small></h2><div class="recent-tools">${btn("favorite-records", "☆ 즐겨찾기", "text-link")}${btn("archive-records", "전체 보기", "text-link")}</div></div><div class="recent-list">${recent.map(recentTile).join("") || '<div class="recent-empty"><span class="mystery-mini" aria-hidden="true">?</span><div><strong>아직 기록이 없어요</strong><small>첫 기록을 남기면 카드가 도착해요.</small></div></div>'}</div>${recent.length ? "" : firstRunGuide()}</section>
  </section>
  <aside class="write-side" data-view="${state.writeCalendar === "month" ? "month" : "week"}" aria-label="오늘의 카드와 카드 달력">${todayPanel()}${writeCalendar()}</aside>`;
}
// Card modal (desktop dialog, bottom sheet on phones): the day's card, ‹ › between recorded
// days, the record text and share / catalog actions. Survives re-renders through state.cardModal.
function cardModalHTML(date) {
  const record = dayRecord(date);
  if (!record) return "";
  const card = DiaryCards.resolve(record), ready = card.status === "ready";
  const days = recordDays(), i = days.indexOf(date);
  const title = ready ? `${CardexCore.type(card.type).name} · ${card.stage}단계` : card.status === "blank" ? "빈 카드" : card.status === "error" ? "분석 실패" : "분석 대기 카드";
  const meta = ready ? `${cardNumber(card.type, card.stage)} · 최고 확률 ${Math.round(card.score * 100)}% · 임시 분류${card.ties.length > 1 ? " · 공동 최다" : ""}`
    : card.status === "pending" ? "감정 분석이 연결되면 카드가 열려요" : card.status === "blank" ? "뚜렷한 대표 감정이 없는 기록이에요" : "기록은 그대로 읽을 수 있어요";
  const count = Array.from(record.text).length.toLocaleString("ko-KR");
  const actions = (["ready", "blank"].includes(card.status) ? `<button type="button" class="primary" data-modal="share">공유하기</button>` : "")
    + (ready ? `<button type="button" class="quiet" data-modal="catalog">도감에서 보기</button>` : "")
    + `<button type="button" class="quiet" data-modal="open">기록 자세히</button>`;
  return `<div class="cm-art" data-grade="${DiaryCards.grade(card)}">${cardSVG(record)}</div>
    <div class="cm-info">
      <div class="cm-top"><div class="cm-nav" role="group" aria-label="기록한 날 이동">${navArrow(-1, 'data-modal-step="-1"', "이전 기록", i <= 0)}<strong class="cm-date" aria-live="polite">${E(longDate(date))}</strong>${navArrow(1, 'data-modal-step="1"', "다음 기록", i >= days.length - 1)}</div><button type="button" class="quiet cm-close" data-modal="close" aria-label="닫기">✕</button></div>
      <h2 id="card-modal-title">${E(title)}</h2>
      <p class="cm-meta">${E(meta)}${state.mode === "example" ? " · 예시" : ""}</p>
      <p class="cm-label">그날의 기록</p>
      <div class="cm-text" tabindex="0">${E(record.text)}</div>
      <div class="cm-actions">${actions}<small class="muted">${count}자</small></div>
    </div>`;
}
function openCardModal(date) {
  const dialog = app.querySelector("#card-modal"), html = cardModalHTML(date);
  if (!dialog || !html) { state.cardModal = null; return; }
  state.cardModal = date;
  state.calendarDay = date;
  dialog.innerHTML = html;
  dialog.querySelectorAll("[data-modal-step]").forEach(b => b.onclick = () => {
    const step = Number(b.dataset.modalStep), days = recordDays(), next = days[days.indexOf(state.cardModal) + step];
    if (!next) return;
    openCardModal(next);
    const same = dialog.querySelector(`[data-modal-step="${step}"]`);
    (same && !same.disabled ? same : dialog.querySelector(`[data-modal-step="${-step}"]`))?.focus();
  });
  dialog.querySelectorAll("[data-modal]").forEach(b => b.onclick = () => {
    const record = dayRecord(state.cardModal), kind = b.dataset.modal;
    if (kind === "close" || !record) { dialog.close(); return; }
    state.cardModal = null;
    dialog.close();
    if (kind === "share") { openShare(record.id, "record"); return; }
    if (kind === "catalog") {
      const c = DiaryCards.resolve(record);
      Object.assign(state, { selected: record.id, catalogType: c.type, catalogStage: c.stage, catalogDetail: null, cardFilter: null, view: "history", archiveTab: "catalog" });
    } else Object.assign(state, { selected: record.id, entryFrom: "write", recordTab: "card", catalogDetail: null, view: "entry", editing: false, deleteConfirm: false });
    render(true);
  });
  if (!dialog.open) {
    dialog.showModal();
    dialog.addEventListener("close", () => {
      if (!dialog.isConnected) return;
      const from = state.cardModal;
      state.cardModal = null;
      if (state.view === "write") (app.querySelector(`.write-side [data-card-day="${from}"]`) || app.querySelector("[data-card-day]"))?.focus({ preventScroll: true });
    }, { once: true });
  }
}
function bindHome() {
  app.querySelectorAll("[data-card-day]").forEach(b => b.onclick = () => openCardModal(b.dataset.cardDay));
  app.querySelectorAll("[data-write-calendar]").forEach(b => b.onclick = () => {
    state.writeCalendar = b.dataset.writeCalendar;
    if (state.writeCalendar === "week") syncCalendarWeek(state.homeMonth);
    else state.homeMonth = state.calendarWeek.slice(0, 7);
    render();
    app.querySelector(`[data-write-calendar="${state.writeCalendar}"]`)?.focus({ preventScroll: true });
  });
  const dialog = app.querySelector("#card-modal");
  // Backdrop click closes the modal (the dialog box itself fills its content area).
  dialog?.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  if (state.cardModal && state.view === "write") openCardModal(state.cardModal);
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
