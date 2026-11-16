#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit|NotebookEdit) hook.
// - frontend 도메인 스크립트·단위 테스트·토큰 변경 → node --test tests/*.test.cjs (약 1초)
// - backend Python 변경 → python -m unittest discover -s backend/tests (.venv 우선)
// - 실패 시 exit 2로 결과를 Claude에게 전달하고, 성공 시 재빌드·문서 동기화 리마인더를 남깁니다.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL("../../", import.meta.url)));

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw || "{}");
const target = input.tool_input?.file_path || input.tool_input?.notebook_path;
if (!target) process.exit(0);
const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");
if (rel.startsWith("..") || rel.startsWith(".backups/")) process.exit(0);

const notes = [];
const failures = [];
const tail = (text, n = 40) => text.trim().split(/\r?\n/).slice(-n).join("\n");

function run(label, command, args, cwd) {
  const r = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 120_000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  if (r.error) { failures.push(`${label}: 실행 불가 (${r.error.message})`); return; }
  if (r.status !== 0) failures.push(`${label} 실패 (exit ${r.status})\n${tail((r.stdout || "") + "\n" + (r.stderr || ""))}`);
  else notes.push(`${label} 통과`);
}

const frontend = path.join(root, "frontend");
const isFrontendUnit = /^frontend\/(scripts\/.*\.js|tests\/.*\.test\.cjs|design\/tokens\/.*\.json)$/.test(rel);
const isFrontendSource = /^frontend\/(scripts|styles|templates|assets|design\/tokens)\//.test(rel);

if (isFrontendUnit) {
  const tests = readdirSync(path.join(frontend, "tests")).filter((f) => f.endsWith(".test.cjs")).map((f) => "tests/" + f);
  run("frontend 단위 테스트(node --test)", process.execPath, ["--test", ...tests], frontend);
}

if (/^backend\/.*\.py$/.test(rel)) {
  const venv = path.join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  run("backend 단위 테스트(unittest)", existsSync(venv) ? venv : "python", ["-m", "unittest", "discover", "-s", "backend/tests"], root);
}

if (isFrontendSource) {
  notes.push("frontend 소스가 바뀌었습니다. 작업 마무리 전 frontend에서 `node tools/build.mjs`로 index.html을 재생성하고(빌드가 자동 백업), 필요한 브라우저 검사를 실행하세요.");
}
if (rel.startsWith("frontend/design/tokens/")) {
  notes.push("토큰 변경: `node tools/build-design-preview.mjs`, `node tools/build-wireframes.mjs; node tests/wireframes.cjs`도 재생성·검증해야 합니다.");
}
if (rel === "CLAUDE.md" || rel === "AGENTS.md") {
  const other = rel === "CLAUDE.md" ? "AGENTS.md" : "CLAUDE.md";
  notes.push(`${rel}을 수정했습니다. 규칙 변경이면 ${other}도 함께 갱신하세요(먼저 백업).`);
}

if (failures.length) {
  process.stderr.write(`[post-edit] ${rel} 수정 후 검증 실패:\n${failures.join("\n\n")}\n`);
  process.exit(2);
}
if (notes.length) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n") } }));
}
