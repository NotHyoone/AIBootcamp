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
// Soft UI v1.1 collection (Figma "도감", "도감 · 첫 실행", "도감 · 카드 상세"). Collected slots show
// the best record's mini card; locked slots a grey "?" frame. The .slot data-* contract is unchanged.
function catalogSlot(s, all) {
  const t = CardexCore.type(s.type), got = s.records.length > 0, best = got ? slotBest(s) : null;
  const pressed = !all && state.catalogStage === s.stage;
  const art = got ? miniCard(best.record, "mc-character catalog-character") : lockedMiniCard(`${t.name} ${s.stage}단계`);
  return `<button type="button" class="slot ${got ? "" : "is-locked"}" data-locked="${!got}"${got ? ` data-grade="stage-${s.stage}"` : ""} data-slot-type="${s.type}" data-stage="${s.stage}" aria-pressed="${pressed}" aria-label="${got ? `${E(t.name)} ${s.stage}단계, 연결 기록 ${s.records.length}편, 카드 상세 열기` : `미발견, ${E(t.name)} ${s.stage}단계`}"><span class="slot-thumb">${art}</span><strong>${got ? E(t.name) : "???"}</strong><small>${got ? `${s.stage}단계 · ${s.records.length}편 · ${E(dotDate(best.record.recordDate).slice(5))}` : `${E(t.name)} · ${s.stage}단계 · 미발견`}</small></button>`;
}
// Parent tabs (전체 27 · 긍정 9 · 부정 9 · 중립 9) narrow the board; emotion chips narrow it to one emotion.
function catalogParent() {
  if (state.catalogType !== "all" && CardexCore.type(state.catalogType)) return CardexCore.type(state.catalogType).parent;
  return CardexCore.PARENTS.some(p => p.id === state.catalogParent) ? state.catalogParent : "all";
}
function catalogPanel() {
  const slots = DiaryCards.collection(activeRecords());
  const found = slots.filter(s => s.records.length).length;
  const all = state.catalogType === "all" || !CardexCore.type(state.catalogType);
  if (all) state.catalogType = "all";
  const parent = catalogParent();
  const tab = (id, label, count) => `<button type="button" role="tab" class="catalog-tab" data-catalog-parent="${id}" aria-selected="${parent === id && all}"><span>${label}</span><b>${count}</b></button>`;
  const tabs = `<div class="catalog-tabs" role="tablist" aria-label="대분류">${tab("all", "전체", slots.length)}${CardexCore.PARENTS.map(p => tab(p.id, p.name, p.children.length * 3)).join("")}</div>`;
  const chip = (id, label, dot = "") => `<button type="button" class="chip" data-catalog-filter="${id}" aria-pressed="${state.catalogType === id}">${dot}${label}</button>`;
  const filters = `<div class="chip-row catalog-filters" role="group" aria-label="감정 선택">${chip("all", "전체")}${CardexCore.PARENTS.map(p => `<span class="filter-group" role="group" aria-label="${p.name}">${p.children.map(id => chip(id, E(CardexCore.type(id).name), `<i class="chip-dot" style="background:var(--card-deep-${id.replace("_", "-")})" aria-hidden="true"></i>`)).join("")}</span>`).join("")}</div>`;
  let grid;
  if (all) {
    const shown = parent === "all" ? slots : slots.filter(s => CardexCore.type(s.type).parent === parent);
    grid = `<div class="catalog-grid collection-grid is-all">${shown.map(s => catalogSlot(s, true)).join("")}</div>`;
  } else {
    const visible = slots.filter(s => s.type === state.catalogType), t = CardexCore.type(state.catalogType);
    const selected = visible.find(s => s.stage === state.catalogStage);
    grid = `<p class="muted">${E(t.name)} · ${CardexCore.parent(t.parent).name} · 3칸 중 ${visible.filter(s => s.records.length).length}칸 수집 · 카드를 누르면 카드 상세가 열려요</p><div class="catalog-grid collection-grid is-type">${visible.map(s => catalogSlot(s, false)).join("")}</div>${selected && !selected.records.length ? '<p role="status">아직 만나지 않은 캐릭터예요.</p>' : ""}`;
  }
  const empty = found ? "" : `<p class="collection-empty">아직 모은 카드가 없어요. 기록을 남기고 감정 분석이 끝나면 카드가 하나씩 열려요.${state.mode === "real" ? " 설정 › 예시 모드에서 미리 볼 수 있어요." : ""}</p>`;
  const progress = `<section class="panel collect-card" aria-label="수집 현황"><p><strong class="moment-number">${found}</strong><span> / ${slots.length}</span> 수집</p><i class="collect-bar" aria-hidden="true"><b style="width:${(found / slots.length) * 100}%"></b></i><small class="muted">${state.mode === "example" ? "예시 도감 · 합성 데이터" : "내 도감"}</small></section>`;
  return `<div class="catalog-head page-heading"><div><h2 class="catalog-title">모은 마음 카드</h2><p class="muted">기록의 대표 감정과 확률 단계로 카드가 모여요</p></div>${progress}</div>${tabs}${filters}<section class="panel catalog-board">${empty}${grid}<p class="muted small">단계는 분류 확률 구간(1단계 30~60% 미만 · 2단계 60~90% 미만 · 3단계 90% 이상)이며 감정의 강도가 아니에요. 중립에는 객관적 서술·의문·놀람·당황을 포함해요.</p></section>${catalogDetail(slots)}`;
}
// Card detail: the 5:7 card, No. and first date, best probability, the three-stage growth row and the records.
// Stages come from the highest probability, never from how often an emotion was written (domain rule).
function catalogDetail(slots) {
  const d = state.catalogDetail;
  const slot = d && slots.find(s => s.type === d.type && s.stage === d.stage);
  if (!slot || !slot.records.length) return "";
  const t = CardexCore.type(slot.type), best = slotBest(slot);
  const records = slotRecords(slot), first = records.map(r => r.recordDate).sort()[0];
  const growth = [1, 2, 3].map(stage => {
    const got = slots.some(s => s.type === slot.type && s.stage === stage && s.records.length);
    const kind = stage === slot.stage ? "now" : got ? "got" : "locked";
    return `<li data-growth="${kind}"${kind === "now" ? ' aria-current="true"' : ""}><b>${stage}단계</b><span>${kind === "now" ? "지금" : kind === "got" ? "받음" : "잠김"}</span></li>`;
  }).join("");
  return `<dialog id="card-detail" class="card-detail" aria-labelledby="card-detail-title"><div class="detail-layout"><div class="detail-card" data-stage="${slot.stage}" data-grade="stage-${slot.stage}" aria-hidden="true"><span class="grade-sheen"></span>${cardSVG(best.record, { snippet: false })}</div><div class="detail-info"><div class="detail-top"><span class="detail-no">${cardNumber(slot.type, slot.stage)} · ${E(dotDate(first))} 획득</span><button type="button" class="quiet detail-close" data-close-detail aria-label="닫기">✕</button></div><h2 id="card-detail-title">${E(t.name)} · ${slot.stage}단계</h2><p class="detail-meta">최고 확률 ${Math.round(best.card.score * 100)}% · 임시 분류 · ${CardexCore.parent(t.parent).name} · ${state.mode === "example" ? "예시" : "나의 기록"}</p><h3>카드 성장</h3><ol class="growth-row">${growth}</ol><p class="muted small">단계는 그날 기록의 최고 확률로 정해져요 · 60% 이상 2단계, 90% 이상 3단계. 분류 확률은 감정의 강도가 아니에요.</p><h3>이 카드가 담긴 기록 <small class="muted">${slot.records.length}편</small></h3><div class="entry-list recent-list detail-records">${records.sort(compareRecords).map(recordRow).join("")}</div><div class="detail-actions"><button type="button" class="primary" data-share-record="${E(best.record.id)}">공유하기</button><button type="button" class="quiet" data-close-detail>닫기</button></div></div></div></dialog>`;
}
function bindCatalog() {
  app.querySelectorAll("[data-catalog-parent]").forEach(b => (b.onclick = () => {
    state.catalogParent = b.dataset.catalogParent;
    state.catalogType = "all";
    state.catalogStage = null;
    state.catalogDetail = null;
    render();
    app.querySelector(`[data-catalog-parent="${state.catalogParent}"]`)?.focus();
  }));
  app.querySelectorAll("[data-catalog-filter]").forEach(b => (b.onclick = () => {
    state.catalogType = b.dataset.catalogFilter;
    if (state.catalogType === "all") state.catalogParent = "all";
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
