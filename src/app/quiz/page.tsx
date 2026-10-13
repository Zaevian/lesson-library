import Link from "next/link";
import { getQuizzes } from "@/lib/quiz";
import { QuizList } from "@/components/QuizList";

export const revalidate = 60;
export const metadata = { title: "Spanish Quiz | Opposites Library" };

export default async function QuizIndex() {
  const { bundle, error } = await getQuizzes();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:pt-12">
      <header className="mb-6">
        <Link href="/" className="text-xs text-[var(--muted)] hover:text-white">← Lessons</Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--es)]">Zae · Daily recall</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Spanish Quiz</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          Five tricky questions a day on the core 100 function words. Miss one and you redo it until it sticks.
        </p>
      </header>
      {error || !bundle ? <div className="card p-6 text-sm text-[var(--muted)]">{error}</div> : <QuizList quizzes={bundle.quizzes} />}
    </main>
  );
}
