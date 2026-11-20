// Card reveal, card information panel and the share sheet (Figma v0.3 "카드 등장" and "공유").
// Included inside the app closure next to the other views.

// ── Card information next to the card (entry view) ──
function cardInfo(record) {
  const card = DiaryCards.resolve(record);
  const t = card.status === "ready" ? CardexCore.type(card.type) : null;
  const shareable = ["ready", "blank"].includes(card.status);
  const title = card.status === "ready" ? `${t.name} · ${card.stage}단계 카드를 얻었어요${card.stage === 3 ? "!" : ""}`
    : card.status === "blank" ? "빈 카드를 얻었어요"
    : card.status === "error" ? "분석을 완료하지 못했어요"
    : "기록을 저장했어요 · 분석 대기";
  const copy = card.status === "ready" ? "가장 높은 분류 확률의 감정이 오늘의 카드가 됐어요. 확률은 감정의 강도가 아니에요."
    : card.status === "blank" ? "가장 높은 감정이 30% 미만이에요. 기록은 그대로 남아 있어요."
    : card.status === "error" ? "기록은 그대로 읽을 수 있어요. 분석 결과만 사용하지 않아요."
    : "AI 감정 분석이 아직 연결되지 않아 카드는 \"분석 대기\"로 표시돼요. 모델이 연결되면 오늘의 카드가 공개돼요.";
  const chips = card.status === "ready" ? [`최고 확률 ${Math.round(card.score * 100)}%`, `${CardexCore.parent(t.parent).name} 분류`, `${stageStars(card.stage)} ${card.stage}단계`]
    : card.status === "blank" ? [`최고 확률 ${Math.round(card.score * 100)}%`, "빈 카드"]
    : card.status === "error" ? ["분석 실패"] : ["분석 대기", "감정 직접 선택 없음"];
  return `<section class="card-info" aria-labelledby="card-info-title">${card.status === "ready" ? '<span class="new-card-sticker">NEW CARD!</span>' : ""}<p class="card-info-date">${E(record.recordDate)} · ${state.mode === "example" ? "예시 카드" : "오늘의 카드"}</p><h2 id="card-info-title">${E(title)}</h2><p class="muted">${E(copy)}</p><div class="chip-row">${chips.map(c => `<span class="chip">${E(c)}</span>`).join("")}</div><div class="card-info-actions">${shareable ? `<button type="button" class="primary" data-action="share">공유하기</button>` : `<button type="button" class="primary" data-action="write">기록으로</button>`}${card.status === "ready" ? btn("card-catalog", "도감에서 보기", "secondary") : btn("catalog", "도감 보기", "secondary")}</div></section>`;
}

// ── Reveal: sealed "?" card → tap → flip → grade effect → result (Figma 카드 등장 ①~⑤) ──
// Saving a real record opens the card page sealed; example records seal on their first open per session.
// The real .flip-scene only fades (opacity/filter) so its geometry, pointer hits and tilt/flip layers stay intact;
// the mystery card and the grade burst are separate overlays. A card counts as revealed once it is tapped.
const GRADE_PARTICLES = { pending: 6, error: 6, blank: 6, "stage-1": 10, "stage-2": 14, "stage-3": 22 };
const GRADE_REVEAL_MS = 1700;
let revealTimer = 0;
function gradeParticles(grade) {
  const n = GRADE_PARTICLES[grade] || 6;
  return Array.from({ length: n }, (_, i) => `<i style="--a:${Math.round(i * 360 / n + (i % 2 ? 9 : 0))}deg;--d:${(i % 3) * 40 + 210}px;--s:${(i % 4) * 2 + 6}px;--delay:${(i % 5) * 35}ms"></i>`).join("");
}
// Real records: the version just saved. Example records: once per record, so editing one never replays it.
const SEAL_GRADES = [["pending", "분석 대기", "은빛"], ["stage-1", "1단계", "민트"], ["stage-2", "2단계", "보라"], ["stage-3", "3단계", "금빛"]];
// Soft UI v1.1 draw sequence (Figma 07 "카드 뽑기 연출"): ① 두근두근 1.5s → ② 고조 1.2s → ③ 펑 (burst,
// GRADE_REVEAL_MS) → ④ front with the result. It always runs the same way (2026-11-20 request): no skip,
// no tap shortcut and no reduced-motion variant. Start times survive re-renders so the phases never restart.
const DRAW_PHASES = { charge: 1500, rise: 1200 };
const drawStarted = {};
function sealHint() {
  const example = state.mode === "example";
  const legend = SEAL_GRADES.map(([g, label, tone]) => `<li data-grade="${g}"><i aria-hidden="true"></i><b>${label}</b><span>${tone}</span></li>`).join("");
  return `<section class="seal-hint" aria-labelledby="seal-hint-title"><p class="card-info-date">${example ? "예시 카드" : "오늘의 카드"} · 카드를 만드는 중</p><h2 id="seal-hint-title" aria-live="polite">오늘의 마음을 카드로 만들고 있어요</h2><div class="draw-progress" aria-hidden="true"><i></i></div><p class="muted">잠시 후 카드가 저절로 열려요.</p><p class="seal-hint-label">등급에 따라 빛의 색이 달라요</p><ul class="seal-legend">${legend}</ul></section>`;
}
// Real records stay "분석 대기" until the model is connected: no draw, just this panel (Figma "카드 등장 · 분석 대기").
function waitPanel() {
  return `<section class="wait-panel" aria-labelledby="wait-title"><ol class="wait-steps" aria-label="진행 단계"><li class="is-done">저장 <span aria-hidden="true">✓</span></li><li class="is-current" aria-current="step">감정 읽기 <i aria-hidden="true"></i></li><li>카드 공개</li></ol><p class="card-info-date">오늘의 카드 · 분석 대기 중</p><h2 id="wait-title">기록은 잘 저장됐어요</h2><p class="muted">감정 분석이 끝나면 카드가 열려요. AI 감정 분석이 아직 연결되지 않아 지금은 "분석 대기" 카드로 보여요.</p><div class="card-info-actions"><button type="button" class="primary" data-wait-action="write">기록으로 돌아가기</button><button type="button" class="secondary" data-wait-action="catalog">도감 보기</button></div></section>`;
}
function revealKey(record) { return state.mode === "example" ? `example:${record.id}` : `real:${record.id}:${record.version}`; }
function revealCard() {
  const box = app.querySelector(".record-panel .card-box"), record = state.view === "entry" ? currentRecord() : null;
  if (!box || !record || !box.querySelector(".flip-scene")) return false;
  const key = revealKey(record);
  if (state.revealed[key]) return false;
  if (state.mode === "real" && state.pendingReveal !== key) return false;
  const grade = DiaryCards.grade(DiaryCards.resolve(record));
  if (grade === "pending") {
    // Only a real save gets the wait panel; an example pending card simply opens.
    if (state.mode === "real") { showWait(box); return true; }
    state.revealed[key] = true;
    return false;
  }
  sealCard(box, key, grade);
  return true;
}
// The wait panel takes the information column until the writer leaves the page (render() clears pendingReveal).
function showWait(box) {
  const layout = box.closest(".record-layout"), info = layout?.querySelector(".card-info");
  if (!layout || !info) return;
  layout.classList.add("is-waiting");
  box.dataset.reveal = "pending";
  info.inert = true; info.setAttribute("aria-hidden", "true");
  info.insertAdjacentHTML("afterend", waitPanel());
  layout.querySelectorAll("[data-wait-action]").forEach(b => b.onclick = () => action(b.dataset.waitAction));
}
function sealCard(box, key, grade) {
  const layout = box.closest(".record-layout");
  const hidden = [box.querySelector(".flip-scene"), ...(layout ? layout.querySelectorAll(".card-info, .card-area > .caption, .card-area > .card-actions") : [])];
  layout?.classList.add("is-sealed");
  // Guidance in the empty information column while the card is sealed (same grid cell as .card-info).
  layout?.querySelector(".card-info")?.insertAdjacentHTML("afterend", sealHint());
  box.classList.add("is-sealed");
  box.dataset.reveal = grade;
  hidden.forEach(el => { el.inert = true; el.setAttribute("aria-hidden", "true"); });
  box.insertAdjacentHTML("afterbegin", `<div class="mystery-card" role="img" tabindex="-1" aria-label="오늘의 카드를 만드는 중 · 잠시 후 저절로 열려요"><span class="mystery-inner"><span class="mystery-face mystery-back"><span class="mystery-q" aria-hidden="true">?</span><small>MOMENT CARD</small><em>두근두근</em></span><span class="mystery-face mystery-front" aria-hidden="true"></span></span></div><div class="grade-burst" aria-hidden="true"><span class="grade-rays"></span><span class="grade-ring"></span><span class="grade-particles">${gradeParticles(grade)}</span></div>`);
  const button = box.querySelector(".mystery-card"), scene = box.querySelector(".flip-scene");
  const hint = layout?.querySelector(".seal-hint");
  // The sealed card covers the real card exactly (its size comes from DiaryFlip's ResizeObserver).
  const syncSize = () => { box.style.setProperty("--seal-w", scene.offsetWidth + "px"); box.style.setProperty("--seal-h", scene.offsetHeight + "px"); };
  syncSize();
  const sizer = new ResizeObserver(syncSize);
  sizer.observe(scene);
  // Focus after render() finishes its own focus handling, unless the writer is typing somewhere.
  queueMicrotask(() => { if (button.isConnected && !document.activeElement?.matches("input, textarea")) button.focus({ preventScroll: true }); });
  const timers = [];
  const setPhase = phase => {
    box.dataset.phase = phase;
    const title = hint?.querySelector("#seal-hint-title"), em = button.querySelector("em");
    if (phase === "rise") { if (title) title.textContent = "곧 열려요…"; if (em) em.textContent = "곧 열려요"; }
  };
  // ④ result: remove the seal and show the information panel (with focus on its title).
  const finish = () => {
    timers.forEach(clearTimeout);
    sizer.disconnect();
    if (!box.isConnected) return;
    state.revealed[key] = true;
    if (state.pendingReveal === key) state.pendingReveal = null;
    box.classList.remove("is-flipping", "is-sealed");
    delete box.dataset.phase;
    layout?.classList.remove("is-sealed");
    box.querySelectorAll(".mystery-card, .grade-burst").forEach(el => el.remove());
    layout?.querySelector(".seal-hint")?.remove();
    layout?.querySelector(".card-info")?.classList.add("just-revealed");
    hidden.forEach(el => { el.inert = false; el.removeAttribute("aria-hidden"); });
    // The flip-back face manages its own inert/aria state; restore it after un-hiding the scene.
    const back = box.querySelector(".flip-back");
    if (back && !box.querySelector(".flip-scene.flipped")) { back.inert = true; back.setAttribute("aria-hidden", "true"); }
    const title = app.querySelector("#card-info-title");
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  };
  // ③ burst: flip the sealed card, play the grade effect, then finish.
  const open = () => {
    if (!box.isConnected || box.classList.contains("is-flipping")) return;
    timers.forEach(clearTimeout);
    state.revealed[key] = true;
    if (state.pendingReveal === key) state.pendingReveal = null;
    box.dataset.phase = "burst";
    box.classList.replace("is-sealed", "is-flipping");
    if (grade === "stage-3") {
      document.querySelector(".grade-flash")?.remove();
      const flash = document.createElement("div");
      flash.className = "grade-flash";
      flash.setAttribute("aria-hidden", "true");
      document.body.append(flash);
      setTimeout(() => flash.remove(), 1600);
    }
    clearTimeout(revealTimer);
    revealTimer = setTimeout(finish, GRADE_REVEAL_MS);
  };
  // ①② run on their own; a re-render resumes from the time the draw first started.
  const started = drawStarted[key] ??= Date.now(), elapsed = Date.now() - started;
  const riseAt = DRAW_PHASES.charge, burstAt = DRAW_PHASES.charge + DRAW_PHASES.rise;
  const bar = hint?.querySelector(".draw-progress i");
  if (bar) bar.style.animationDelay = -elapsed + "ms";
  setPhase(elapsed >= riseAt ? "rise" : "charge");
  if (elapsed < riseAt) timers.push(setTimeout(() => box.isConnected && box.classList.contains("is-sealed") && setPhase("rise"), riseAt - elapsed));
  timers.push(setTimeout(() => box.isConnected && box.classList.contains("is-sealed") && open(), Math.max(0, burstAt - elapsed)));
}

// ── Share sheet ──
const SHARE_FORMATS = [["card", "카드 중심형"], ["record", "기록 중심형"], ["mixed", "혼합형"]];
const SHARE_SENTENCE_MAX = 40;
function shareRecord() { return activeRecords().find(r => r.id === state.selected) || null; }
// The diary text is never drawn; only the card, its name/stage, date, brand and an optional sentence.
function shareSVG() {
  const record = shareRecord(), card = DiaryCards.resolve(record);
  const css = getComputedStyle(document.documentElement), token = n => css.getPropertyValue(n).trim();
  const name = card.status === "ready" ? CardexCore.type(card.type).name : "빈 카드";
  const label = card.status === "ready" ? `${name} · ${card.stage}단계` : name;
  const sentence = String(state.shareSentence || "").trim().slice(0, SHARE_SENTENCE_MAX);
  const inner = cardSVG(record, { snippet: false }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const place = (x, y, w, rotate = 0) => `<g transform="rotate(${rotate} ${x + w / 2} ${y + w * .7})"><rect x="${x + 14}" y="${y + 18}" width="${w}" height="${w * 1.4}" rx="${w * .09}" fill="${token("--ink")}" opacity=".18"/><svg x="${x}" y="${y}" width="${w}" height="${w * 1.4}" viewBox="0 0 1080 1512">${inner}</svg></g>`;
  const grid = Array.from({ length: 31 }, (_, i) => `<path d="M${i * 36} 0V1350M0 ${i * 45}H1080" stroke="${token("--blue")}" stroke-opacity=".12"/>`).join("");
  const wrap = (text, size, max) => { const out = []; let line = ""; for (const ch of Array.from(text)) { if (Array.from(line).length >= max) { out.push(line); line = ""; } line += ch; } if (line) out.push(line); return out.slice(0, 3).map((l, i) => `<tspan x="540" dy="${i ? size * 1.35 : 0}">${E(l)}</tspan>`).join(""); };
  let body;
  if (state.shareFormat === "record") {
    body = `${place(700, 860, 260, 8)}<text x="540" y="430" text-anchor="middle" font-size="40" fill="${token("--blue")}" font-weight="700">${E(record.recordDate)} · 나의 하루</text><text x="540" y="560" text-anchor="middle" font-size="64" font-weight="700" fill="${token("--ink")}">${sentence ? wrap(sentence, 64, 13) : "오늘의 모먼트"}</text><text x="120" y="1060" font-size="44" font-weight="700" fill="${token("--ink")}">${E(label)}</text>`;
  } else if (state.shareFormat === "mixed") {
    body = `${place(90, 300, 470, -4)}<text x="820" y="520" text-anchor="middle" font-size="46" font-weight="700" fill="${token("--ink")}">${sentence ? wrap(sentence, 46, 8).replaceAll('x="540"', 'x="820"') : E(label)}</text><text x="820" y="${sentence ? 760 : 600}" text-anchor="middle" font-size="34" fill="${token("--muted")}">${E(record.recordDate)}</text>`;
  } else {
    body = `${place(250, 170, 580, -4)}<text x="540" y="1180" text-anchor="middle" font-size="48" font-weight="700" fill="${token("--ink")}">${E(label)} · 나의 하루</text>${sentence ? `<text x="540" y="1250" text-anchor="middle" font-size="36" fill="${token("--ink")}">“${E(sentence)}”</text>` : `<text x="540" y="1250" text-anchor="middle" font-size="34" fill="${token("--muted")}">${E(record.recordDate)}</text>`}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="${E(label)} 공유 이미지 미리보기" class="share-art"><rect width="1080" height="1350" fill="${token("--paper")}"/>${grid}<g font-family="Gothic A1, sans-serif">${body}<text x="1000" y="1290" text-anchor="end" font-size="30" font-weight="700" letter-spacing="6" fill="${token("--blue")}">✦ MOMENT CARD</text><text x="80" y="1290" font-size="28" fill="${token("--muted")}">${E(record.recordDate)}</text></g></svg>`;
}
function canDeviceShare() {
  try { return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "moment.png", { type: "image/png" })] }); } catch { return false; }
}
function sharePanel() {
  const record = shareRecord(), card = DiaryCards.resolve(record);
  if (!record || !["ready", "blank"].includes(card.status)) { state.view = record ? "entry" : "write"; return state.view === "entry" ? panel() : homeView(); }
  const sentenceOn = state.shareSentenceOn || Boolean(state.shareSentence);
  return `<section class="share-page" aria-labelledby="share-title"><h2 id="share-title" class="sr-only">공유 이미지 만들기</h2><div class="share-preview"><div class="share-art-frame grade-aura-frame" data-grade="${DiaryCards.grade(card)}">${shareSVG()}</div><p class="small share-caption">↳ ${E(SHARE_FORMATS.find(f => f[0] === state.shareFormat)[1])} · 4:5 · 1080×1350 미리보기</p></div>
    <section class="panel share-sheet" aria-label="공유 옵션"><span class="eyebrow">STICKER SHEET · 공유 옵션</span><div class="row"><h3>SNS 공유 형식</h3><small class="muted">1080 × 1350 · PNG</small></div><div class="chip-row" role="group" aria-label="공유 형식">${SHARE_FORMATS.map(([id, label]) => `<button type="button" class="chip" data-share-format="${id}" aria-pressed="${state.shareFormat === id}">${label}</button>`).join("")}</div>
    <h3>한 문장 스티커</h3>${sentenceOn ? `<label class="share-sentence"><span class="sr-only">기록 한 문장</span><input id="share-sentence" type="text" maxlength="${SHARE_SENTENCE_MAX}" placeholder="이미지에 넣을 한 문장 (최대 ${SHARE_SENTENCE_MAX}자)" value="${E(state.shareSentence)}"><button type="button" class="quiet" data-share-sentence="off">빼기</button></label>` : `<button type="button" class="share-sentence-toggle" data-share-sentence="on">＋ 기록 한 문장 넣기 <small>꺼짐</small></button>`}
    <p class="small muted">항상 붙어요</p><div class="chip-row share-fixed">${["감정 카드", "이름·단계", "날짜", "브랜드"].map(c => `<span class="chip is-on">✓ ${c}</span>`).join("")}</div>
    <p class="share-privacy">🔒 기록 본문은 공유되지 않아요</p>
    <div class="share-actions">${btn("share-download", "이미지 저장 (PNG)", "primary", state.busy ? "disabled" : "")}${canDeviceShare() ? btn("share-device", "기기 공유", "secondary", state.busy ? "disabled" : "") : ""}${btn("share-close", "닫기")}</div><p class="small muted">SNS용 PNG 생성 → 저장 또는 기기 공유</p></section></section>`;
}
async function sharePNG() {
  const svg = shareSVG();
  await document.fonts.ready;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(Error("이미지를 만들지 못했어요. 다시 시도해 주세요.")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("이 브라우저에서는 이미지 저장이 어려워요.");
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw Error("이미지를 만들지 못했어요.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
function bindShare() {
  app.querySelectorAll("[data-share-format]").forEach(b => (b.onclick = () => { state.shareFormat = b.dataset.shareFormat; render(); app.querySelector(`[data-share-format="${state.shareFormat}"]`)?.focus(); }));
  app.querySelectorAll("[data-share-sentence]").forEach(b => (b.onclick = () => {
    const on = b.dataset.shareSentence === "on";
    state.shareSentenceOn = on; if (!on) state.shareSentence = "";
    render(); (on ? app.querySelector("#share-sentence") : app.querySelector('[data-share-sentence="on"]'))?.focus();
  }));
  const input = app.querySelector("#share-sentence");
  if (input) input.oninput = () => {
    state.shareSentence = input.value.slice(0, SHARE_SENTENCE_MAX);
    const frame = app.querySelector(".share-art-frame"); if (frame) frame.innerHTML = shareSVG();
  };
  app.querySelectorAll("[data-share-record]").forEach(b => (b.onclick = () => openShare(b.dataset.shareRecord, "catalog")));
}
function openShare(id, from) {
  state.selected = id; state.shareFrom = from; state.shareSentence = ""; state.shareSentenceOn = false;
  state.catalogDetail = null; state.view = "share"; render(true);
}
// Returns true when the action belonged to the share flow.
async function shareAction(a) {
  if (a === "share") { const r = currentRecord(); if (r) openShare(r.id, "record"); return true; }
  if (a === "share-close") {
    if (state.shareFrom === "catalog") { state.view = "history"; state.archiveTab = "catalog"; } else state.view = "entry";
    render(true); return true;
  }
  if (a === "share-download" || a === "share-device") {
    if (state.busy) return true;
    state.busy = true; render();
    try {
      const blob = await sharePNG(), record = shareRecord();
      const fileName = `moment-share-${record.recordDate}.png`;
      if (a === "share-device" && canDeviceShare()) {
        try { await navigator.share({ files: [new File([blob], fileName, { type: "image/png" })], title: "오늘의 모먼트" }); state.status = "공유 창을 열었어요."; }
        catch (e) { if (e?.name !== "AbortError") throw e; state.status = "공유를 취소했어요."; }
      } else {
        const link = document.createElement("a"), url = URL.createObjectURL(blob);
        link.href = url; link.download = fileName; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        state.status = "공유 이미지 다운로드를 요청했어요.";
      }
      state.error = false;
    } catch (e) { state.error = true; state.status = e.message; }
    finally { state.busy = false; render(); }
    return true;
  }
  return false;
}
