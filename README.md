# Opposites Library

Zae's Spanish and Russian opposite-pair video lessons in one newest-first feed,
grouped by date, with All / Spanish / Russian tabs. Next.js 15 on Vercel
(team `zaevians-projects`, project `lesson-library`).

- Lessons are **not** in git. Videos and `manifest.json` live as assets on the
  GitHub release [`lessons`](https://github.com/Zaevian/lesson-library/releases/tag/lessons)
  (Vercel Blob backend is built in and switches on automatically once a Blob token exists).
- The site reads the manifest at request time (60 s revalidate), so new lessons
  appear without a git push or redeploy.
- Videos stream through `/video/<language>/<lesson>.mp4` (edge route, `video/mp4`, range requests).

Adding lessons: see [ADD-A-LESSON.md](./ADD-A-LESSON.md). In short: `cd /workspace/lesson-library && npm run sync`.
