#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit|NotebookEdit) hook + 수동 백업 CLI.
// - 기존 파일은 수정 전에 .backups/<상대경로>/<이름>.vNNN.<확장자>로 백업하고 SHA-256으로 일치를 확인합니다.
// - 한 세션(작업)에서 같은 파일은 최초 변경 전에 한 번만 백업합니다.
// - 백업 실패 시 exit 2로 도구 호출을 차단합니다(CLAUDE.md 공용 절대규칙 1~4).
// - index.html 직접 편집은 사용자 확인(ask)을 요구합니다(규칙 5~6).
// 수동 사용: node .claude/hooks/backup-guard.mjs --file <경로> [--file <경로> ...]
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const root = path.resolve(process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL("../../", import.meta.url)));
const SKIP_DIRS = new Set([".backups", ".git", "node_modules", ".venv", "__pycache__"]);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const posix = (p) => p.split(path.sep).join("/");

export function relativeInRepo(filePath) {
  const rel = path.relative(root, path.resolve(root, filePath));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (rel.split(path.sep).some((part) => SKIP_DIRS.has(part))) return null;
  return rel;
}

export async function backupFile(rel) {
  const source = path.join(root, rel);
  const bytes = await readFile(source);
  const parsed = path.parse(rel);
  const directory = path.join(root, ".backups", parsed.dir);
  await mkdir(directory, { recursive: true });
  const prefix = parsed.name + ".v";
  const suffix = parsed.ext;
  const numbers = (await readdir(directory))
    .filter((n) => n.startsWith(prefix) && n.endsWith(suffix))
    .map((n) => n.slice(prefix.length, suffix ? -suffix.length : undefined))
    .filter((n) => /^\d+$/.test(n))
    .map(Number);
  const next = String(Math.max(0, ...numbers) + 1).padStart(3, "0");
  const destination = path.join(directory, `${prefix}${next}${suffix}`);
  await writeFile(destination, bytes, { flag: "wx" }); // 기존 백업 덮어쓰기 금지
  if (sha(bytes) !== sha(await readFile(destination))) throw new Error("백업 검증 실패: " + rel);
  return posix(path.relative(root, destination));
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

async function loadState(sessionId) {
  const file = path.join(os.tmpdir(), "claude-backup-guard", `${sessionId.replace(/[^\w-]/g, "_")}.json`);
  try { return { file, done: new Set(JSON.parse(await readFile(file, "utf8"))) }; }
  catch { return { file, done: new Set() }; }
}

async function saveState(state) {
  await mkdir(path.dirname(state.file), { recursive: true });
  await writeFile(state.file, JSON.stringify([...state.done]));
}

async function runCli(args) {
  const files = args.flatMap((a, i) => (args[i - 1] === "--file" ? [a] : []));
  if (!files.length) { console.error("사용법: node .claude/hooks/backup-guard.mjs --file <경로>"); process.exit(1); }
  let failed = false;
  for (const f of files) {
    const rel = relativeInRepo(f);
    if (!rel) { console.error(`건너뜀(저장소 밖 또는 제외 경로): ${f}`); continue; }
    if (!(await exists(path.join(root, rel)))) { console.log(`신규 파일이라 백업 불필요: ${rel}`); continue; }
    try { console.log(`백업 완료: ${posix(rel)} → ${await backupFile(rel)}`); }
    catch (e) { failed = true; console.error(`백업 실패: ${rel}: ${e.message}`); }
  }
  process.exit(failed ? 2 : 0);
}

async function runHook() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || "{}");
  const target = input.tool_input?.file_path || input.tool_input?.notebook_path;
  if (!target) return;
  const relNative = relativeInRepo(target);
  if (!relNative || !(await exists(path.join(root, relNative)))) return; // 저장소 밖·제외 경로·신규 파일
  const rel = posix(relNative);

  const state = await loadState(input.session_id || "no-session");
  let note = "";
  if (!state.done.has(rel)) {
    try {
      const dest = await backupFile(rel);
      state.done.add(rel);
      await saveState(state);
      note = `수정 전 백업 생성: ${rel} → ${dest}`;
    } catch (e) {
      console.error(`[backup-guard] 백업 실패로 수정을 차단합니다 (${rel}): ${e.message}\n백업을 확보하기 전에는 이 파일을 수정하지 마세요.`);
      process.exit(2);
    }
  }

  const output = { hookSpecificOutput: { hookEventName: "PreToolUse" } };
  if (path.basename(rel).toLowerCase() === "index.html") {
    output.hookSpecificOutput.permissionDecision = "ask";
    output.hookSpecificOutput.permissionDecisionReason =
      `${rel} 직접 편집은 원칙적으로 금지입니다(CLAUDE.md 규칙 5·6). 모듈 소스 수정 후 공식 빌드(frontend: node tools/build.mjs)로 재생성하세요. ` +
      "사용자가 명시적으로 허용한 경우에만 승인하고, 완료 보고에 예외 이유와 검증 결과를 기록합니다.";
  }
  if (note) output.hookSpecificOutput.additionalContext = note;
  if (note || output.hookSpecificOutput.permissionDecision) process.stdout.write(JSON.stringify(output));
}

if (process.argv.includes("--file")) await runCli(process.argv.slice(2));
else await runHook();
