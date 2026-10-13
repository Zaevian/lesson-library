import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuizzes } from "@/lib/quiz";
import { QuizPlayer } from "@/components/QuizPlayer";

export const revalidate = 60;

export default async function QuizDay({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const { bundle } = await getQuizzes();
  const quiz = bundle?.quizzes.find((q) => q.date === date);
  if (!quiz) notFound();
  const earlier = bundle!.quizzes.filter((q) => q.date < date);
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 sm:pt-10">
      <Link href="/quiz" className="text-xs text-[var(--muted)] hover:text-white">← All quizzes</Link>
      <QuizPlayer quiz={quiz} earlier={earlier} />
    </main>
  );
}
