# Add a lesson to the Opposites Library

Live site: https://lesson-library-beta.vercel.app
No git push and no redeploy are needed. New lessons show up within about 1 to 2 minutes.

## Daily steps (Spanish 8:00 AM ET, Russian 8:05 AM ET)

1. Build the lesson as you do now, so these two files exist:
   - Video: `/workspace/<course>/lessons/lesson-NNN.mp4`
   - Report: `/workspace/<course>/lesson_NNN_report.json`

   `<course>` is `spanish-opposites` or `russian-opposites`.
2. Run the sync. One command handles both languages:

   ```bash
   cd /workspace/lesson-library && npm run sync
   ```

   The sync is idempotent. It uploads only new or changed mp4s and skips everything else.
   When nothing changed it prints `No changes. N lessons (...) already live.`
   On success it prints `Uploaded K video(s). Manifest: ...` and the lesson counts.
3. Optional check after about 2 minutes:

   ```bash
   curl -s https://lesson-library-beta.vercel.app/ | grep -o 'data-lesson-id="[^"]*"' | head -3
   ```

   The newest lesson should be listed first.

Preview without uploading: `npm run sync:dry`. This writes the manifest to `.cache/manifest.json` and nothing else.
Re-upload everything: `node scripts/sync-lessons.mjs --force`.

## Report JSON fields the site reads

The sync reads these fields from `lesson_NNN_report.json`. Your current report format already works.

| field | required | used for |
|---|---|---|
| `pairs[]` with `n`, `pair` ("left / right"), `left`, `right`, `left_spoken`, `right_spoken`, optional `tip` | yes | the 10 pairs on the card (words, sentences, tip) |
| `date` ("YYYY-MM-DD", Eastern) | **recommended** | the date group. Add this field to every new report |
| `slot` (`mañana`/`tarde`/`noche` or `утро`/`день`/`вечер`) | recommended | Morning/Afternoon/Evening label and ordering within a day |
| `theme` (e.g. `digital`, `здоровье`) and `theme_label` ("Tema: ...") | recommended | card title (English gloss) and native-language subtitle |
| `theme_en` (e.g. "Digital life") | optional | overrides the English theme title |
| `review_pairs[]` (same shape as pairs, plus `from_lesson`) | optional | "Spaced review" list |
| `closing_question` (Spanish) / `question` (Russian) | optional | speaking prompt at the bottom of the card |
| `duration_seconds`, `voice` | optional | duration chip |

When `date` is missing, the date comes from the first of these that has one:
`evolution_log.md` (a line like `2026-10-12 morning | lesson-017 | ...`), then the `Slot: ... YYYY-MM-DD` line in `lesson_NNN_BLOCKED.md`, then `scripts/lesson-dates.json`, then the mp4's modification date in ET.

Example minimal report:

```json
{
  "date": "2026-10-12",
  "slot": "mañana",
  "theme": "ropa",
  "theme_label": "Tema: la ropa",
  "theme_en": "Clothing",
  "duration_seconds": 360.0,
  "pairs": [
    { "n": 1, "pair": "ponerse / quitarse", "left": "Me pongo la chaqueta.", "right": "Me quito la chaqueta.", "left_spoken": "ponerse", "right_spoken": "quitarse", "tip": "..." }
  ]
}
```

## Where things live

- Repo: https://github.com/Zaevian/lesson-library (Next.js 15), checked out at `/workspace/lesson-library`
- Vercel: team `zaevians-projects`, project `lesson-library`
- Storage, active backend `github`: assets on the release https://github.com/Zaevian/lesson-library/releases/tag/lessons
  - `spanish-lesson-NNN.mp4`, `russian-lesson-NNN.mp4`, `manifest.json`
  - Upload uses the box's `gh` login (account Zaevian). No other credential is needed.
  - The site streams videos from `/video/<language>/<lesson>.mp4` as `video/mp4` with range support.
- Blob backend (inactive): Vercel Blob store creation was refused (403) for the connected Vercel account. To switch later,
  create a public Blob store connected to the `lesson-library` project, put
  `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...` in `/home/box/.config/lesson-library.env` (chmod 600, never commit),
  run `node scripts/sync-lessons.mjs --force`, and redeploy once so the site has the token env var.
  The site and the script both pick Blob automatically when the token is present.

## Troubleshooting

- `skip <lang>/<lesson>: no readable report JSON yet`: the report is missing or invalid. Fix it and rerun the sync.
- `gh: ... HTTP 401/403`: the box `gh` login expired. Run `gh auth status`.
- Lesson in the wrong date group: add `"date"` to its report and rerun `npm run sync`.
- Do not delete the `lessons` release. It is the storage.
