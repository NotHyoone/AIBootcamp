import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, lastPromptTime } from "../prompt-log-guard.mjs";

const line = (entry) => JSON.stringify(entry);
const user = (content, timestamp, extra = {}) => line({ type: "user", timestamp, message: { role: "user", content }, ...extra });
const T1 = "2026-11-16T03:00:00.000Z";
const T2 = "2026-11-16T03:05:00.000Z";
const T3 = "2026-11-16T03:06:00.000Z";

function run(transcript, mtime, inputExtra = {}) {
  return evaluate({
    input: { transcript_path: "t.jsonl", ...inputExtra },
    root: "/repo",
    readText: () => transcript,
    mtimeOf: () => mtime,
  });
}

test("마지막 실제 프롬프트 시각을 찾고 tool_result·meta·로컬 명령 출력은 건너뜁니다", () => {
  const transcript = [
    user("첫 요청", T1),
    user("두 번째 요청", T2),
    line({ type: "assistant", timestamp: T3, message: { content: [{ type: "text", text: "ok" }] } }),
    user([{ type: "tool_result", tool_use_id: "x", content: "out" }], T3),
    user("system note", T3, { isMeta: true }),
    user("<local-command-stdout></local-command-stdout>", T3),
    "not json",
    "",
  ].join("\n");
  assert.equal(lastPromptTime(transcript), Date.parse(T2));
});

test("텍스트 블록 배열 형태의 프롬프트도 인식합니다", () => {
  assert.equal(lastPromptTime(user([{ type: "text", text: "배열 프롬프트" }], T2)), Date.parse(T2));
});

test("프롬프트 이후 기록 파일이 수정되었으면 차단하지 않습니다", () => {
  assert.equal(run(user("요청", T2), Date.parse(T3)), null);
  assert.equal(run(user("요청", T2), Date.parse(T2)), null);
});

test("기록 파일이 프롬프트보다 오래되었거나 없으면 차단 사유를 반환합니다", () => {
  assert.match(run(user("요청", T2), Date.parse(T1)), /공용 절대규칙 9/);
  assert.match(run(user("요청", T2), null), /docs\/prompt-history\.md/);
});

test("stop_hook_active이면 반복 차단하지 않습니다", () => {
  assert.equal(run(user("요청", T2), Date.parse(T1), { stop_hook_active: true }), null);
});

test("판단할 수 없는 입력은 차단하지 않습니다(fail-open)", () => {
  assert.equal(run("", Date.parse(T1)), null);
  assert.equal(run(user("요청", "not-a-date"), Date.parse(T1)), null);
  assert.equal(evaluate({ input: {}, root: "/repo" }), null);
  assert.equal(evaluate({ input: null, root: "/repo" }), null);
  assert.equal(evaluate({ input: { transcript_path: "x" }, root: "/repo", readText: () => { throw new Error("ENOENT"); } }), null);
});
