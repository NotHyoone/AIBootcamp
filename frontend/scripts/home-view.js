// Home and archive share the same record rows and ordering.
function recordRow(record) {
  const card = DiaryCards.resolve(record);
  return `<button type="button" class="entry" data-open="${E(record.id)}"><span class="mini-art" aria-hidden="true">${card.status === "ready" ? characterSVG(card.type) : '<span class="record-glyph">✎</span>'}</span><span class="entry-meta"><strong class="entry-preview">${E(record.text.split("\n")[0])}</strong><small>${E(record.recordDate)} · ${E(timeLabel(record.createdAt))}</small><span class="entry-state">${record.favorite ? "★ 즐겨찾기 · " : ""}${E(cardLabel(record))}</span></span><span aria-hidden="true" class="entry-arrow">›</span></button>`;
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
// One month of day buttons shared by the record home and statistics. A day shows its analyzed
// representative emotion as a tint; unanalyzed records never get an emotion color.
function monthCalendar(month) {
  const stats = DiaryStatistics.monthSummary(repository.query({ month }), month);
  const first = new Date(month + "-01T12:00:00").getDay();
  const total = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const cells = Array.from({ length: total }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    const day = stats.days.find(d => d.date === date), count = day?.count || 0, emotion = DiaryStatistics.dayEmotion(day), today = date === localDate();
    const dot = emotion ? `<i class="day-emotion" style="background:var(--${emotion})" aria-hidden="true"></i>` : "";
    const label = `${date}${today ? ", 오늘" : ""}, 기록 ${count}편${emotion ? ", 대표 감정 " + CardexCore.type(emotion).name : ""}`;
    return `<button type="button" class="calendar-day ${count ? "has-records" : ""} ${today ? "is-today" : ""} ${(first + i) % 7 === 0 ? "is-sunday" : ""}" data-month-date="${date}" aria-label="${label}" ${today ? 'aria-current="date"' : ""}${emotion ? ` style="--day-tone:var(--${emotion})"` : ""}><strong>${i + 1}</strong><span>${count ? count + "편" : today ? "TODAY" : "·"}</span>${dot}</button>`;
  });
  return { stats, html: `<div class="calendar-grid">${WEEKDAYS.map((d, i) => `<span class="weekday${i === 0 ? " is-sunday" : ""}">${d}</span>`).join("")}${'<span aria-hidden="true"></span>'.repeat(first)}${cells.join("")}</div>` };
}
function homeCalendar() {
  const month = state.homeMonth || localDate().slice(0, 7), thisMonth = localDate().slice(0, 7);
  return `<section class="panel calendar-panel" aria-labelledby="calendar-title"><div class="calendar-head"><button type="button" class="icon" data-home-month="-1" aria-label="이전 달">‹</button><div><h2 id="calendar-title">${monthTitle(month)}</h2><p class="small muted">날짜를 누르면 그날의 기록이 보여요</p></div><button type="button" class="icon" data-home-month="1" aria-label="다음 달" ${month >= thisMonth ? "disabled" : ""}>›</button></div>${monthCalendar(month).html}</section>`;
}
// Card that arrived for the record just saved; opening it plays the reveal on the card screen.
function todayCard() {
  const record = state.currentEntryId && state.savedText === state.text ? activeRecords().find(r => r.id === state.currentEntryId) : null;
  if (!record || state.mode !== "real") return "";
  return `<div class="today-card" role="group" aria-label="오늘의 카드"><span class="mystery-mini" aria-hidden="true">?</span><div><strong>오늘의 카드가 도착했어요</strong><small>${E(cardLabel(record))} · <span class="latest-storage">${lastStorageError || !storeReady ? "저장 확인이 필요해요" : "기록을 보관했어요 · 분석은 준비 중"}</span></small></div><button type="button" class="secondary" data-open="${E(record.id)}">카드 열기</button></div>`;
}
function homeView() {
  const recent = activeRecords().slice().sort(compareRecords).slice(0, 3);
  const latest = recent[0];
  return `<section class="editor home-editor" aria-labelledby="write-title"><div class="editor-content">
    <div class="chip-row"><span class="chip chip-today">TODAY · ${E(dayLabel(state.date))}</span><span class="chip${state.mode === "example" ? " example-badge" : ""}">${state.mode === "example" ? "예시 모드 · " : ""}하루 한 편</span></div>
    <h1 id="write-title"><span class="desktop-title">오늘은 어떤 하루였나요?</span><span class="mobile-title">오늘은 어떤 하루였나요?</span></h1>
    ${todayCard()}
    <label for="diary-text" class="sr-only">오늘의 기록</label><textarea id="diary-text" placeholder="마음에 남은 순간을 적어 보세요." aria-describedby="char-count privacy save-status feedback">${E(state.text)}</textarea>
    <div class="storage-row">${charCount()}<span id="save-status" role="status">${E(storageMessage)}</span><button type="button" class="storage-details" data-action="storage-details" ${lastStorageError || !storeReady ? '' : 'hidden'}>저장 실패 · 원문은 유지돼요 ⓘ</button></div>
    ${limitNotice()}
    </div><div class="write-actions">${btn(lastStorageError ? "retry-save" : "save", lastStorageError ? "저장 재시도" : "기록 남기기 · 오늘의 카드 받기", "primary")}${more("draft-more", btn("help-write", "무엇을 쓸까요?", "quiet", 'aria-haspopup="dialog"') + btn("clear-draft", "초안 지우기") + '<p class="menu-note">기록은 다른 기기와 동기화되지 않아요. 브라우저 데이터를 삭제하면 기록도 사라져요.</p>', "작성 옵션")}</div></section>
    <aside class="home-aside" aria-label="나의 기록 달력과 최근 기록">${homeCalendar()}
    <section class="panel recent-panel" aria-labelledby="recent-title"><div class="row"><h2 id="recent-title">최근 기록 <small class="muted">${activeRecords().length}편</small></h2><div class="recent-tools">${btn("archive-records", "⌕ 기록 검색", "chip")}${btn("favorite-records", "☆ 즐겨찾기만", "chip")}</div></div><div class="entry-list recent-list">${recent.map(recordRow).join("") || '<div class="recent-empty"><span class="mystery-mini" aria-hidden="true">?</span><div><strong>아직 기록이 없어요</strong><small>첫 기록을 남기면 카드가 도착해요.</small></div></div>'}</div>${latest ? "" : firstRunGuide()}</section></aside>`;
}
// Four sticker tabs (Figma v0.3): the record tab holds writing, the calendar and recent records;
// the full archive opens from "기록 검색". Desktop shows stickers in the header; under 960px
// the same nav becomes the bottom sticker bar (CSS only), so every action exists exactly once.
const NAV_TABS = [
  { id: "record", action: "write", label: "기록", title: "기록", icon: '<path d="M4 17.5V20h2.5L17 9.5 14.5 7 4 17.5Z"/><path d="m14.5 7 2.5 2.5 1.6-1.6a1.4 1.4 0 0 0 0-2L17.1 4.4a1.4 1.4 0 0 0-2 0L13.5 6"/>' },
  { id: "review", action: "review-month", label: "통계", title: "감정 통계", icon: '<path d="M4 19c3-1 4-9 7-9s3 5 5 5 3-6 4-8"/>' },
  { id: "catalog", action: "catalog", label: "도감", title: "캐릭터 도감", icon: '<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20Z"/>' },
  { id: "settings", action: "settings", label: "설정", title: "설정", icon: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>' },
];
function currentTab() {
  if (state.view === "settings" || state.view === "themes") return "settings";
  if (state.view === "history") return state.archiveTab === "stats" ? "review" : state.archiveTab === "catalog" ? "catalog" : "record";
  if (state.view === "share") return state.shareFrom === "catalog" ? "catalog" : "record";
  return "record";
}
function mainNavigation() {
  const current = currentTab(), tab = NAV_TABS.find(t => t.id === current);
  const title = state.view === "share" ? "공유하기" : state.view === "history" && state.archiveTab === "records" ? "지난 기록" : tab.label;
  return `<div class="topbar-title"><button type="button" class="brand" data-action="write" aria-label="오늘의 모먼트 · 기록으로"><small>✦ MOMENT CARD · 오늘의 모먼트</small><span class="screen-title">${title}</span></button></div><nav class="tabs" aria-label="주요 메뉴">${NAV_TABS.map(t => btn(t.action, `<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg><span>${t.label}</span>`, "tab", t.id === current ? 'aria-current="page"' : "")).join("")}</nav>`;
}
