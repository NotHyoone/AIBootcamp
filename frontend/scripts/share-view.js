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

// ── Reveal: mystery card → press → lift → turn → result (Figma 카드 등장 ①~⑤) ──
// Only opacity/filter animate on .flip-scene so its geometry, pointer hits and tilt/flip layers stay intact;
// the mystery card is a separate overlay. Each record version is revealed once per session.
function revealCard() {
  const box = app.querySelector(".record-panel .card-box"), record = state.view === "entry" ? currentRecord() : null;
  if (!box || !record || !box.querySelector(".flip-scene")) return false;
  const key = `${state.mode}:${record.id}:${record.version}`;
  if (state.revealed[key]) return false;
  state.revealed[key] = true;
  if (document.documentElement.dataset.motion === "off") return false;
  const card = DiaryCards.resolve(record);
  box.dataset.reveal = card.status === "ready" ? `stage-${card.stage}` : card.status;
  box.classList.add("is-revealing");
  box.insertAdjacentHTML("afterbegin", '<div class="mystery-card" aria-hidden="true"><span>?</span><small>MOMENT CARD</small></div><div class="reveal-burst" aria-hidden="true"></div>');
  setTimeout(() => {
    box.classList.remove("is-revealing");
    box.querySelectorAll(".mystery-card, .reveal-burst").forEach(el => el.remove());
  }, 2600);
  return true;
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
  const inner = cardSVG().replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const place = (x, y, w, rotate = 0) => `<g transform="rotate(${rotate} ${x + w / 2} ${y + w * .75})"><rect x="${x + 14}" y="${y + 18}" width="${w}" height="${w * 1.5}" rx="${w * .05}" fill="${token("--ink")}" opacity=".85"/><svg x="${x}" y="${y}" width="${w}" height="${w * 1.5}" viewBox="0 0 1080 1620">${inner}</svg></g>`;
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="${E(label)} 공유 이미지 미리보기" class="share-art"><rect width="1080" height="1350" fill="${token("--paper")}"/>${grid}<g font-family="IBM Plex Sans KR,sans-serif">${body}<text x="1000" y="1290" text-anchor="end" font-size="30" font-weight="700" letter-spacing="6" fill="${token("--blue")}">✦ MOMENT CARD</text><text x="80" y="1290" font-size="28" fill="${token("--muted")}">${E(record.recordDate)}</text></g></svg>`;
}
function canDeviceShare() {
  try { return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "moment.png", { type: "image/png" })] }); } catch { return false; }
}
function sharePanel() {
  const record = shareRecord(), card = DiaryCards.resolve(record);
  if (!record || !["ready", "blank"].includes(card.status)) { state.view = record ? "entry" : "write"; return state.view === "entry" ? panel() : homeView(); }
  const sentenceOn = state.shareSentenceOn || Boolean(state.shareSentence);
  return `<section class="share-page" aria-labelledby="share-title"><h2 id="share-title" class="sr-only">공유 이미지 만들기</h2><div class="share-preview"><div class="share-art-frame">${shareSVG()}</div><p class="small share-caption">↳ ${E(SHARE_FORMATS.find(f => f[0] === state.shareFormat)[1])} · 4:5 · 1080×1350 미리보기</p></div>
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
