"use client";

import { useEffect, useMemo, useState } from "react";
import type { QItem, Question, Quiz } from "@/lib/quiz";
import { normalize } from "@/lib/quiz";
import { findItem, load, outstandingMisses, save, type QuizState } from "@/lib/quizState";

const TYPE_LABEL = { mc: "Multiple choice", fill: "Fill in the blank", translate: "Translate" } as const;

function questionOf(all: Quiz[], slot: string): Question | null {
  const [date, qid] = slot.split("#");
  return all.find((z) => z.date === date)?.questions.find((q) => q.id === qid) ?? null;
}

function fresh(quiz: Quiz, earlier: Quiz[]): QuizState {
  const all = [quiz, ...earlier];
  const review = outstandingMisses(earlier).slice(-3);
  const steps: QuizState["steps"] = [];
  for (const slot of review) {
    const q = questionOf(all, slot);
    if (q) steps.push({ slot, itemId: (q.variants[0] ?? q).id, review: true });
  }
  for (const q of quiz.questions) steps.push({ slot: `${quiz.date}#${q.id}`, itemId: q.id });
  return { steps, pos: 0, revealed: false, lastCorrect: null, lastGiven: "", attempts: [], missedSlots: [], solvedSlots: [], finishedAt: null, reviewSlots: review };
}

function grade(item: QItem, given: string): boolean {
  if (item.type === "mc") return Number(given) === item.answer;
  const g = normalize(given);
  return (item.answers ?? []).some((a) => normalize(a) === g);
}

function wrongWhy(item: QItem, given: string): string | null {
  if (item.type === "mc") return item.options?.[Number(given)]?.why ?? null;
  const g = normalize(given);
  for (const [k, v] of Object.entries(item.wrong ?? {})) if (normalize(k) === g) return v;
  return null;
}

export function QuizPlayer({ quiz, earlier }: { quiz: Quiz; earlier: Quiz[] }) {
  const all = useMemo(() => [quiz, ...earlier], [quiz, earlier]);
  const [st, setSt] = useState<QuizState | null>(null);
  const [input, setInput] = useState("");
  const [choice, setChoice] = useState<number | null>(null);

  useEffect(() => { setSt(load(quiz.date) ?? fresh(quiz, earlier)); }, [quiz, earlier]);
  useEffect(() => { if (st) save(quiz.date, st); }, [st, quiz.date]);

  if (!st) return <div className="card mt-6 p-6 text-sm text-[var(--muted)]">Loading…</div>;

  const total = quiz.questions.length + st.reviewSlots.length;
  const solved = st.solvedSlots.length;
  const step = st.steps[st.pos];
  const item = step ? findItem(all, step.slot, step.itemId) : null;
  const q = step ? questionOf(all, step.slot) : null;

  function submit() {
    if (!st || !item || !step || st.revealed) return;
    const given = item.type === "mc" ? String(choice ?? "") : input;
    if (item.type === "mc" ? choice === null : !input.trim()) return;
    const ok = grade(item, given);
    const next: QuizState = { ...st, revealed: true, lastCorrect: ok, lastGiven: given, attempts: [...st.attempts, { slot: step.slot, itemId: item.id, correct: ok, given }] };
    if (ok) {
      if (!next.solvedSlots.includes(step.slot)) next.solvedSlots = [...next.solvedSlots, step.slot];
    } else {
      if (!next.missedSlots.includes(step.slot)) next.missedSlots = [...next.missedSlots, step.slot];
      const used = new Set(st.steps.filter((s) => s.slot === step.slot).map((s) => s.itemId));
      const qq = questionOf(all, step.slot)!;
      const variant = qq.variants.find((v) => !used.has(v.id));
      next.steps = [...st.steps, { slot: step.slot, itemId: (variant ?? qq).id, review: step.review, retry: true }];
    }
    setSt(next);
  }

  function advance() {
    if (!st) return;
    const pos = st.pos + 1;
    setSt({ ...st, pos, revealed: false, lastCorrect: null, lastGiven: "", finishedAt: pos >= st.steps.length ? new Date().toISOString() : null });
    setInput(""); setChoice(null);
  }

  function restart() {
    if (!confirm("Start this quiz over? Your progress for this day will be reset.")) return;
    setSt(fresh(quiz, earlier)); setInput(""); setChoice(null);
  }

  const header = (
    <div className="mt-4 mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">Spanish Quiz · {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${quiz.date}T12:00:00Z`))}</h1>
      {quiz.title ? <p className="mt-1 text-sm text-[var(--muted)]">{quiz.title}</p> : null}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-label="progress">
        <div className="h-full bg-[var(--good)] transition-all" style={{ width: `${(solved / total) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]" data-testid="progress">{solved}/{total} solved{st.missedSlots.length ? ` · ${st.missedSlots.length} missed (redo required)` : ""}</p>
    </div>
  );

  if (st.finishedAt || !step || !item) {
    const firstTry = st.attempts.filter((a, i) => st.attempts.findIndex((b) => b.slot === a.slot) === i && a.correct).length;
    return (
      <div>
        {header}
        <div className="card p-6" data-testid="finished">
          <p className="text-xl font-semibold text-[var(--good)]">✓ Quiz complete</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{firstTry}/{total} right on the first try · {st.attempts.length} answers total.</p>
          {st.missedSlots.length ? (
            <div className="mt-4 text-sm">
              <p className="text-white/80">Missed today (they come back in tomorrow&apos;s quiz):</p>
              <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
                {st.missedSlots.map((s) => <li key={s}>{questionOf(all, s)?.trap ?? s}</li>)}
              </ul>
            </div>
          ) : null}
          <button onClick={restart} className="mt-5 rounded-xl border border-white/15 px-4 py-2 text-sm text-[var(--muted)] hover:text-white">Start over</button>
        </div>
      </div>
    );
  }

  const why = st.revealed && !st.lastCorrect ? wrongWhy(item, st.lastGiven) : null;
  return (
    <div>
      {header}
      <div className="card p-5 sm:p-6" data-testid="question">
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[var(--muted)]">{TYPE_LABEL[item.type]}</span>
          {q?.trap ? <span className="rounded-full bg-[var(--es)]/15 px-2 py-0.5 text-[var(--es)]">{q.trap}</span> : null}
          {step.review ? <span className="rounded-full bg-[var(--accent-2)]/15 px-2 py-0.5 text-[var(--accent-2)]">Review from {step.slot.slice(5, 10)}</span> : null}
          {step.retry ? <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-red-300">Redo</span> : null}
        </div>
        <p className="text-lg leading-snug text-white" lang="es">{item.prompt}</p>
        {item.hint ? <p className="mt-1 text-xs text-[var(--muted)]">{item.hint}</p> : null}

        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); if (st.revealed) advance(); else submit(); }}>
          {item.type === "mc" ? (
            <div className="space-y-2">
              {item.options!.map((o, i) => {
                const picked = choice === i;
                const isRight = st.revealed && i === item.answer;
                const isWrongPick = st.revealed && picked && !isRight;
                return (
                  <button type="button" key={i} disabled={st.revealed} onClick={() => setChoice(i)} data-option={i}
                    className={`block w-full rounded-xl border px-4 py-3 text-left text-base transition ${isRight ? "border-[var(--good)] bg-[var(--good)]/10" : isWrongPick ? "border-red-400 bg-red-400/10" : picked ? "border-[var(--accent)] bg-white/10" : "border-white/10 bg-white/[0.03] hover:bg-white/5"}`} lang="es">
                    {o.text}
                  </button>
                );
              })}
            </div>
          ) : (
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={st.revealed} lang="es"
              autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go"
              placeholder={item.type === "translate" ? "Type the Spanish…" : "Your answer (accents optional)"}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-[var(--accent)]" />
          )}

          {st.revealed ? (
            <div className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed ${st.lastCorrect ? "border-[var(--good)]/40 bg-[var(--good)]/10" : "border-red-400/40 bg-red-400/10"}`} data-testid="feedback">
              <p className="font-semibold">{st.lastCorrect ? "✓ Correct" : "✗ Not quite"}</p>
              {!st.lastCorrect && item.type !== "mc" ? <p className="mt-1">Answer: <b lang="es">{item.answers![0]}</b></p> : null}
              {why ? <p className="mt-1">{why}</p> : null}
              <p className="mt-1 text-white/85">{item.explanation}</p>
              {!st.lastCorrect ? <p className="mt-2 text-xs text-red-200">You&apos;ll redo this one before the quiz counts as finished.</p> : null}
            </div>
          ) : null}

          <button type="submit" className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-[#0b1020] disabled:opacity-40"
            disabled={!st.revealed && (item.type === "mc" ? choice === null : !input.trim())}>
            {st.revealed ? (st.pos + 1 >= st.steps.length ? "Finish" : st.lastCorrect ? "Next" : "Continue") : "Check"}
          </button>
        </form>
      </div>
      <button onClick={restart} className="mt-4 text-xs text-[var(--muted)] underline">Start over</button>
    </div>
  );
}
