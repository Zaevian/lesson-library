"use client";

import { useEffect, useMemo, useState } from "react";
import type { Language, Lesson } from "@/lib/types";
import { LessonCard } from "./LessonCard";

type Filter = "all" | Language;

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "spanish", label: "Spanish" },
  { key: "russian", label: "Russian" },
];

function formatDay(iso: string): { weekday: string; full: string } {
  const d = new Date(`${iso}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(d),
    full: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d),
  };
}

function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function LessonFeed({ lessons }: { lessons: Lesson[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang === "spanish" || lang === "russian") setFilter(lang);
    setToday(todayET());
  }, []);

  function choose(next: Filter) {
    setFilter(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("lang");
    else url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
  }

  const groups = useMemo(() => {
    const visible = filter === "all" ? lessons : lessons.filter((l) => l.language === filter);
    const map = new Map<string, Lesson[]>();
    for (const l of visible) {
      const arr = map.get(l.date) ?? [];
      arr.push(l);
      map.set(l.date, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [lessons, filter]);

  const countFor = (k: Filter) => (k === "all" ? lessons.length : lessons.filter((l) => l.language === k).length);

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-6 bg-[var(--bg)]/70 px-4 py-3 backdrop-blur-md">
        <div role="tablist" aria-label="Language" className="card flex p-1">
          {TABS.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => choose(t.key)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-white"
                }`}
              >
                {t.label} <span className="ml-1 text-xs opacity-60">{countFor(t.key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card p-6 text-sm text-[var(--muted)]">No lessons yet.</div>
      ) : (
        <div className="space-y-10">
          {groups.map(([date, items]) => {
            const { weekday, full } = formatDay(date);
            const estimated = items.every((l) => l.dateEstimated);
            return (
              <section key={date} aria-labelledby={`d-${date}`} data-date={date}>
                <h2 id={`d-${date}`} className="mb-3 flex items-baseline gap-2 px-1">
                  <span className="text-lg font-semibold">{weekday}</span>
                  <span className="text-sm text-[var(--muted)]">{full}</span>
                  {today === date ? (
                    <span className="rounded-full bg-[var(--good)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--good)]">Today</span>
                  ) : null}
                  {estimated ? <span className="text-[11px] text-[var(--muted)]/70">(approx. date)</span> : null}
                </h2>
                <div className="space-y-4">
                  {items.map((l) => (
                    <LessonCard key={l.id} lesson={l} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
