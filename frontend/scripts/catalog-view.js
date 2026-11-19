function cardLabel(r) {
  const c = DiaryCards.resolve(r);
  return c.status === "ready"
    ? CardexCore.parent(CardexCore.type(c.type).parent).name + " · " + CardexCore.type(c.type).name + " " + c.stage + "단계"
    : c.status === "blank"
      ? "빈 카드"
      : c.status === "error"
        ? "분석 실패"
        : "분석 대기";
}
const stageStars = stage => "★".repeat(stage) + "☆".repeat(3 - stage);
// DiaryCards.collection keeps record IDs per slot; the detail sheet needs the records themselves.
const slotRecords = slot => slot.records.map(id => activeRecords().find(r => r.id === id)).filter(Boolean);
// Highest-probability record of a slot, used for the detail card and sharing.
function slotBest(slot) {
  return slotRecords(slot).map(r => ({ record: r, card: DiaryCards.resolve(r) })).sort((a, b) => b.card.score - a.card.score)[0] || null;
}
function catalogSlot(s, all) {
  const t = CardexCore.type(s.type), got = s.records.length > 0;
  const pressed = !all && state.catalogStage === s.stage;
  return `<button type="button" class="slot ${got ? "" : "is-locked"}" data-locked="${!got}"${got ? ` data-grade="stage-${s.stage}"` : ""} data-slot-type="${s.type}" data-stage="${s.stage}" style="--emo:${CardexCore.IDS.indexOf(s.type) + 1};--stage:${s.stage};--tone:var(--${s.type})" aria-pressed="${pressed}" aria-label="${got ? `${E(t.name)} ${s.stage}단계, 연결 기록 ${s.records.length}편, 카드 상세 열기` : `미발견, ${E(t.name)} ${s.stage}단계`}"><span class="slot-thumb">${got ? characterSVG(s.type, 'class="catalog-character"') : '<span class="slot-q" aria-hidden="true">?</span>'}</span><strong>${got ? E(t.name) : "???"}</strong><small>${got ? `${s.stage}단계 · ${s.records.length}편` : `${E(t.name)} · ${s.stage}단계 · 미발견`}</small></button>`;
}
function catalogPanel() {
  const slots = DiaryCards.collection(activeRecords());
  const found = slots.filter(s => s.records.length).length;
  const all = state.catalogType === "all" || !CardexCore.type(state.catalogType);
  if (all) state.catalogType = "all";
  const chip = (id, label, dot = "") => `<button type="button" class="chip" data-catalog-filter="${id}" aria-pressed="${state.catalogType === id}">${dot}${label}</button>`;
  const filters = `<div class="chip-row catalog-filters" role="group" aria-label="감정 선택">${chip("all", "전체")}${CardexCore.PARENTS.map(p => `<span class="filter-group" role="group" aria-label="${p.name}">${p.children.map(id => chip(id, E(CardexCore.type(id).name), `<i class="chip-dot" style="background:var(--${id})" aria-hidden="true"></i>`)).join("")}</span>`).join("")}</div>`;
  let grid;
  if (all) {
    const stageLabels = [1, 2, 3].map(s => `<span class="stage-label" style="--stage:${s}" aria-hidden="true"><b>${stageStars(s)}</b>${s}단계</span>`).join("");
    const emoLabels = CardexCore.IDS.map((id, i) => `<span class="emo-label" style="--emo:${i + 1}" aria-hidden="true"><i class="chip-dot" style="background:var(--${id})"></i>${E(CardexCore.type(id).name)}</span>`).join("");
    grid = `<div class="catalog-grid is-all">${stageLabels}${emoLabels}${slots.map(s => catalogSlot(s, true)).join("")}</div>`;
  } else {
    const visible = slots.filter(s => s.type === state.catalogType), t = CardexCore.type(state.catalogType);
    const selected = visible.find(s => s.stage === state.catalogStage);
    grid = `<p class="muted">${E(t.name)} · ${CardexCore.parent(t.parent).name} · 3칸 중 ${visible.filter(s => s.records.length).length}칸 수집 · 카드를 누르면 카드 상세가 열려요</p><div class="catalog-grid is-type">${visible.map(s => catalogSlot(s, false)).join("")}</div>${selected && !selected.records.length ? '<p role="status">아직 만나지 않은 캐릭터예요.</p>' : ""}`;
  }
  return `<div class="catalog-head"><h2 class="catalog-title">캐릭터 도감</h2><span class="chip collect-chip">수집 ${found} / ${slots.length}<i class="collect-bar" aria-hidden="true"><b style="width:${(found / slots.length) * 100}%"></b></i></span><span class="chip">${state.mode === "example" ? "예시 도감 · 합성 데이터" : "내 도감"}</span></div>${filters}<section class="panel catalog-board">${grid}<p class="muted small">단계는 분류 확률 구간(1단계 30~60% 미만 · 2단계 60~90% 미만 · 3단계 90% 이상)이며 감정의 강도가 아니에요. 중립에는 객관적 서술·의문·놀람·당황을 포함해요.</p></section>${catalogDetail(slots)}`;
}
// Card detail sheet for a collected slot (Figma v0.3 "도감 · 카드 상세").
function catalogDetail(slots) {
  const d = state.catalogDetail;
  const slot = d && slots.find(s => s.type === d.type && s.stage === d.stage);
  if (!slot || !slot.records.length) return "";
  const t = CardexCore.type(slot.type), best = slotBest(slot);
  const records = slotRecords(slot), first = records.map(r => r.recordDate).sort()[0];
  return `<dialog id="card-detail" class="card-detail" aria-labelledby="card-detail-title"><div class="detail-layout"><div class="detail-card" style="--tone:var(--${slot.type})" data-stage="${slot.stage}" data-grade="stage-${slot.stage}" aria-hidden="true"><span class="grade-sheen"></span><div class="detail-card-head"><strong>${E(t.name)}</strong><span>${stageStars(slot.stage)}</span></div><div class="detail-card-art">${characterSVG(slot.type)}</div><div class="detail-card-foot"><span>최고 확률</span><b>${Math.round(best.card.score * 100)}%</b><i class="detail-bar"><b style="width:${best.card.score * 100}%"></b></i><small>${E(best.record.recordDate)} · ${state.mode === "example" ? "예시" : "나의 기록"}</small><em>${slot.stage}단계</em></div></div><div class="detail-info"><div class="row"><span class="eyebrow">CARD DETAIL</span><button type="button" class="quiet" data-close-detail>✕ 닫기</button></div><h2 id="card-detail-title">${E(t.name)} · ${slot.stage}단계</h2><div class="chip-row"><span class="chip">최고 확률 ${Math.round(best.card.score * 100)}%</span><span class="chip">${CardexCore.parent(t.parent).name} 분류</span><span class="chip">${stageStars(slot.stage)} ${slot.stage}단계</span></div><p class="muted">획득 ${slot.records.length}편 · 처음 만난 날 ${E(first)}<br>분류 확률은 감정의 강도가 아니에요.</p><h3>이 카드를 받은 기록</h3><div class="entry-list recent-list detail-records">${records.sort(compareRecords).map(recordRow).join("")}</div><div class="detail-actions"><button type="button" class="primary" data-share-record="${E(best.record.id)}">공유하기</button><button type="button" class="quiet" data-close-detail>닫기</button></div></div></div></dialog>`;
}
function bindCatalog() {
  app.querySelectorAll("[data-catalog-filter]").forEach(b => (b.onclick = () => {
    state.catalogType = b.dataset.catalogFilter;
    state.catalogStage = null;
    state.catalogDetail = null;
    render();
    app.querySelector(`[data-catalog-filter="${state.catalogType}"]`)?.focus();
  }));
  app.querySelectorAll(".slot[data-stage]").forEach(
    (b) =>
      (b.onclick = () => {
        const type = b.dataset.slotType, stage = +b.dataset.stage;
        state.catalogStage = stage;
        const slot = DiaryCards.collection(activeRecords()).find(s => s.type === type && s.stage === stage);
        state.catalogDetail = slot?.records.length ? { type, stage } : null;
        state.detailOpener = `.slot[data-slot-type="${type}"][data-stage="${stage}"]`;
        render();
      }),
  );
  const detail = app.querySelector("#card-detail");
  if (detail && !detail.open) {
    detail.showModal();
    detail.addEventListener("close", () => {
      state.catalogDetail = null;
      if (detail.isConnected) app.querySelector(state.detailOpener || ".slot")?.focus({ preventScroll: true });
      detail.remove();
    }, { once: true });
    detail.querySelectorAll("[data-close-detail]").forEach(b => (b.onclick = () => detail.close()));
  }
  app.querySelectorAll("[data-record-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        state.recordTab = b.dataset.recordTab;
        render();
      }),
  );
  // A view can show the same action twice (card menu and card info); bind every copy.
  const bind = (name, fn) => app.querySelectorAll(`[data-action="${name}"]`).forEach(b => (b.onclick = fn));
  bind("card-catalog", () => {
    const c = DiaryCards.resolve(currentRecord());
    state.catalogType = c.type;
    state.catalogStage = c.stage;
    state.catalogDetail = null;
    state.view = "history";
    state.archiveTab = "catalog";
    state.cardFilter = null;
    render();
  });
  bind("catalog-records", () => {
    state.cardFilter = { type: state.catalogType, stage: state.catalogStage };
    state.dateFilter = "";
    state.page = 0;
    state.archiveTab = "records";
    render();
  });
  if (state.cardFilter && state.archiveTab === "records") {
    app
      .querySelector(".pagination")
      ?.insertAdjacentHTML("beforeend", btn("catalog-back", "도감으로"));
    bind("catalog-back", () => {
      state.cardFilter = null;
      state.archiveTab = "catalog";
      render();
    });
  }
}
