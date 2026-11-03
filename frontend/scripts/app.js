(() => {
  "use strict";
  const app = document.getElementById("app"),
    E = CardexCore.escapeHTML;
  const localDate = (d = new Date()) =>
    [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  const timeLabel = value => value ? new Date(value).toLocaleTimeString("ko-KR", {hour:"2-digit",minute:"2-digit",hour12:false}) : "";
  const state = {
    view: "write",
    mode: "real",
    catalogType: "pos_1",
    catalogStage: null,
    cardFilter: null,
    recordTab: "text",
    policy: "single",
    text: "",
    date: localDate(),
    page: 0,
    archiveTab: "records",
    statsTab: "trend",
    month: localDate().slice(0, 7),
    statsDate: "",
    dateFilter: "",
    returnToStats: false,
    selected: null,
    editing: false,
    sessions: [],
    preview: false,
    status: "",
    error: false,
    busy: false,
    deleteConfirm: false,
  };
  const examples = Array.from({ length: 65 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(i / 2));
    return {
      id: "sample-" + i,
      text: [
        "퇴근길에 작은 꽃을 샀다. 별일 없는 하루에도 좋아하는 순간이 있었다.",
        "오랜만에 친구와 산책했다. 천천히 이야기하니 마음이 가벼워졌다.",
        "바쁜 하루 끝, 따뜻한 차 한 잔으로 나를 돌봤다.",
      ][i % 3],
      recordDate: localDate(d),
      createdAt: d.toISOString(),
      updatedAt: d.toISOString(),
      version: 1,
      analysis:
        i % 8 === 0
          ? { status: "pending" }
          : {
              status: "valid",
              version: 1,
              probabilities: Object.fromEntries(
                CardexCore.IDS.map((id, j) => [
                  id,
                  j === i % 7
                    ? [0.45, 0.75, 0.95, 0.2][Math.floor(i / 7) % 4]
                    : (1 - [0.45, 0.75, 0.95, 0.2][Math.floor(i / 7) % 4]) / 6,
                ]),
              ),
            },
    };
  });
  const activeRecords = () =>
    state.mode === "example" ? examples : state.sessions;
  const repository = {
    query({ month = "", date = "" } = {}) {
      return activeRecords()
        .filter(
          (x) =>
            (!month || x.recordDate.startsWith(month)) &&
            (!date || x.recordDate === date) &&
            (!state.cardFilter ||
              (() => {
                const c = DiaryCards.resolve(x);
                return (
                  c.type === state.cardFilter.type &&
                  c.stage === state.cardFilter.stage &&
                  c.status === "ready"
                );
              })()),
        )
        .slice()
        .sort((a, b) => b.recordDate.localeCompare(a.recordDate));
    },
    async list() {
      return activeRecords()
        .slice()
        .sort((a, b) => b.recordDate.localeCompare(a.recordDate));
    },
    async get(id) {
      return activeRecords().find((x) => x.id === id);
    },
    async save(entry) {
      const i = activeRecords().findIndex((x) => x.id === entry.id);
      if (i < 0) activeRecords().push(entry);
      else activeRecords()[i] = entry;
    },
    async remove(id) {
      const i = activeRecords().findIndex((x) => x.id === id);
      if (i >= 0) activeRecords().splice(i, 1);
    },
  };
  const btn = (action, label, cls = "quiet", attrs = "") =>
    `<button type="button" data-action="${action}" class="${cls}" ${attrs}>${label}</button>`;
  function currentRecord() {
    return activeRecords().find((r) => r.id === state.selected);
  }
  function cardSVG() {
    const record = currentRecord(),
      card = DiaryCards.resolve(record),
      name =
        card.status === "ready"
          ? CardexCore.type(card.type).name + " · " + card.stage + "단계"
          : card.status === "blank"
            ? "빈 카드"
            : card.status === "error"
              ? "분석 실패"
              : "분석 대기";
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1620" viewBox="0 0 1080 1620" role="img" aria-label="기록에 연결된 감정 카드" class="art-card"><defs><radialGradient id="orb" cx=".75" cy=".2"><stop stop-color="#c4ffff"/><stop offset=".27" stop-color="#00b9ff"/><stop offset=".6" stop-color="#3030e7"/><stop offset=".83" stop-color="#8e22bd"/><stop offset="1" stop-color="#f3a5ed"/></radialGradient><linearGradient id="ribbon" x2="1" y2="1"><stop stop-color="#bdfcff"/><stop offset=".3" stop-color="#d6b4fa"/><stop offset=".6" stop-color="#ff77be"/><stop offset="1" stop-color="#fada91"/></linearGradient><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#48a9ef"/><stop offset="1" stop-color="#e5f4ff"/></linearGradient><filter id="grain"><feTurbulence baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="1080" height="1620" rx="20" fill="#f5eee2"/><rect width="1080" height="1620" opacity=".055" filter="url(#grain)"/><text x="80" y="100" font-family="sans-serif" font-size="24" letter-spacing="7">A LITTLE MOMENT</text><text x="1000" y="100" text-anchor="end" font-family="sans-serif" font-size="25">${E(record?.recordDate || state.date)} ${E(timeLabel(record?.createdAt))}</text><text x="76" y="226" font-family="IBM Plex Sans KR,sans-serif" font-weight="600" font-size="100" fill="#262323">마음이 쉬어가는</text><text x="76" y="338" font-family="IBM Plex Sans KR,sans-serif" font-weight="600" font-size="100" fill="#262323">작은 순간.</text>${card.status === "ready" ? `<circle cx="660" cy="657" r="${150 + card.stage * 45}" fill="url(#orb)"/>` : ""}<circle cx="215" cy="968" r="158" fill="#d3f36b"/><path d="M-90 1040 C180 690 310 1270 530 1070 S790 805 1160 1100" fill="none" stroke="#7464d6" stroke-width="102" opacity=".3"/><path d="M-90 1028 C180 678 310 1258 530 1058 S790 793 1160 1088" fill="none" stroke="url(#ribbon)" stroke-width="88"/><path d="M500 1170V994h80v-83h80v-83h80V665" fill="none" stroke="#ee642e" stroke-width="75"/><rect x="700" y="594" width="156" height="257" fill="#333" transform="rotate(6 700 594)"/><rect x="710" y="599" width="146" height="247" fill="#f7e9c7"/><rect x="724" y="613" width="118" height="219" fill="url(#sky)"/><path d="M724 769q28-46 60-10q32-44 58 4v69H724Z" fill="#fff" opacity=".9"/><path d="M135 472l13 40 40 13-40 13-13 40-13-40-40-13 40-13Z" fill="#262323"/><path d="M937 1112l9 28 28 9-28 9-9 28-9-28-28-9 28-9Z" fill="#262323"/><text x="80" y="1320" font-family="IBM Plex Sans KR,sans-serif" font-size="28" fill="#756d70">${state.mode === "example" ? "예시 기록" : "나의 기록"} · ${card.status === "ready" ? Math.round(card.score * 100) + "%" + (card.ties.length > 1 ? " · 공동 최다" : "") : name}</text><text x="76" y="1428" font-family="IBM Plex Sans KR,sans-serif" font-size="90" font-weight="600" fill="#262323">${E(name)}</text><path d="M80 1480h920" stroke="#aaa095"/><text x="80" y="1540" font-family="sans-serif" font-size="23" letter-spacing="5">MOMENT CARD</text><text x="1000" y="1540" text-anchor="end" font-family="IBM Plex Sans KR,sans-serif" font-size="23">${state.mode === "example" ? "예시 · 실제 입력 분석 아님" : "분석 기능 준비 중"}</text></svg>`;
    const colors=getComputedStyle(document.documentElement), token=n=>colors.getPropertyValue(n).trim();
    const replacements={"#f5eee2":token("--paper"),"#262323":token("--ink"),"#756d70":token("--muted"),"#aaa095":token("--line"),"#3030e7":token("--blue"),"#8e22bd":token("--blue"),"#ee642e":token("--blue")};
    svg=svg.replace(/#[0-9a-f]{6}/gi,c=>replacements[c]||c).replace('class="art-card"','class="art-card" fill="'+token("--ink")+'"');
    const theme=CardexTheme.getTheme(), accent=token("--blue");
    // Recolor decorative art only; labels and card state remain independent of appearance.
    const artColors=["#c4ffff","#00b9ff","#f3a5ed","#bdfcff","#d6b4fa","#ff77be","#fada91","#48a9ef","#e5f4ff","#d3f36b","#7464d6","#f7e9c7"];
    if(theme==="editorial"||theme==="sage"){
      svg=svg.replace(/#[0-9a-f]{6}/gi,c=>artColors.includes(c)?(artColors.indexOf(c)%2?accent:token("--surface")):c);
    }
    const motif=theme==="paper"?`<path d="M70 390q120 -20 240 0" stroke="${accent}" fill="none" stroke-width="4"/>`:theme==="sage"?`<ellipse cx="800" cy="600" rx="200" ry="280" fill="${accent}" opacity=".08"/>`:theme==="aurora"?`<rect x="50" y="400" width="980" height="800" rx="80" fill="${accent}" opacity=".08"/>`:theme==="editorial"?`<path d="M80 390h920M80 1220h920" stroke="${accent}" stroke-width="4"/>`:`<path d="M80 400h920v800H80zM80 600h920M80 800h920M80 1000h920M310 400v800M540 400v800M770 400v800" stroke="${accent}" fill="none" opacity=".2" stroke-width="4"/>`;
    return svg.replace(/(<rect width="1080" height="1620" rx="20"[^>]*\/>)/, "$1"+motif);

  }
  function cardArea() {
    const card = DiaryCards.resolve(currentRecord());
    return `<section class="card-area"><div class="card-box">${currentRecord() ? cardSVG() : '<div class="empty-card"><h2>오늘의 기록을 남겨 주세요.</h2><p>기록 한 편에 카드 한 장을 연결해요.</p></div>'}</div><p class="caption muted">${state.mode === "example" ? "예시 모드 · 실제 입력 분석 아님" : "실제 분석은 준비 중이에요."}</p><div class="card-actions">${["ready", "blank"].includes(card.status) ? btn("download", "카드 이미지 저장", "primary", state.busy ? "disabled" : "") : ""}${card.status === "ready" ? btn("card-catalog", "캐릭터 도감") : ""}${btn("write", "작성으로", "quiet mobile-only")}</div></section>`;
  }

  /*__STATISTICS_VIEW__*/
  function panel() {
    if (state.view === "settings")
      return `<section class="panel settings-panel"><div class="row"><h2>설정</h2>${btn("write", "닫기")}</div><div class="panel-body"><fieldset><legend>화면 테마</legend><div class="theme-grid">${CardexTheme.themes.map(t=>`<label class="theme-option"><input type="radio" name="appearance" value="${t.id}" ${CardexTheme.getTheme()===t.id?"checked":""}><div class="theme-preview" data-appearance="${t.id}" data-theme="${CardexTheme.getResolvedMode()}" aria-hidden="true">오늘의 모먼트<span></span></div><strong>${t.name}</strong><small>${t.description}</small></label>`).join("")}</div></fieldset><fieldset><legend>화면 모드</legend><div class="mode-options">${[["light","밝음"],["dark","어두움"],["system","시스템"]].map(([v,n])=>`<label><input type="radio" name="color-mode" value="${v}" ${CardexTheme.getPreference()===v?"checked":""}>${n}</label>`).join("")}</div></fieldset><p class="muted">디자인 선택만 이 브라우저에 보관해요.</p><h3>기록 방식</h3><p class="muted">기록 방식은 지금 실행 중에만 적용돼요.</p>${[
        ["single", "하루 한 편", "오늘의 기록을 이어서 수정해요."],
        ["multi", "하루 여러 편", "순간마다 새로운 기록을 남겨요."],
      ]
        .map(
          ([v, t, d]) =>
            `<label class="settings-option"><input type="radio" name="policy" value="${v}" ${state.policy === v ? "checked" : ""}><span>${t}<br><small class="muted">${d}</small></span></label>`,
        )
        .join(
          "",
        )}<p class="muted">계정과 정식 보관 기능은 준비 중이에요.<br>새로고침하면 실제 입력과 임시 기록은 사라져요.</p></div>${btn("preview", state.mode === "real" ? "예시 모드 둘러보기" : "내 기록으로 돌아가기", "primary")}</section>`;
    if (state.view === "history") return archivePanel();
    const x = activeRecords().find((x) => x.id === state.selected);
    if (!x) {
      state.view = "history";
      return panel();
    }
    return `<section class="panel record-panel"><div class="row"><h2>${x.recordDate}</h2>${btn("history", "목록으로")}</div><nav class="archive-tabs"><button data-record-tab="text">기록</button><button data-record-tab="card">카드</button></nav><div class="record-layout ${state.recordTab === "card" ? "show-record-card" : ""}"><div class="record-copy">${state.editing ? `<label for="sample-text">기록 수정</label><textarea class="read-text" id="sample-text">${E(x.text)}</textarea>` : `<div class="read-text">${E(x.text)}</div>`}<div class="row">${btn(state.editing ? "save-example" : "edit-example", state.editing ? "수정 완료" : "수정하기", "primary")}${btn("delete-example", state.deleteConfirm ? "정말 삭제하기" : "삭제")}</div></div>${cardArea()}</div></section>`;
  }

  function render(focus = false) {
    const old = document.activeElement?.dataset.action;
    app.innerHTML = `<div class="shell"><header><div class="brand">✦ 오늘의 모먼트 <small>작은 하루, 나만의 페이지</small></div><div class="icons">${btn("history", "보관함", "icon")}${btn("settings", "설정", "icon")}</div></header><main id="main-content" class="workspace ${state.view === "card" ? "show-card" : ""}">${["write", "card"].includes(state.view) ? `<section class="editor"><span class="eyebrow">DEAR MY DAY</span><div class="row"><span class="muted">${state.date}</span><span class="muted">${state.policy === "single" ? "하루 한 편" : "하루 여러 편"}</span></div><h1>오늘은 어떤<br>하루였나요?</h1><label for="diary-text" class="sr-only">오늘의 기록</label><textarea id="diary-text" placeholder="마음에 남은 순간을 적어 보세요." aria-describedby="privacy feedback">${E(state.text)}</textarea><p class="muted" id="privacy">지금 화면에서만 임시 보관돼요. 새로고침하면 사라져요.</p>${btn(state.policy === "multi" && state.savedText === state.text ? "new-entry" : "save", state.policy === "multi" && state.savedText === state.text ? "새 기록 쓰기" : "기록 남기기", "primary")}</section>${cardArea()}` : panel()}</main><div><p id="feedback" class="status ${state.error ? "error" : ""}" role="${state.error ? "alert" : "status"}">${E(state.status)}</p><footer><span>EVERY DAY IS A LITTLE ART.</span><span>나만의 속도로 기록해요 ✧</span></footer></div></div>`;
    app
      .querySelectorAll("[data-action]")
      .forEach((b) => (b.onclick = () => action(b.dataset.action)));
    app.querySelectorAll("[data-open]").forEach(
      (b) =>
        (b.onclick = () => {
          state.selected = b.dataset.open;
          state.recordTab = "text";
          state.returnToStats = false;
          state.view = "entry";
          state.editing = false;
          state.deleteConfirm = false;
          render(true);
        }),
    );
    app.querySelector("#diary-text")?.addEventListener("input", (e) => {
      state.text = e.target.value;
      const button = app.querySelector(".editor .primary");
      const saved = state.policy === "multi" && state.savedText === state.text;
      button.dataset.action = saved ? "new-entry" : "save";
      button.textContent = saved ? "새 기록 쓰기" : "기록 남기기";
    });
    app.querySelectorAll("[name=policy]").forEach(
      (x) =>
        (x.onchange = () => {
          state.policy = x.value;
          state.currentEntryId = null;
          state.status = "기록 방식을 바꿨어요. 기존 임시 기록은 유지돼요.";
          render();
        }),
    );
    bindStatistics();
    bindCatalog();
    if (focus) {
      const target = app.querySelector("h1,h2");
      target?.setAttribute("tabindex", "-1");
      target?.focus();
    } else if (old)
      app
        .querySelector(`[data-action="${old}"]`)
        ?.focus({ preventScroll: true });
  }
  async function action(a) {
    state.error = false;
    state.status = "";
    if (a === "history" && state.returnToStats) {
      state.view = "history";
      state.archiveTab = "stats";
      state.dateFilter = "";
      state.returnToStats = false;
      render(true);
      return;
    }
    if (["write", "settings", "history"].includes(a)) {
      state.view = a;
      state.deleteConfirm = false;
      if (a === "write") state.date = localDate();
      render(true);
      return;
    }
    if (a === "new-entry") {
      state.text = "";
      state.savedText = null;
      state.currentEntryId = null;
      state.date = localDate();
      state.view = "write";
    }
    if (a === "preview") {
      state.mode = state.mode === "real" ? "example" : "real";
      state.selected =
        activeRecords().find((r) => DiaryCards.resolve(r).status === "ready")
          ?.id || null;
      state.view = "history";
      state.archiveTab = "records";
      state.page = 0;
      state.cardFilter = null;
      state.dateFilter = "";
    }
    if (a === "prev") state.page--;
    if (a === "next") state.page++;
    if (a === "edit-example") {
      state.editing = true;
      state.recordTab = "text";
    }
    if (a === "save-example") {
      try {
        const text = document.getElementById("sample-text").value;
        DiaryCore.validate([{ text }]);
        const entry = await repository.get(state.selected);
        await repository.save({
          ...entry,
          text,
          updatedAt: new Date().toISOString(),
          version: (entry.version || 1) + 1,
          analysis: { status: "pending" },
        });
        state.editing = false;
        state.status = "예시를 수정했어요.";
      } catch (e) {
        state.error = true;
        state.status = e.message;
      }
    }
    if (a === "delete-example") {
      if (!state.deleteConfirm) {
        state.deleteConfirm = true;
        state.status = "한 번 더 누르면 이 예시를 삭제해요.";
      } else {
        await repository.remove(state.selected);
        state.view = "history";
        state.deleteConfirm = false;
      }
    }
    if (a === "save") {
      try {
        const v = DiaryCore.validate([{ text: state.text }]);
        state.mode = "real";
        state.date = localDate();
        const now = new Date().toISOString();
        const previous =
          state.policy === "single"
            ? state.sessions.filter((x) => x.recordDate === state.date).at(-1)
            : state.sessions.find((x) => x.id === state.currentEntryId);
        const entry = {
          id: previous?.id || crypto.randomUUID(),
          text: v.records[0].text,
          recordDate: previous?.recordDate || state.date,
          version: (previous?.version || 0) + 1,
          analysis: { status: "pending" },
          createdAt: previous?.createdAt || now,
          updatedAt: now,
        };
        if (previous) Object.assign(previous, entry);
        else state.sessions.push(entry);
        state.savedText = state.text;
        state.currentEntryId = entry.id;
        state.selected = entry.id;
        state.status =
          "지금 화면에만 임시로 남겼어요. 감정 카드는 준비 중이에요.";
        state.preview = false;
        state.view = "card";
      } catch (e) {
        state.error = true;
        state.status = e.message;
        render();
        document.getElementById("diary-text")?.focus();
        return;
      }
    }
    if (a === "download") {
      if (
        !["ready", "blank"].includes(DiaryCards.resolve(currentRecord()).status)
      )
        return;
      if (state.busy) return;
      state.busy = true;
      render();
      let url;
      try {
        const svg = cardSVG();
        await document.fonts.ready;
        url = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
        );
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () =>
            reject(Error("이미지를 만들지 못했어요. 다시 시도해 주세요."));
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1620;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("이 브라우저에서는 이미지 저장이 어려워요.");
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) throw Error("이미지를 만들지 못했어요.");
        const downloadURL = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadURL;
        anchor.download = `moment-${currentRecord().id}-${currentRecord().recordDate}.png`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(downloadURL), 10000);
        state.status = "예시 이미지 다운로드를 요청했어요.";
      } catch (e) {
        state.error = true;
        state.status = e.message;
      } finally {
        if (url) URL.revokeObjectURL(url);
        state.busy = false;
      }
    }
    render();
  }
  function size() {
    document.documentElement.style.setProperty(
      "--app-height",
      (window.visualViewport?.height || innerHeight) + "px",
    );
  }
  size();
  window.visualViewport?.addEventListener("resize", size);
  let timer;
  window.addEventListener("resize", () => {
    size();
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (state.view === "history") render();
    }, 120);
  });
  window.addEventListener("focus", () => {
    if (state.view === "write" && state.date !== localDate()) {
      state.date = localDate();
      render();
    }
  });
  window.addEventListener("hashchange", () =>
    history.replaceState(null, "", location.pathname + location.search),
  );
  if (location.hash)
    history.replaceState(null, "", location.pathname + location.search);
  window.addEventListener("cardex-theme-change",()=>{
    CardexTheme.sync();
    app.querySelectorAll(".theme-preview").forEach(el=>el.dataset.theme=CardexTheme.getResolvedMode());
    app.querySelectorAll(".art-card").forEach(el=>el.outerHTML=cardSVG());
    document.getElementById("announcer").textContent="화면 디자인을 적용했어요.";
  });
  render();
  window.DiaryReview = Object.freeze({
    getState: () => structuredClone(state),
    localDate,
  });
})();
