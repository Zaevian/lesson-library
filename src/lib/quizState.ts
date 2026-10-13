"use client";
import type { QItem, Quiz } from "./quiz";

export interface Step { slot: string; item: QItem; review?: boolean; retry?: boolean }
export interface Attempt { slot: string; itemId: string; correct: boolean; given: string }
export interface QuizState {
  steps: { slot: string; itemId: string; review?: boolean; retry?: boolean }[];
  pos: number;
  revealed: boolean;
  lastCorrect: boolean | null;
  lastGiven: string;
  attempts: Attempt[];
  missedSlots: string[];
  solvedSlots: string[];
  finishedAt: string | null;
  reviewSlots: string[];
}

export const key = (date: string) => `quiz:v1:${date}`;
export function load(date: string): QuizState | null {
  try { const s = localStorage.getItem(key(date)); return s ? (JSON.parse(s) as QuizState) : null; } catch { return null; }
}
export function save(date: string, s: QuizState) {
  try { localStorage.setItem(key(date), JSON.stringify(s)); } catch {}
}

/** Slot id "date#qid" → question & items. */
export function findItem(quizzes: Quiz[], slot: string, itemId: string): QItem | null {
  const [date, qid] = slot.split("#");
  const q = quizzes.find((z) => z.date === date)?.questions.find((x) => x.id === qid);
  if (!q) return null;
  if (q.id === itemId) return q;
  return q.variants.find((v) => v.id === itemId) ?? null;
}

/** Slots missed in earlier quizzes and not yet cleared by a later review. */
export function outstandingMisses(earlier: Quiz[]): string[] {
  const missed = new Set<string>();
  const ordered = [...earlier].sort((a, b) => a.date.localeCompare(b.date));
  for (const z of ordered) {
    const st = load(z.date);
    if (!st) continue;
    for (const r of st.reviewSlots ?? []) {
      const firstTry = st.attempts.find((a) => a.slot === r);
      if (firstTry?.correct) missed.delete(r);
    }
    for (const m of st.missedSlots) if (m.startsWith(z.date + "#")) missed.add(m);
  }
  return [...missed];
}
