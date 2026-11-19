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
function statisticsPanel() {
  const stats = DiaryStatistics.monthSummary(
    repository.query({ month: state.month }),
    state.month,
  );
  const available =
    state.statsTab === "trend"
      ? stats.days.filter((x) => x.summary.validCount)
      : stats.days;
  if (!available.some((x) => x.date === state.statsDate))
    state.statsDate = available.at(-1)?.date || "";
  const selected = stats.days.find((x) => x.date === state.statsDate);
  const thisMonth = localDate().slice(0, 7);
  const top = monthTopCard(state.month);
  const kindName = { trend: "감정 추이", count: "월간 기록", distribution: "감정 분포" }[state.statsTab];
  const nav = `<div class="stats-top"><div class="month-nav"><button type="button" class="quiet" data-month-step="-1" aria-label="이전 달">‹ 이전 달</button><strong class="month-title">${monthTitle(state.month)}</strong><button type="button" class="quiet" data-month-step="1" aria-label="다음 달" ${state.month >= thisMonth ? "disabled" : ""}>다음 달 ›</button></div><div class="chip-row"><span class="chip is-on">기록 ${stats.total}편 · 분석 ${stats.valid}편</span><span class="chip">${state.mode === "example" ? "예시 통계 · 실제 사용자 분석 아님" : "내 기록 통계 · 감정 분석은 준비 중"}</span></div></div>`;
  const banner = `<section class="stats-banner" aria-label="이번 달 요약"><span class="banner-card" aria-hidden="true">${top ? characterSVG(top.type) : '<span class="mystery-mini">?</span>'}</span><div><p class="banner-eyebrow">${top ? `이번 달 가장 많이 받은 카드 · ${E(CardexCore.type(top.type).name)} (${top.count}편)` : "이번 달 카드는 분석이 연결되면 모여요"}</p>${insightLine(stats) || `<p class="month-insight muted" data-ready="false">아직 이 달의 기록이 없어요.</p>`}</div><small class="muted banner-note">비율은 감정의 강도가 아니라 분류 확률이에요</small></section>`;
  const controls = `${nav}${banner}<div class="month-controls"><label>월 <input id="stats-month" type="month" value="${state.month}" max="${thisMonth}"></label><label>보기 <select id="stats-kind">${[["trend","감정 추이"],["count","월간 기록"],["distribution","감정 분포"]].map(([id,label])=>`<option value="${id}" ${state.statsTab === id ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>`;
  const side = state.statsTab === "distribution" ? "" : `<section class="panel stats-side" aria-labelledby="dist-title"><div class="row"><h3 id="dist-title">감정 분포</h3><small class="muted">${CardexCore.IDS.length}종</small></div>${stats.valid ? distributionBlock(stats) + '<p class="muted small">분석된 기록의 평균 분류 확률이에요.</p>' : '<p class="muted">분석된 기록이 생기면 감정별 비율을 보여 드려요.</p>'}</section>`;
  const frame = (main) => `${controls}<div class="stats-grid ${side ? "" : "is-single"}"><section class="panel stats-main" aria-labelledby="stats-main-title"><div class="row"><h3 id="stats-main-title">${kindName}</h3></div>${main}</section>${side}</div>`;
  if (state.statsTab === "count") {
    const days = stats.days;
    return frame(`<div class="month-summary"><strong>${stats.total}편의 기록</strong><span>${days.filter(d=>d.count).length}일의 순간</span></div><p class="muted small">날짜를 누르면 그날의 글을 읽을 수 있어요. 점은 그날 분석된 대표 감정이에요. 미분석 기록에는 감정 색을 붙이지 않아요.</p>${monthCalendar(state.month).html}`);
  }
  let graph = "";
  if (!stats.total)
    graph = `<div class="stats-empty"><p>아직 이 달의 기록이 없어요.</p>${btn("archive-records", "지난 기록 보기")}</div>`;
  else if (!stats.valid)
    graph = `<div class="stats-empty"><p>감정 분석은 준비 중이에요. 기록은 보관함에서 읽을 수 있어요.</p>${btn("archive-records", "지난 기록 보기")}</div>`;
  else if (state.statsTab === "distribution")
    graph = `${distributionBlock(stats)}<p class="muted">분석된 기록의 평균 분류 확률이에요. 중립에는 객관적 서술·의문·놀람·당황을 포함해요.</p>`;
  else {
    const x = (i) => 42 + (i * 640) / (stats.days.length - 1),
      y = (v) => 185 - v * 150;
    // Soft guides: only the 50% line and the baseline, drawn faintly and dotted.
    let marks = "", defs = "";
    for (const value of [0, 0.5, 1])
      marks += `${value ? `<path class="chart-guide" d="M42 ${y(value)}H690"/>` : `<path class="chart-base" d="M42 ${y(value)}H690"/>`}<text x="34" y="${y(value) + 4}" text-anchor="end">${value * 100 + "%"}</text>`;
    // One gently curved line per parent emotion; dash patterns stay for colour-blind readers.
    let lines = "", areas = "", dots = "";
    CardexCore.PARENTS.forEach((p, index) => {
      defs += `<linearGradient id="trend-fill-${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--${p.id})" stop-opacity=".26"/><stop offset="1" stop-color="var(--${p.id})" stop-opacity="0"/></linearGradient>`;
      const points = stats.days.map((d, i) => d.summary.validCount ? [x(i), y(d.summary.parents[p.id])] : null);
      for (const run of DiaryStatistics.smoothSegments(points)) {
        if (run.points.length > 1) {
          areas += `<path class="chart-area" d="${run.d}L${run.end[0]} 185L${run.start[0]} 185Z" fill="url(#trend-fill-${p.id})"/>`;
          lines += `<path class="chart-line" d="${run.d}" stroke="var(--${p.id})" stroke-dasharray="${["0", "9 6", "2 6"][index]}"/>`;
        }
      }
      stats.days.forEach((d, i) => {
        if (d.summary.validCount)
          dots += `<circle class="chart-dot" cx="${x(i)}" cy="${y(d.summary.parents[p.id])}" r="4.5" fill="var(--${p.id})"><title>${i + 1}일 · ${p.name} ${CardexCore.percent(d.summary.parents[p.id])}</title></circle>`;
      });
    });
    marks += areas + lines + dots;
    stats.days.forEach((d, i) => {
      if (i === 0 || i === stats.days.length - 1 || (i + 1) % 5 === 0)
        marks += `<text x="${x(i)}" y="211" text-anchor="middle">${i + 1}일</text>`;
    });
    graph = `<div class="stats-legend">${CardexCore.PARENTS.map((p, i) => `<span class="legend-chip" style="--chip:var(--${p.id})"><svg width="22" height="8" aria-hidden="true"><path d="M1 4H21" stroke="var(--${p.id})" stroke-width="3" stroke-linecap="round" stroke-dasharray="${["0", "6 4", "2 4"][i]}"/></svg>${p.name}</span>`).join("")}<span class="legend-chip legend-gap" style="--chip:var(--muted)"><svg width="22" height="8" aria-hidden="true"><path d="M1 4H7M15 4H21" stroke="var(--muted)" stroke-width="3" stroke-linecap="round"/></svg>선 끊김 = 분석 없는 날</span></div><svg class="stats-chart" viewBox="0 0 720 225" role="img" aria-label="날짜별 감정 비중, 기록 없는 구간은 공백"><defs>${defs}</defs>${marks}</svg>`;
  }
  const details = selected
    ? `${selected.count}편${selected.summary.validCount ? " · " + CardexCore.PARENTS.map((p) => p.name + " " + CardexCore.percent(selected.summary.parents[p.id])).join(" · ") : " · 감정 분석 없음"}`
    : "";
  return frame(`<div class="stats-summary">기록 <strong>${stats.total}</strong>편 · 작성한 날 <strong>${stats.writtenDays}</strong>일<br><small>분석 ${stats.valid}편 · 미분석 ${stats.missing}편${state.statsTab === "trend" && stats.days.filter((x) => x.summary.validCount).length === 1 ? " · 비교할 날짜가 더 필요해요." : ""}</small></div><div class="graph-space${state.statsTab === "distribution" ? " distribution-space" : ""}"${state.statsTab === "distribution" ? ' tabindex="0" role="region" aria-label="감정 분포 상세"' : ""}>${graph}</div>${state.statsTab !== "distribution" && available.length ? `<div class="stats-detail"><label>날짜 <select id="stats-date">${available.map((d) => `<option value="${d.date}" ${d.date === state.statsDate ? "selected" : ""}>${d.date}</option>`).join("")}</select></label>${btn("date-records", "기록 보기")}<p>${E(details)}</p></div>` : '<p class="muted">감정 비중은 감정의 강도나 심리 점수가 아니에요.</p>'}`);
}
function bindStatistics() {
  app.querySelectorAll("[data-home-month]").forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.homeMonth);
    state.homeMonth = DiaryStatistics.shiftMonth(state.homeMonth, step, localDate().slice(0, 7));
    render();
    const same = app.querySelector(`[data-home-month="${step}"]`);
    (same && !same.disabled ? same : app.querySelector(`[data-home-month="${-step}"]`))?.focus();
  }));
  app.querySelector('#stats-kind')?.addEventListener('change', e => { state.statsTab = e.target.value; render(); app.querySelector('#stats-kind')?.focus(); });
  app.querySelector('#stats-month')?.addEventListener('change', e => { if (!e.target.validity.valid || !/^\d{4}-\d{2}$/.test(e.target.value) || e.target.value > localDate().slice(0,7)) { e.target.value = state.month; return; } state.month = e.target.value; state.statsDate = ''; render(); app.querySelector('#stats-month')?.focus(); });
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
      }),
  );
  app.querySelector("#stats-date")?.addEventListener("change", (e) => {
    state.statsDate = e.target.value;
    render();
    app.querySelector("#stats-date")?.focus();
  });
  app.querySelectorAll("[data-month-step]").forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.monthStep);
    state.month = DiaryStatistics.shiftMonth(state.month, step, localDate().slice(0, 7));
    state.statsDate = "";
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
  const chart = app.querySelector(".stats-chart");
  if (chart)
    chart.onclick = (e) => {
      const bounds = chart.getBoundingClientRect();
      const fraction = Math.max(
        0,
        Math.min(
          1,
          (((e.clientX - bounds.left) / bounds.width) * 720 - 42) / 640,
        ),
      );
      const count = new Date(
        Number(state.month.slice(0, 4)),
        Number(state.month.slice(5)),
        0,
      ).getDate();
      const date =
        state.month +
        "-" +
        String(Math.round(fraction * (count - 1)) + 1).padStart(2, "0");
      const select = app.querySelector("#stats-date");
      if (select && [...select.options].some((o) => o.value === date)) {
        state.statsDate = date;
        render();
      }
    };
}
