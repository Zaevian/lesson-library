import { LessonFeed } from "@/components/LessonFeed";
import { getManifest } from "@/lib/manifest";

export const revalidate = 60;

export default async function Home() {
  const { manifest, error } = await getManifest();
  const lessons = manifest?.lessons ?? [];
  const counts = manifest?.counts ?? { total: 0, spanish: 0, russian: 0 };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:pt-12">
      <header className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Zae · Daily lessons</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Opposites Library</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          Every Spanish and Russian opposite-pair video, newest first. Ten pairs per lesson, one lesson a day per language.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1"><b className="text-white">{counts.total}</b> lessons</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1"><b className="text-[var(--es)]">{counts.spanish}</b> Spanish</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1"><b className="text-[var(--ru)]">{counts.russian}</b> Russian</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1"><b className="text-white">{counts.total * 10}</b> pairs</span>
        </div>
      </header>

      {error ? (
        <div className="card p-6 text-sm text-[var(--muted)]">{error}</div>
      ) : (
        <LessonFeed lessons={lessons} />
      )}

      {manifest?.updatedAt ? (
        <footer className="mt-10 text-center text-xs text-[var(--muted)]">
          Library updated {new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }).format(new Date(manifest.updatedAt))} ET
        </footer>
      ) : null}
    </main>
  );
}
