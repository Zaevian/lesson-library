#!/usr/bin/env node
/**
 * Daily Spanish quiz sync.
 * Reads every /workspace/spanish-opposites/quizzes/YYYY-MM-DD.json (override with QUIZ_ROOT),
 * validates it, bundles them into quizzes.json and uploads that to the GitHub release
 * "lessons" (same as manifest.json). The site reads it with 60s revalidate: no deploy needed.
 * Usage: npm run sync-quiz  [--dry-run]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");
const ROOT = process.env.QUIZ_ROOT || "/workspace/spanish-opposites/quizzes";
const GH_REPO = process.env.LESSON_GH_REPO || "Zaevian/lesson-library";
const GH_TAG = process.env.LESSON_GH_TAG || "lessons";
const TYPES = new Set(["mc", "fill", "translate"]);

function checkItem(q, where, errs, top) {
  if (!q.id) errs.push(`${where}: missing id`);
  if (!TYPES.has(q.type)) errs.push(`${where}: type must be mc|fill|translate`);
  if (!q.prompt) errs.push(`${where}: missing prompt`);
  if (!q.explanation) errs.push(`${where}: missing explanation`);
  if (q.type === "mc") {
    if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`${where}: mc needs >=2 options`);
    else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) errs.push(`${where}: answer must be an option index`);
  } else if (!Array.isArray(q.answers) || !q.answers.length) errs.push(`${where}: ${q.type} needs answers[]`);
  if (top) {
    if (!Array.isArray(q.variants) || q.variants.length < 1 || q.variants.length > 2) errs.push(`${where}: needs 1-2 variants`);
    (q.variants || []).forEach((v, i) => checkItem(v, `${where}.variants[${i}]`, errs, false));
  }
}

if (!existsSync(ROOT)) { console.error(`${ROOT} missing`); process.exit(1); }
const quizzes = []; const errs = [];
for (const f of readdirSync(ROOT).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) {
  let q;
  try { q = JSON.parse(readFileSync(join(ROOT, f), "utf8")); } catch (e) { errs.push(`${f}: bad JSON (${e.message})`); continue; }
  const date = f.slice(0, 10);
  if (q.date !== date) errs.push(`${f}: "date" must be ${date}`);
  if (!Array.isArray(q.questions) || q.questions.length !== 5) errs.push(`${f}: needs exactly 5 questions`);
  const ids = new Set();
  (q.questions || []).forEach((it, i) => {
    checkItem(it, `${f} q[${i}]`, errs, true);
    for (const x of [it, ...(it.variants || [])]) { if (ids.has(x.id)) errs.push(`${f}: duplicate id ${x.id}`); ids.add(x.id); }
  });
  quizzes.push(q);
}
if (errs.length) { console.error("Quiz validation failed:\n- " + errs.join("\n- ")); process.exit(1); }
quizzes.sort((a, b) => b.date.localeCompare(a.date));
const bundle = { version: 1, updatedAt: new Date().toISOString(), quizzes };
mkdirSync(join(REPO, ".cache"), { recursive: true });
const out = join(REPO, ".cache", "quizzes.json");
writeFileSync(out, JSON.stringify(bundle, null, 2));
if (DRY) { console.log(`[dry-run] ${quizzes.length} quiz(zes) valid; wrote ${out}`); process.exit(0); }
execFileSync("gh", ["release", "upload", GH_TAG, out, "--repo", GH_REPO, "--clobber"], { stdio: "inherit", timeout: 120000 });
console.log(`Uploaded quizzes.json (${quizzes.length} quizzes, newest ${quizzes[0]?.date}). Live at /quiz within ~1-2 minutes.`);
