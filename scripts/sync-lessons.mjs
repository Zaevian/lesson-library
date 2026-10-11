#!/usr/bin/env node
/**
 * Opposites Library: idempotent lesson sync.
 *
 * Scans the Spanish and Russian lesson folders on the box, uploads any new or
 * changed mp4 to Vercel Blob, rebuilds manifest.json from the lesson report
 * JSONs, and uploads the manifest. The live site reads the manifest at request
 * time (60s revalidate), so no git push or redeploy is needed.
 *
 * Usage:  npm run sync            (from /workspace/lesson-library)
 *         node scripts/sync-lessons.mjs [--dry-run] [--force]
 *
 * Storage backend (picked automatically):
 *   - "blob":   if BLOB_READ_WRITE_TOKEN is set (env, /home/box/.config/lesson-library.env,
 *               or ./.env.local), videos + manifest go to Vercel Blob.
 *   - "github": otherwise, videos + manifest go to assets on the GitHub release
 *               "lessons" of Zaevian/lesson-library, using the box's `gh` login.
 *               The site streams videos through /video/<language>/<file>.mp4.
 * Force one with LESSON_BACKEND=blob|github.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtempSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const FORCE = args.has("--force");

const TOKEN_FILES = ["/home/box/.config/lesson-library.env", join(REPO, ".env.local")];
const MANIFEST_PATH = "manifest.json";
const GH_REPO = process.env.LESSON_GH_REPO || "Zaevian/lesson-library";
const GH_TAG = process.env.LESSON_GH_TAG || "lessons";
const GH_DL = `https://github.com/${GH_REPO}/releases/download/${GH_TAG}`;

function gh(args, opts = {}) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function ghUpload(assetName, sourcePath) {
  const dir = mkdtempSync(join(tmpdir(), "lesson-sync-"));
  try {
    const link = join(dir, assetName);
    symlinkSync(sourcePath, link);
    gh(["release", "upload", GH_TAG, link, "--repo", GH_REPO, "--clobber"], { timeout: 300000 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const COURSES = [
  {
    language: "spanish",
    label: "Spanish",
    root: process.env.SPANISH_ROOT || "/workspace/spanish-opposites",
    slotOrder: { "mañana": 0, tarde: 1, noche: 2 },
    slotEnglish: { "mañana": "Morning", tarde: "Afternoon", noche: "Evening" },
    themePrefix: /^Tema:\s*/i,
  },
  {
    language: "russian",
    label: "Russian",
    root: process.env.RUSSIAN_ROOT || "/workspace/russian-opposites",
    slotOrder: { "утро": 0, "день": 1, "вечер": 2 },
    slotEnglish: { "утро": "Morning", "день": "Afternoon", "вечер": "Evening" },
    themePrefix: /^Тема:\s*/i,
  },
];

function loadToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const f of TOKEN_FILES) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?BLOB_READ_WRITE_TOKEN\s*=\s*"?([^"\s]+)"?/);
      if (m) return m[1];
    }
  }
  return null;
}

function etDate(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

function sha1File(path) {
  return createHash("sha1").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

/** "lesson-016" -> report file name candidates */
function reportCandidates(root, slug) {
  const out = [];
  const m = slug.match(/^lesson-(\d+)$/);
  if (m) out.push(join(root, `lesson_${m[1]}_report.json`));
  if (slug.startsWith("sample")) out.push(join(root, "sample_report.json"));
  out.push(join(root, `${slug.replace(/-/g, "_")}_report.json`), join(root, "lessons", `${slug}.json`));
  return out;
}

/** evolution_log.md lines: "2026-10-11 afternoon | lesson-016 | ..." */
function evolutionDates(root) {
  const map = {};
  const f = join(root, "evolution_log.md");
  if (!existsSync(f)) return map;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2})[^|]*\|\s*((?:sample-)?lesson-\d+)\s*\|/);
    if (m) map[m[2]] = m[1];
  }
  return map;
}

/** lesson_NNN_BLOCKED.md lines: "- Slot: morning 2026-09-29 ET ~8am" */
function blockedDate(root, slug) {
  const m = slug.match(/^lesson-(\d+)$/);
  if (!m) return null;
  const f = join(root, `lesson_${m[1]}_BLOCKED.md`);
  if (!existsSync(f)) return null;
  const hit = readFileSync(f, "utf8").match(/Slot:\s*\S+\s+(\d{4}-\d{2}-\d{2})/);
  return hit ? hit[1] : null;
}

function slotFrom(report, course) {
  const keys = Object.keys(course.slotOrder);
  if (report.slot && keys.includes(String(report.slot).toLowerCase())) return String(report.slot).toLowerCase();
  const text = `${report.intro_title || ""} ${report.intro || ""}`.toLowerCase();
  const hints = course.language === "spanish"
    ? [["mañana", "mañana"], ["tarde", "tarde"], ["noche", "noche"]]
    : [["утр", "утро"], ["днев", "день"], ["добрый день", "день"], ["вечер", "вечер"]];
  for (const [needle, slot] of hints) if (text.includes(needle)) return slot;
  return null;
}

const THEME_EN = {
  viaje: "Travel", comida: "Food", casa: "Home", trabajo: "Work", clima: "Weather", salud: "Health",
  emociones: "Emotions", dinero: "Money", digital: "Digital life", ropa: "Clothing", ciudad: "City",
  "путешествия": "Travel", "еда": "Food", "дом": "Home", "работа": "Work", "погода": "Weather",
  "здоровье": "Health", "эмоции": "Emotions", "деньги": "Money", "город": "City", "одежда": "Clothing",
};

function cleanPair(p) {
  const [a, b] = String(p.pair || "").split("/").map((s) => s.trim());
  return {
    n: p.n,
    left: { word: a || p.left_spoken || "", spoken: p.left_spoken || a || "", sentence: p.left || "" },
    right: { word: b || p.right_spoken || "", spoken: p.right_spoken || b || "", sentence: p.right || "" },
    tip: p.tip || null,
    ...(p.from_lesson ? { fromLesson: p.from_lesson } : {}),
  };
}

async function main() {
  const token = loadToken();
  const backend = process.env.LESSON_BACKEND || (token ? "blob" : "github");
  if (backend === "blob" && !token) {
    console.error("LESSON_BACKEND=blob but no BLOB_READ_WRITE_TOKEN found (env, " + TOKEN_FILES.join(", ") + ")");
    process.exit(1);
  }
  console.log(`backend: ${backend}${DRY ? " (dry run)" : ""}`);
  const overrides = readJson(join(__dirname, "lesson-dates.json")) || {};
  const blob = backend === "blob" && !DRY ? await import("@vercel/blob") : null;

  // Load the current manifest so unchanged videos are not re-uploaded.
  let previous = { lessons: [] };
  try {
    let url = `${GH_DL}/${MANIFEST_PATH}`;
    if (blob) url = (await blob.head(MANIFEST_PATH, { token })).url;
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store", redirect: "follow" });
    if (res.ok) previous = await res.json();
  } catch { /* first run */ }
  let ghAssets = new Map();
  if (backend === "github" && !DRY) {
    const info = JSON.parse(gh(["release", "view", GH_TAG, "--repo", GH_REPO, "--json", "assets"]));
    ghAssets = new Map(info.assets.map((a) => [a.name, a.size]));
  }
  const prevById = new Map((previous.lessons || []).map((l) => [l.id, l]));

  const lessons = [];
  let uploaded = 0;
  for (const course of COURSES) {
    const dir = join(course.root, "lessons");
    if (!existsSync(dir)) { console.warn(`skip ${course.label}: ${dir} missing`); continue; }
    const evo = evolutionDates(course.root);
    const files = readdirSync(dir).filter((f) => /\.mp4$/i.test(f)).sort();
    for (const file of files) {
      const slug = file.replace(/\.mp4$/i, "");
      const mp4 = join(dir, file);
      const st = statSync(mp4);
      const reportPath = reportCandidates(course.root, slug).find((p) => existsSync(p));
      const report = reportPath ? readJson(reportPath) : null;
      if (!report || !Array.isArray(report.pairs)) {
        console.warn(`skip ${course.language}/${slug}: no readable report JSON yet`);
        continue;
      }
      const id = `${course.language}-${slug}`;
      const ov = overrides[id] || {};
      let date = report.date || evo[slug] || blockedDate(course.root, slug) || ov.date || null;
      let dateSource = report.date ? "report" : evo[slug] ? "evolution_log" : blockedDate(course.root, slug) ? "blocked-note" : ov.date ? "override" : "file-mtime";
      if (!date) date = etDate(st.mtimeMs);
      const estimated = dateSource === "file-mtime" || (dateSource === "override" && ov.estimated !== false);

      const slot = slotFrom(report, course);
      const numMatch = slug.match(/(\d+)$/);
      const number = numMatch ? parseInt(numMatch[1], 10) : 0;
      const isSample = slug.startsWith("sample");
      const themeLabel = report.theme_label ? String(report.theme_label).replace(course.themePrefix, "").trim() : null;

      const sha1 = sha1File(mp4);
      const pathname = `videos/${course.language}/${slug}.mp4`;
      const assetName = `${course.language}-${slug}.mp4`;
      const prev = prevById.get(id);
      let videoUrl = prev && prev.sha1 === sha1 && prev.videoPathname === pathname && prev.backend === backend ? prev.videoUrl : null;
      if (backend === "github" && videoUrl && ghAssets.get(assetName) !== st.size) videoUrl = null;
      if (!videoUrl || FORCE) {
        if (DRY) {
          videoUrl = `(would upload ${pathname})`;
        } else if (backend === "github") {
          process.stdout.write(`upload ${assetName} (${(st.size / 1048576).toFixed(1)} MB) ... `);
          ghUpload(assetName, mp4);
          videoUrl = `/video/${course.language}/${slug}.mp4?v=${sha1.slice(0, 10)}`;
          uploaded++;
          console.log("ok");
        } else {
          process.stdout.write(`upload ${pathname} (${(st.size / 1048576).toFixed(1)} MB) ... `);
          const res = await blob.put(pathname, readFileSync(mp4), {
            access: "public",
            token,
            contentType: "video/mp4",
            addRandomSuffix: false,
            allowOverwrite: true,
            multipart: st.size > 5 * 1024 * 1024,
            // version query below busts CDN cache when a video is replaced
            cacheControlMaxAge: 60 * 60 * 24 * 30,
          });
          videoUrl = `${res.url}?v=${sha1.slice(0, 10)}`;
          uploaded++;
          console.log("ok");
        }
      }

      lessons.push({
        id,
        language: course.language,
        languageLabel: course.label,
        slug,
        number,
        isSample,
        title: isSample ? `Sample lesson ${number}` : `Lesson ${number}`,
        date,
        dateSource,
        dateEstimated: estimated,
        slot,
        slotLabel: slot ? course.slotEnglish[slot] : null,
        slotOrder: slot != null ? course.slotOrder[slot] : 0,
        theme: report.theme || null,
        themeLabel: themeLabel || null,
        themeEnglish: report.theme_en || THEME_EN[String(report.theme || "").toLowerCase()] || (report.theme ? null : "Everyday opposites"),
        introTitle: report.intro_title || null,
        question: report.closing_question || report.question || null,
        voice: report.voice || null,
        durationSeconds: report.duration_seconds ?? null,
        sizeBytes: st.size,
        sha1,
        backend,
        videoPathname: pathname,
        videoUrl,
        pairs: report.pairs.map(cleanPair),
        reviewPairs: Array.isArray(report.review_pairs) ? report.review_pairs.map(cleanPair) : [],
      });
    }
  }

  // Newest first: date desc, then later slot first, then higher lesson number, Spanish before Russian on ties.
  lessons.sort((a, b) =>
    b.date.localeCompare(a.date) ||
    b.slotOrder - a.slotOrder ||
    a.language.localeCompare(b.language) * -1 ||
    b.number - a.number,
  );

  const manifest = {
    version: 1,
    backend,
    site: "Opposites Library",
    updatedAt: new Date().toISOString(),
    counts: {
      total: lessons.length,
      spanish: lessons.filter((l) => l.language === "spanish").length,
      russian: lessons.filter((l) => l.language === "russian").length,
    },
    lessons,
  };

  mkdirSync(join(REPO, ".cache"), { recursive: true });
  writeFileSync(join(REPO, ".cache", "manifest.json"), JSON.stringify(manifest, null, 2));

  const unchanged = JSON.stringify({ ...manifest, updatedAt: null }) === JSON.stringify({ ...previous, updatedAt: null });
  if (DRY) {
    console.log(`[dry-run] ${lessons.length} lessons (es ${manifest.counts.spanish}, ru ${manifest.counts.russian}); manifest written to .cache/manifest.json`);
    return;
  }
  if (unchanged && !FORCE) {
    console.log(`No changes. ${lessons.length} lessons (es ${manifest.counts.spanish}, ru ${manifest.counts.russian}) already live.`);
    return;
  }
  let manifestUrl;
  if (backend === "github") {
    const file = join(REPO, ".cache", "manifest.json");
    gh(["release", "upload", GH_TAG, file, "--repo", GH_REPO, "--clobber"], { timeout: 120000 });
    manifestUrl = `${GH_DL}/${MANIFEST_PATH}`;
  } else {
    const res = await blob.put(MANIFEST_PATH, JSON.stringify(manifest, null, 2), {
      access: "public",
      token,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
    manifestUrl = res.url;
  }
  console.log(`Uploaded ${uploaded} video(s). Manifest: ${manifestUrl}`);
  console.log(`${lessons.length} lessons (es ${manifest.counts.spanish}, ru ${manifest.counts.russian}). Site updates within ~1-2 minutes.`);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
