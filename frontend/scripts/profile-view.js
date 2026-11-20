// Soft UI v1.1 profile and settings page (Figma "프로필", 2026-11-20 P7). Opened from the avatar.
// Left: profile card (avatar, nickname, days together, records / cards / streak, edit) and a section
// menu. Right: 테마 · 알림 · 기록 · 데이터 · 정보. Included inside the app closure with the other views.
const profileStorage = (() => { try { return window.localStorage; } catch { return null; } })();
let profile = MomentProfile.load(profileStorage);
const PROFILE_SECTIONS = [["theme", "테마"], ["notice", "알림"], ["records", "기록"], ["data", "데이터"], ["about", "정보"]];
function profileStats() {
  const real = state.sessions, first = real.map(r => r.recordDate).sort()[0];
  return {
    records: real.length,
    cards: DiaryCards.collection(real).filter(s => s.records.length).length,
    streak: DiaryStatistics.streakDays(real.map(r => r.recordDate), localDate()),
    days: MomentProfile.daysTogether(first, localDate()),
  };
}
function profilePanel() {
  const s = profileStats();
  const swatches = CardexTheme.themes.map(t => {
    const [paper, surface, ink, , accent, , tint] = t.colors;
    const current = t.id === CardexTheme.getTheme();
    return `<button type="button" class="theme-swatch" data-theme-id="${t.id}" aria-current="${current}"><span class="swatch-thumb" aria-hidden="true" style="--sw-paper:${paper};--sw-surface:${surface};--sw-ink:${ink};--sw-accent:${accent};--sw-tint:${tint}"><i></i><i></i><i></i></span><span class="swatch-radio" aria-hidden="true"></span><span class="theme-tile-label"><strong>${E(t.name)}</strong><small>${E(t.description)}</small></span></button>`;
  }).join("");
  const notice = (key, title, sub) => `<label class="switch-row notice-row"><span><strong>${title}</strong><small class="muted">${sub}</small></span><input type="checkbox" role="switch" data-notice="${key}" ${profile[key] ? "checked" : ""}></label>`;
  const card = `<section class="panel profile-card" aria-labelledby="profile-name"><span class="profile-avatar" style="--avatar:${profile.color}" aria-hidden="true">${profileIcon()}</span><h3 id="profile-name">${E(profile.name)}</h3><p class="muted profile-days">${s.days ? `moment와 함께한 지 <b>${s.days}일째</b>` : "첫 기록을 남기면 함께한 날을 세어 드려요"}</p><dl class="profile-stats"><div><dt>기록</dt><dd>${s.records}</dd></div><div><dt>카드</dt><dd>${s.cards}</dd></div><div><dt>연속</dt><dd>${s.streak}일</dd></div></dl><button type="button" class="secondary" data-profile-edit aria-haspopup="dialog">프로필 편집</button></section>`;
  const nav = `<nav class="panel profile-nav" aria-label="설정 메뉴">${PROFILE_SECTIONS.map(([id, label]) => `<button type="button" class="profile-jump" data-profile-jump="${id}">${label}<span aria-hidden="true">›</span></button>`).join("")}</nav>`;
  return `<section class="settings-panel settings-page profile-page" aria-labelledby="profile-title"><div class="profile-head page-heading"><h2 id="profile-title" class="profile-title">프로필</h2><p class="muted">${state.mode === "example" ? "예시 모드 · 실제 기록 기준으로 보여요" : "내 기록은 이 브라우저에만 보관돼요"}</p></div>
    <div class="profile-grid"><aside class="profile-side">${card}${nav}</aside><div class="profile-main">
    <section class="panel settings-col" id="settings-theme" aria-labelledby="theme-title"><h2 id="theme-title" tabindex="-1">테마</h2><p class="muted small">다이어리의 분위기를 바꿀 수 있어요. 카드 색은 그대로 유지돼요.</p><div class="theme-swatches">${swatches}</div></section>
    <section class="panel settings-col" id="settings-notice" aria-labelledby="notice-title"><h2 id="notice-title" tabindex="-1">알림</h2>${notice("notifyDaily", "매일 기록 알림", "오후 9:00")}${notice("notifyAnalysis", "카드 분석 완료 알림", "감정 분석이 끝나면")}<p class="muted small notice-note">이 기기에서는 아직 알림을 보낼 수 없어요. 설정만 저장해 두었다가 알림이 준비되면 사용해요.</p></section>
    <section class="panel settings-col" id="settings-records" aria-labelledby="records-title"><h2 id="records-title" tabindex="-1">기록</h2><details class="settings-section" open><summary>기록 관리</summary><p class="muted">하루에 한 편을 남기고, 같은 날 다시 쓰면 그날의 기록을 이어서 수정해요. 예시 모드 데이터는 메모리에서만 쓰이고 실제 기록과 섞이지 않아요.</p><label class="switch-row"><span>시연 모드 <small class="muted">예시 기록으로 미리 보기</small></span><input type="checkbox" role="switch" data-action="preview" ${state.mode === "example" ? "checked" : ""}></label></details></section>
    <section class="panel settings-col" id="settings-data" aria-labelledby="data-title"><h2 id="data-title" tabindex="-1">데이터</h2><p class="muted">기록은 이 브라우저에만 보관돼요. 계정·동기화·서버 백업은 제공하지 않아요.</p>${btn("delete-all", state.clearAllConfirm ? "정말 모든 기록 삭제" : "모든 기록 삭제", "quiet danger")}</section>
    <section class="panel settings-col" id="settings-about" aria-labelledby="about-title"><h2 id="about-title" tabindex="-1">정보</h2><p class="muted">AI 감정 분석 모델은 아직 연결되지 않았어요. 실제 기록의 카드는 "분석 대기"로 보여요. 분류 확률은 감정의 강도가 아니에요.</p><p class="muted small">글꼴: Gothic A1, Bricolage Grotesque (SIL Open Font License)</p><button type="button" class="quiet" data-profile-action="license" aria-haspopup="dialog">글꼴 라이선스 보기</button></section>
    </div></div>
    <dialog id="profile-dialog" class="read-dialog profile-dialog" aria-labelledby="profile-dialog-title"><form method="dialog"><h2 id="profile-dialog-title">프로필 편집</h2><label class="profile-field" for="profile-name-input">닉네임 <small class="muted">최대 ${MomentProfile.NAME_MAX}자</small><input id="profile-name-input" type="text" maxlength="${MomentProfile.NAME_MAX * 2}" value="${E(profile.name)}" autocomplete="nickname"></label><fieldset class="profile-colors"><legend>아바타 색</legend>${MomentProfile.COLORS.map((c, i) => `<label class="color-option"><input type="radio" name="profile-color" value="${c}" ${c === profile.color ? "checked" : ""}><span style="--avatar:${c}" aria-hidden="true">${profileIcon()}</span><span class="sr-only">색 ${i + 1}</span></label>`).join("")}</fieldset><div class="row"><button type="button" class="quiet" data-profile-cancel>취소</button><button type="submit" class="primary" value="save">저장</button></div></form></dialog></section>`;
}
function bindProfile() {
  if (state.view !== "settings") return;
  app.querySelectorAll("[data-profile-jump]").forEach(b => b.onclick = () => {
    const section = app.querySelector(`#settings-${b.dataset.profileJump}`);
    section?.scrollIntoView({ block: "start" });
    section?.querySelector("h2")?.focus({ preventScroll: true });
  });
  app.querySelectorAll("[data-notice]").forEach(input => input.onchange = () => {
    const result = MomentProfile.save(profileStorage, { ...profile, [input.dataset.notice]: input.checked });
    profile = result.profile;
    document.getElementById("announcer").textContent = result.stored ? "알림 설정을 저장했어요. 실제 알림은 아직 보내지 않아요." : "이 브라우저에 설정을 저장하지 못했어요.";
  });
  const dialog = app.querySelector("#profile-dialog");
  const opener = app.querySelector("[data-profile-edit]");
  if (opener && dialog) opener.onclick = () => {
    dialog.showModal();
    dialog.querySelector("#profile-name-input").select();
  };
  dialog?.querySelector("[data-profile-cancel]")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("close", () => {
    if (dialog.returnValue === "save") {
      const name = dialog.querySelector("#profile-name-input").value;
      const color = dialog.querySelector("[name=profile-color]:checked")?.value;
      const result = MomentProfile.save(profileStorage, { ...profile, name, color });
      profile = result.profile;
      render();
      document.getElementById("announcer").textContent = result.stored ? "프로필을 저장했어요." : "이 브라우저에 프로필을 저장하지 못했어요. 새로고침하면 사라져요.";
    }
    app.querySelector("[data-profile-edit]")?.focus({ preventScroll: true });
  });
  app.querySelector('[data-profile-action="license"]')?.addEventListener("click", e => {
    openInfo("글꼴 라이선스", document.getElementById("embedded-font-license")?.textContent || "", e.currentTarget);
  });
}
