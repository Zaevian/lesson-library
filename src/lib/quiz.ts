import { githubReleaseBase } from "./manifest";

export type QType = "mc" | "fill" | "translate";
export interface QOption { text: string; why?: string }
export interface QItem {
  id: string;
  type: QType;
  prompt: string;
  hint?: string;
  options?: QOption[];
  answer?: number;
  answers?: string[];
  wrong?: Record<string, string>;
  explanation: string;
}
export interface Question extends QItem { trap?: string; words?: string[]; variants: QItem[] }
export interface Quiz { date: string; title?: string; level?: string; questions: Question[] }
export interface QuizBundle { version: number; updatedAt: string; quizzes: Quiz[] }

export function quizzesUrl(): string {
  return process.env.QUIZ_URL || `${githubReleaseBase()}/quizzes.json`;
}

export async function getQuizzes(): Promise<{ bundle: QuizBundle | null; error: string | null }> {
  try {
    const res = await fetch(quizzesUrl(), { next: { revalidate: 60 } });
    if (!res.ok) return { bundle: null, error: res.status === 404 ? "No quizzes published yet." : `Could not load quizzes (HTTP ${res.status}).` };
    const bundle = (await res.json()) as QuizBundle;
    bundle.quizzes.sort((a, b) => b.date.localeCompare(a.date));
    return { bundle, error: null };
  } catch {
    return { bundle: null, error: "Could not load quizzes right now." };
  }
}

/** Lowercase, strip accents/punctuation, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:"'“”«»()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
