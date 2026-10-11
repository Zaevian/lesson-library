import type { Lesson, Pair } from "@/lib/types";

function mmss(sec: number | null): string | null {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function PairRow({ p, lang }: { p: Pair; lang: string }) {
  return (
    <li className="rounded-xl border border-white/5 bg-white/[0.03]">
      <details>
        <summary className="flex items-center gap-3 px-3 py-2.5">
          <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--muted)]">{p.n}</span>
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5" lang={lang}>
            <span className="font-medium text-white">{p.left.word}</span>
            <span className="text-[var(--muted)]">↔</span>
            <span className="font-medium text-[var(--accent-2)]">{p.right.word}</span>
          </span>
          <span className="chev shrink-0 text-xs text-[var(--muted)] transition-transform">▸</span>
        </summary>
        <div className="space-y-1.5 px-3 pb-3 pl-11 text-sm leading-relaxed text-[var(--muted)]" lang={lang}>
          {p.left.sentence ? <p><span className="text-white/80">{p.left.sentence}</span></p> : null}
          {p.right.sentence ? <p><span className="text-white/80">{p.right.sentence}</span></p> : null}
          {p.tip ? <p className="text-xs italic text-[var(--muted)]">💡 {p.tip}</p> : null}
          {p.fromLesson ? <p className="text-[11px] uppercase tracking-wider">from {p.fromLesson}</p> : null}
        </div>
      </details>
    </li>
  );
}

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const isEs = lesson.language === "spanish";
  const lang = isEs ? "es" : "ru";
  const color = isEs ? "var(--es)" : "var(--ru)";
  const flag = isEs ? "🇲🇽" : "🇷🇺";
  const theme = lesson.themeEnglish ?? lesson.themeLabel ?? "Everyday opposites";
  const duration = mmss(lesson.durationSeconds);

  return (
    <article className="card overflow-hidden" data-lesson-id={lesson.id} data-language={lesson.language}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full px-2.5 py-1 font-semibold" style={{ color, background: "rgba(255,255,255,0.06)", boxShadow: `inset 0 0 0 1px ${color}40` }}>
            {flag} {lesson.languageLabel}
          </span>
          <span className="text-[var(--muted)]">{shortDate(lesson.date)}</span>
          {lesson.slotLabel ? <span className="text-[var(--muted)]">· {lesson.slotLabel}</span> : null}
          {duration ? <span className="text-[var(--muted)]">· {duration}</span> : null}
          <span className="ml-auto font-mono text-[var(--muted)]">{lesson.title}</span>
        </div>

        <h3 className="mt-3 text-xl font-semibold tracking-tight">
          {theme}
          {lesson.themeLabel && lesson.themeLabel !== theme ? (
            <span className="ml-2 text-base font-normal text-[var(--muted)]" lang={lang}>{lesson.themeLabel}</span>
          ) : null}
        </h3>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            src={`${lesson.videoUrl}#t=0.1`}
          >
            <track kind="captions" />
          </video>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">10 opposite pairs</p>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {lesson.pairs.map((p) => <PairRow key={p.n} p={p} lang={lang} />)}
          </ol>
        </div>

        {lesson.reviewPairs.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Spaced review</p>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {lesson.reviewPairs.map((p) => <PairRow key={`r${p.n}`} p={{ ...p, n: p.n }} lang={lang} />)}
            </ol>
          </div>
        ) : null}

        {lesson.question ? (
          <p className="mt-4 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white/85" lang={lang}>
            <span className="mr-1 text-[var(--warm)]">🗣</span>{lesson.question}
          </p>
        ) : null}
      </div>
    </article>
  );
}
