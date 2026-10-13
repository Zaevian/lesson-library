"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Quiz } from "@/lib/quiz";
import { load } from "@/lib/quizState";

function todayET() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function QuizList({ quizzes }: { quizzes: Quiz[] }) {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(todayET());
    const s: Record<string, string> = {};
    for (const z of quizzes) {
      const st = load(z.date);
      s[z.date] = !st ? "Not started" : st.finishedAt ? "✓ Done" : `In progress · ${st.solvedSlots.length} solved`;
    }
    setStatus(s);
  }, [quizzes]);
  if (!quizzes.length) return <div className="card p-6 text-sm text-[var(--muted)]">No quizzes yet.</div>;
  return (
    <div className="space-y-6">
      {quizzes.map((z) => {
        const d = new Date(`${z.date}T12:00:00Z`);
        return (
          <section key={z.date} data-date={z.date}>
            <h2 className="mb-2 flex items-baseline gap-2 px-1">
              <span className="text-lg font-semibold">{new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(d)}</span>
              <span className="text-sm text-[var(--muted)]">{new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d)}</span>
              {today === z.date ? <span className="rounded-full bg-[var(--good)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--good)]">Today</span> : null}
            </h2>
            <Link href={`/quiz/${z.date}`} className="card block p-4 transition hover:bg-white/10">
              <p className="font-medium text-white">{z.title ?? "Daily Spanish quiz"}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{z.questions.length} questions{z.level ? ` · ${z.level}` : ""} · {[...new Set(z.questions.map((q) => q.trap).filter(Boolean))].join(", ")}</p>
              <p className="mt-2 text-sm text-[var(--accent)]">{status[z.date] ?? ""} →</p>
            </Link>
          </section>
        );
      })}
    </div>
  );
}
