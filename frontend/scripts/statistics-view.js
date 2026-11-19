function archivePanel() {
  let body;
  if (state.archiveTab === "stats") body = statisticsPanel();
  else if (state.archiveTab === "catalog") body = catalogPanel();
  else {
    const records = repository.query({ date: state.dateFilter }).filter(r => (!state.favoritesOnly || r.favorite) && (!state.emotionFilter || (DiaryCards.resolve(r).status === "ready" && DiaryCards.resolve(r).type === state.emotionFilter)) && r.text.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
    if (state.sortOldest) records.reverse();
    const count = 6;
    const pages = Math.max(1, Math.ceil(records.length / count));
    state.page = Math.min(state.page, pages - 1);
    body = `<p class="muted">${state.mode === "example" ? "예시 모드 · 내 기록과 분리" : "내 기록 · 이 브라우저에 보관"}</p>${state.dateFilter ? `<div class="row"><span>${state.dateFilter}</span>${btn("clear-date", "날짜 필터 해제")}</div>` : ""}<div class="search-controls"><label for="record-search">기록 검색</label><input id="record-search" type="search" placeholder="기억나는 단어로 찾아보세요" value="${E(state.search)}"><details class="record-filters"><summary>필터${state.favoritesOnly || state.emotionFilter || state.dateFilter || state.cardFilter ? " · 적용 중" : ""}</summary><label class="favorite-filter"><input id="favorites-only" type="checkbox" ${state.favoritesOnly ? "checked" : ""}>즐겨찾기만</label><label class="emotion-filter">카드 감정 <select id="emotion-filter"><option value="">전체</option>${CardexCore.IDS.map(id => `<option value="${id}" ${state.emotionFilter === id ? "selected" : ""}>${E(CardexCore.type(id).name)}</option>`).join("")}</select></label></details><button type="button" class="quiet sort-toggle" data-sort aria-pressed="${state.sortOldest}">${state.sortOldest ? "오래된 순" : "최신 순"}</button>${state.search || state.favoritesOnly || state.emotionFilter || state.dateFilter || state.cardFilter ? btn("reset-search","필터 초기화") : ""}</div><p class="muted" role="status">${records.length}편의 기록</p><div class="entry-list">${
      records
        .slice(state.page * count, (state.page + 1) * count)
        .map(recordRow)
        .join("") || `<p>${state.dateFilter ? "이 날짜에는 기록이 없어요." : state.cardFilter ? "이 캐릭터와 연결된 기록이 없어요." : (state.search || state.favoritesOnly ? "조건에 맞는 기록이 없어요. 필터를 바꿔 보세요." : "아직 기록이 없어요. 오늘의 첫 문장을 남겨 보세요.")}</p>`
    }</div><div class="pagination" ${pages === 1 && !state.dateFilter && !state.cardFilter ? "hidden" : ""}>${pages > 1 ? btn("prev", "이전", "quiet", state.page === 0 ? "disabled" : "") + `<span>${state.page + 1} / ${pages}</span>` + btn("next", "다음", "quiet", state.page === pages - 1 ? "disabled" : "") : ""}${state.dateFilter ? btn("back-stats", "통계로") : ""}</div>`;
  }
  // Statistics and catalog are compositions of their own panels (Figma v0.3); the archive list stays one panel.
  if (state.archiveTab !== "records") return `<section class="archive-panel ${state.archiveTab}-page"><h2 class="sr-only">${state.archiveTab === "stats" ? "감정 통계" : "캐릭터 도감"}</h2>${body}</section>`;
  return `<section class="panel archive-panel records-page"><div class="row"><h2>지난 기록</h2>${btn("write", "← 기록으로")}</div>${body}</section>`;
}
// One-line monthly takeaway (How We Feel-style review), shown only with enough analyzed records.
function insightLine(stats) {
  if (!stats.total) return "";
  const s = DiaryStatistics.insight(stats);
  if (!s.ready) return `<p class="month-insight muted" data-ready="false">분석된 기록이 ${DiaryStatistics.INSIGHT_MINIMUM}편 이상이면 이번 달 요약을 보여 드려요. (지금 ${s.valid}편)</p>`;
  const names = s.leafTies.map(id => CardexCore.type(id).name).join("·");
  const parents = CardexCore.PARENTS.map(p => `${p.name} ${CardexCore.percent(s.parents[p.id])}`).join(" · ");
  // Three or more tied types read as an even spread rather than a long list of names.
  const lead = s.leafTies.length >= 3 ? `분석된 ${s.valid}편에서 <strong>여러 감정이 고르게</strong> 나타났어요.`
    : `분석된 ${s.valid}편에서 가장 큰 비중은 <strong>${E(names)}</strong>${s.leafTies.length > 1 ? "(같은 비중)" : ""}이에요.`;
  return `<p class="month-insight" data-ready="true">${lead} <span class="muted">${parents} · 감정의 강도가 아닌 분류 확률이에요.</span></p>`;
}
// Most frequent analyzed card of the month (latest record versions only), or null.
function monthTopCard(month) {
  const counts = {};
  for (const r of repository.query({ month })) {
    const c = DiaryCards.resolve(r);
    if (c.status === "ready") counts[c.type] = (counts[c.type] || 0) + 1;
  }
  const best = CardexCore.IDS.filter(id => counts[id]).sort((a, b) => counts[b] - counts[a])[0];
  return best ? { type: best, count: counts[best] } : null;
}
function distributionBlock(stats) {
  return `<div class="distribution" aria-label="분석된 기록의 평균 분류 확률">${CardexCore.PARENTS.map(p => `<section class="distribution-group" aria-label="${p.name}"><h3>${p.name}<span>${CardexCore.percent(stats.distribution.parents[p.id])}</span></h3>${p.children.map(id => {
    const t = CardexCore.type(id), value = stats.distribution.leaf[id];
    return `<div class="distribution-row"><span><i class="chip-dot" style="background:var(--${id})" aria-hidden="true"></i>${t.name}</span><div><i style="width:${value * 100}%;background:var(--${id})"></i></div><strong>${CardexCore.percent(value)}</strong></div>`;
  }).join("")}</section>`).join("")}</div>`;
}
const STATS_TABS = [["trend", "감정 추이"], ["count", "기록 달력"], ["distribution", "감정 분포"]];
const SERIES_DASH = ["0", "9 6", "2 6"];
// Phones get their own chart proportions so the trend stays tall at 390px wide.
const narrowStats = () => typeof matchMedia === "function" && matchMedia("(max-width: 959px)").matches;
// Days drawn on the x-axis: the current month stops at today instead of leaving an empty tail.
function trendDays(stats) {
  const today = localDate();
  if (state.month !== today.slice(0, 7)) return stats.days;
  const end = stats.days.findIndex(d => d.date === today);
  return end < 0 ? stats.days : stats.days.slice(0, end + 1);
}
function trendChart(stats) {
  const days = trendDays(stats), narrow = narrowStats();
  const W = narrow ? 360 : 720, H = narrow ? 240 : 300, left = narrow ? 34 : 42, right = W - (narrow ? 12 : 30), top = 14, base = H - 34;
  const span = Math.max(1, days.length - 1);
  const x = i => left + (right - left) * (days.length === 1 ? 0.5 : i / span), y = v => base - v * (base - top);
  let marks = "", defs = "", lines = "", areas = "", dots = "";
  // Soft guides: only the 50% line and the baseline, drawn faintly and dotted.
  for (const value of [0, 0.5, 1])
    marks += `<path class="${value ? "chart-guide" : "chart-base"}" d="M${left} ${y(value)}H${right}"/><text x="${left - 6}" y="${y(value) + 4}" text-anchor="end">${value * 100}%</text>`;
  // One gently curved line per parent emotion; dash patterns stay for colour-blind readers.
  CardexCore.PARENTS.forEach((p, index) => {
    defs += `<linearGradient id="trend-fill-${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--${p.id})" stop-opacity=".1"/><stop offset="1" stop-color="var(--${p.id})" stop-opacity="0"/></linearGradient>`;
    const points = days.map((d, i) => d.summary.validCount ? [x(i), y(d.summary.parents[p.id])] : null);
    for (const run of DiaryStatistics.smoothSegments(points)) {
      if (run.points.length > 1) {
        areas += `<path class="chart-area" data-series="${p.id}" d="${run.d}L${run.end[0]} ${base}L${run.start[0]} ${base}Z" fill="url(#trend-fill-${p.id})"/>`;
        lines += `<path class="chart-line" data-series="${p.id}" d="${run.d}" stroke="var(--${p.id})" stroke-dasharray="${SERIES_DASH[index]}"/>`;
      }
    }
    days.forEach((d, i) => {
      if (d.summary.validCount)
        dots += `<circle class="chart-dot" data-series="${p.id}" cx="${x(i)}" cy="${y(d.summary.parents[p.id])}" r="4" fill="var(--${p.id})"><title>${i + 1}일 · ${p.name} ${CardexCore.percent(d.summary.parents[p.id])}</title></circle>`;
    });
  });
  marks += areas + lines + dots;
  // Day labels: the first, every fifth (tenth on phones) and the last day; one that crowds the last is skipped.
  const last = days.length - 1, step = narrow && days.length > 20 ? 10 : 5;
  days.forEach((d, i) => {
    if (i === 0 || i === last || ((i + 1) % step === 0 && last - i >= 2))
      marks += `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" class="chart-day">${i + 1}일</text>`;
  });
  const focus = CardexCore.PARENTS.find(p => p.id === state.trendFocus);
  return `<svg class="stats-chart" viewBox="0 0 ${W} ${H}" data-days="${days.length}" data-left="${left}" data-right="${right}" data-width="${W}"${focus ? ` data-focus="${focus.id}"` : ""} role="img" aria-label="날짜별 감정 비중${focus ? ", " + focus.name + " 강조" : ""}, 기록 없는 구간은 공백"><defs>${defs}</defs>${marks}</svg>`;
}
// Small inline legend; each entry highlights its line (press again to show all evenly).
function trendLegend() {
  return `<div class="trend-legend" role="group" aria-label="강조할 감정">${CardexCore.PARENTS.map((p, i) => `<button type="button" class="trend-key" data-trend-focus="${p.id}" aria-pressed="${state.trendFocus === p.id}"><svg width="20" height="8" aria-hidden="true"><path d="M1 4H19" stroke="var(--${p.id})" stroke-width="3" stroke-linecap="round" stroke-dasharray="${["0", "5 4", "2 4"][i]}"/></svg>${p.name}</button>`).join("")}</div>`;
}
function statisticsPanel() {
  const stats = DiaryStatistics.monthSummary(
    repository.query({ month: state.month }),
    state.month,
  );
  // The date stepper belongs to the trend panel, so only analyzed days are offered.
  const available = stats.days.filter((x) => x.summary.validCount);
  if (!available.some((x) => x.date === state.statsDate))
    state.statsDate = available.at(-1)?.date || "";
  const selected = stats.days.find((x) => x.date === state.statsDate);
  const index = available.findIndex((x) => x.date === state.statsDate);
  const thisMonth = localDate().slice(0, 7);
  const top = monthTopCard(state.month);
  // Month changes only through the ‹ › buttons here (no separate month input).
  const nav = `<div class="stats-top"><div class="month-nav"><button type="button" class="quiet" data-month-step="-1" aria-label="이전 달">‹ 이전 달</button><strong class="month-title">${monthTitle(state.month)}</strong><button type="button" class="quiet" data-month-step="1" aria-label="다음 달" ${state.month >= thisMonth ? "disabled" : ""}>다음 달 ›</button></div><div class="chip-row"><span class="chip is-on">기록 ${stats.total}편 · 분석 ${stats.valid}편</span><span class="chip">${state.mode === "example" ? "예시 통계 · 실제 사용자 분석 아님" : "내 기록 통계 · 감정 분석은 준비 중"}</span></div></div>`;
  // Graph first: the month summary is a small card in the side column, not a banner above the chart.
  const summary = `<section class="panel stats-side stats-summary-card" aria-label="이번 달 요약"><span class="banner-card" aria-hidden="true">${top ? characterSVG(top.type) : '<span class="mystery-mini">?</span>'}</span><div><p class="banner-eyebrow">${top ? `이번 달 가장 많이 받은 카드 · ${E(CardexCore.type(top.type).name)} (${top.count}편)` : "이번 달 카드는 분석이 연결되면 모여요"}</p>${insightLine(stats) || `<p class="month-insight muted" data-ready="false">아직 이 달의 기록이 없어요.</p>`}</div></section>`;
  // Phones switch between the panels with buttons; desktop CSS hides the switch and the calendar
  // (it stays on the record tab) and shows the wide trend beside the summary and distribution.
  const switcher = `<div class="stats-switch" role="group" aria-label="통계 보기">${STATS_TABS.map(([id, label]) => `<button type="button" data-stats="${id}" aria-pressed="${state.statsTab === id}">${label}</button>`).join("")}</div>`;
  const dist = `<section class="panel stats-side stats-dist" aria-labelledby="dist-title"><div class="row"><h3 id="dist-title">감정 분포</h3><small class="muted">${CardexCore.IDS.length}종</small></div>${stats.valid ? distributionBlock(stats) + '<p class="muted small">분석된 기록의 평균 분류 확률이에요. 중립에는 객관적 서술·의문·놀람·당황을 포함해요.</p>' : '<p class="muted">분석된 기록이 생기면 감정별 비율을 보여 드려요.</p>'}</section>`;
  const calendar = `<section class="panel stats-calendar" aria-labelledby="stats-calendar-title"><div class="row"><h3 id="stats-calendar-title">기록 달력</h3></div><div class="month-summary"><strong>${stats.total}편의 기록</strong><span>${stats.days.filter(d=>d.count).length}일의 순간</span></div><p class="muted small">날짜를 누르면 그날의 글을 읽을 수 있어요. 점은 그날 분석된 대표 감정이에요. 미분석 기록에는 감정 색을 붙이지 않아요.</p>${calendarSwitch()}${state.calendarView === "week" ? weekNav(4) + weekCalendar(state.calendarWeek) : monthCalendar(state.month).html}</section>`;
  let graph;
  if (!stats.total)
    graph = `<div class="stats-empty"><p>아직 이 달의 기록이 없어요.</p>${btn("archive-records", "지난 기록 보기")}</div>`;
  else if (!stats.valid)
    graph = `<div class="stats-empty"><p>감정 분석은 준비 중이에요. 기록은 보관함에서 읽을 수 있어요.</p>${btn("archive-records", "지난 기록 보기")}</div>`;
  else graph = trendChart(stats) + `<p class="chart-note muted small">선이 끊긴 곳은 분석된 기록이 없는 날이에요${available.length === 1 ? " · 비교할 날짜가 더 필요해요" : ""}. 감정 비중은 감정의 강도가 아니라 분류 확률이에요.</p>`;
  const details = selected
    ? `${selected.count}편${selected.summary.validCount ? " · " + CardexCore.PARENTS.map((p) => p.name + " " + CardexCore.percent(selected.summary.parents[p.id])).join(" · ") : " · 감정 분석 없음"}`
    : "";
  const stepper = available.length ? `<div class="stats-detail"><div class="stats-day-nav" role="group" aria-label="분석된 날짜 이동">${navArrow(-1, 'data-stats-day="-1"', "이전 분석일", index <= 0)}<strong aria-live="polite">${E(dayLabel(state.statsDate))}</strong>${navArrow(1, 'data-stats-day="1"', "다음 분석일", index >= available.length - 1)}</div>${btn("date-records", "기록 보기")}<p>${E(details)}</p></div>` : "";
  const trend = `<section class="panel stats-main stats-trend" aria-labelledby="stats-main-title"><div class="row trend-head"><h3 id="stats-main-title">감정 추이</h3>${stats.valid ? trendLegend() : ""}</div><div class="graph-space">${graph}</div>${stepper}</section>`;
  return `${nav}${switcher}<div class="stats-grid" data-stats-tab="${state.statsTab}">${trend}${summary}${calendar}${dist}</div>`;
}
// Analyzed dates of the shown month, in order (the trend panel's selectable days).
function analyzedDays() {
  return DiaryStatistics.monthSummary(repository.query({ month: state.month }), state.month).days.filter((x) => x.summary.validCount).map((x) => x.date);
}
function bindStatistics() {
  app.querySelectorAll("[data-home-month]").forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.homeMonth);
    state.homeMonth = DiaryStatistics.shiftMonth(state.homeMonth, step, localDate().slice(0, 7));
    syncCalendarWeek(state.homeMonth);
    render();
    const same = app.querySelector(`[data-home-month="${step}"]`);
    (same && !same.disabled ? same : app.querySelector(`[data-home-month="${-step}"]`))?.focus();
  }));
  app.querySelectorAll("[data-archive]").forEach(
    (b) =>
      (b.onclick = () => {
        state.archiveTab = b.dataset.archive;
        state.dateFilter = "";
        state.cardFilter = null;
        render();
      }),
  );
  app.querySelectorAll("[data-stats]").forEach(
    (b) =>
      (b.onclick = () => {
        state.statsTab = b.dataset.stats;
        render();
        app.querySelector(`[data-stats="${b.dataset.stats}"]`)?.focus({ preventScroll: true });
      }),
  );
  // Previous/next analyzed day replaces the old date select (keyboard reachable buttons).
  app.querySelectorAll("[data-stats-day]").forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.statsDay), days = analyzedDays();
    const next = days[days.indexOf(state.statsDate) + step];
    if (!next) return;
    state.statsDate = next;
    render();
    const same = app.querySelector(`[data-stats-day="${step}"]`);
    (same && !same.disabled ? same : app.querySelector(`[data-stats-day="${-step}"]`))?.focus();
  }));
  app.querySelectorAll("[data-calendar-view]").forEach(b => b.addEventListener("click", () => {
    state.calendarView = b.dataset.calendarView;
    if (state.calendarView === "week") syncCalendarWeek(state.view === "history" ? state.month : state.homeMonth);
    render();
    app.querySelector(`[data-calendar-view="${b.dataset.calendarView}"]:not([hidden])`)?.focus({ preventScroll: true });
  }));
  app.querySelectorAll("[data-week-step]").forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.weekStep);
    state.calendarWeek = DiaryStatistics.shiftWeek(state.calendarWeek, step, localDate());
    render();
    const same = app.querySelector(`[data-week-step="${step}"]`);
    (same && !same.disabled ? same : app.querySelector(`[data-week-step="${-step}"]`))?.focus();
  }));
  app.querySelectorAll("[data-month-step]").forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.monthStep);
    state.month = DiaryStatistics.shiftMonth(state.month, step, localDate().slice(0, 7));
    state.statsDate = "";
    syncCalendarWeek(state.month);
    render();
    // Keep focus on the pressed control; fall back to the other one when it becomes disabled.
    const same = app.querySelector(`[data-month-step="${step}"]`);
    (same && !same.disabled ? same : app.querySelector(`[data-month-step="${-step}"]`))?.focus();
  }));
  app
    .querySelector('[data-action="date-records"]')
    ?.addEventListener("click", () => {
      const sameDay = repository.query({ date: state.statsDate });
      if (sameDay.length === 1) {
        // One record that day: skip the one-item list and open it directly.
        state.entryFrom = "history";
        state.selected = sameDay[0].id;
        state.recordTab = "card";
        state.view = "entry";
        state.editing = false;
        state.deleteConfirm = false;
        state.dateFilter = state.statsDate;
        state.archiveTab = "records";
        state.returnToStats = true;
        render(true);
        return;
      }
      state.dateFilter = state.statsDate;
      state.page = 0;
      state.archiveTab = "records";
      state.returnToStats = true;
      render();
    });
  app
    .querySelector('[data-action="clear-date"]')
    ?.addEventListener("click", () => {
      state.dateFilter = "";
      state.page = 0;
      render();
    });
  app
    .querySelector('[data-action="back-stats"]')
    ?.addEventListener("click", () => {
      state.archiveTab = "stats";
      state.dateFilter = "";
      state.returnToStats = false;
      render();
    });
  const emotion = app.querySelector("#emotion-filter");
  if (emotion) emotion.onchange = () => { state.emotionFilter = emotion.value; state.page = 0; render(); const d = app.querySelector(".record-filters"); if (d) d.open = true; app.querySelector("#emotion-filter")?.focus(); };
  const sort = app.querySelector("[data-sort]");
  if (sort) sort.onclick = () => { state.sortOldest = !state.sortOldest; state.page = 0; render(); app.querySelector("[data-sort]")?.focus(); };
  app.querySelectorAll("[data-trend-focus]").forEach(b => b.addEventListener("click", () => {
    state.trendFocus = state.trendFocus === b.dataset.trendFocus ? null : b.dataset.trendFocus;
    render();
    app.querySelector(`[data-trend-focus="${b.dataset.trendFocus}"]`)?.focus({ preventScroll: true });
  }));
  // Chart click picks the nearest drawn day; the geometry comes from the rendered SVG.
  const chart = app.querySelector(".stats-chart");
  if (chart)
    chart.onclick = (e) => {
      const bounds = chart.getBoundingClientRect(), d = chart.dataset;
      const days = Number(d.days), left = Number(d.left), right = Number(d.right), width = Number(d.width);
      const fraction = Math.max(0, Math.min(1, (((e.clientX - bounds.left) / bounds.width) * width - left) / (right - left)));
      const date = state.month + "-" + String(Math.round(fraction * Math.max(0, days - 1)) + 1).padStart(2, "0");
      if (analyzedDays().includes(date)) {
        state.statsDate = date;
        render();
      }
    };
}
