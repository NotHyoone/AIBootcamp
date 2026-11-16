#!/usr/bin/env node
// Stop hook — 공용 절대규칙 9(프롬프트·결과 기록) 이행 확인.
// 마지막 사용자 프롬프트 이후 docs/prompt-history.md가 수정되지 않았으면
// 응답 종료를 한 번 막고(decision: block) 기록을 추가하도록 안내합니다.
// - stop_hook_active가 true면(이미 한 번 안내함) 반복 차단하지 않습니다.
// - permission_mode가 "plan"이면 편집이 불가하므로 차단하지 않습니다(종료 후 기록).
// - transcript를 읽을 수 없거나 판단이 불가능하면 차단하지 않습니다(fail-open).
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const HISTORY_REL = "docs/prompt-history.md";

const SKIP_PREFIXES = ["<local-command-", "<command-name>", "Stop hook feedback", "[Request interrupted"];

function promptText(entry) {
  if (entry?.type !== "user" || entry.isMeta || entry.isSidechain) return null;
  const content = entry.message?.content;
  let text = null;
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    if (content.some((block) => block?.type === "tool_result")) return null;
    text = content.filter((block) => block?.type === "text").map((block) => block.text).join("\n");
  }
  text = (text || "").trim();
  if (!text || SKIP_PREFIXES.some((prefix) => text.startsWith(prefix))) return null;
  return text;
}

/** transcript(JSONL) 문자열에서 마지막 실제 사용자 프롬프트의 시각(ms)을 찾습니다. */
export function lastPromptTime(transcript) {
  const lines = String(transcript || "").split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].trim()) continue;
    let entry;
    try { entry = JSON.parse(lines[i]); } catch { continue; }
    if (promptText(entry) === null) continue;
    const time = Date.parse(entry.timestamp);
    return Number.isFinite(time) ? time : null;
  }
  return null;
}

/** 차단 사유를 반환하고, 기록이 되어 있거나 판단할 수 없으면 null을 반환합니다. */
export function evaluate({ input, root, readText = (p) => readFileSync(p, "utf8"), mtimeOf = (p) => (existsSync(p) ? statSync(p).mtimeMs : null) }) {
  if (!input || input.stop_hook_active) return null;
  // 플랜 모드에서는 계획 파일 외 편집이 불가하므로 차단하지 않습니다. 밀린 기록은 플랜 모드 종료 후 첫 작업 사이클에서 남깁니다.
  if (input.permission_mode === "plan") return null;
  if (!input.transcript_path) return null;
  let transcript;
  try { transcript = readText(input.transcript_path); } catch { return null; }
  const promptAt = lastPromptTime(transcript);
  if (promptAt === null) return null;
  const mtime = mtimeOf(path.join(root, HISTORY_REL));
  if (mtime !== null && mtime >= promptAt) return null;
  return [
    `공용 절대규칙 9: 이번 요청의 프롬프트와 결과가 \`${HISTORY_REL}\`에 기록되지 않았습니다.`,
    "응답을 마치기 전에 해당 날짜·도구·세션 아래에 기존 일련번호를 이어 프롬프트 요약(원문 전체 인용 대신 요청 의도·핵심 조건 1~3줄)과 결과 요약(변경 파일, 검증 결과, 커밋 해시, 수행하지 않은 사항을 간결하게)을 추가하고, 필요하면 `한눈에 보기`·`누적 현황`도 갱신하세요.",
    "기록은 작업 커밋에 함께 포함하고, 파일 변경이 없는 요청이면 `docs:` 커밋으로 남기세요(push 금지). 민감 정보는 제외합니다.",
  ].join("\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL("../../", import.meta.url)));
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  let input = {};
  try { input = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  const reason = evaluate({ input, root });
  if (reason) process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}
