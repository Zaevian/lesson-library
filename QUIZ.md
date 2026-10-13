# Daily Spanish Quiz

Live: https://lesson-library-beta.vercel.app/quiz (each day at `/quiz/YYYY-MM-DD`).

## Daily publish (no deploy, no git push)
1. Write `/workspace/spanish-opposites/quizzes/YYYY-MM-DD.json` (copy `quizzes/quiz._template.json`).
2. `cd /workspace/lesson-library && npm run sync-quiz`
   (`npm run sync-quiz:dry` validates only; `npm run sync` does lessons + quizzes.)
3. The site picks it up within ~1–2 minutes (60 s revalidate).

The script validates every file, bundles all of them into `quizzes.json`, and uploads it to the
GitHub release `lessons` of Zaevian/lesson-library (next to `manifest.json`) with the box `gh` login.
If validation fails nothing is uploaded and the errors are printed.

## Schema
```
{ date: "YYYY-MM-DD"   // must equal the file name
  title?: string, level?: string,
  questions: [ exactly 5 × Question ] }

Question = Item + { trap?: string, words?: string[], variants: [1-2 × Item] }
Item = {
  id: string                 // unique within the file (q1, q1v1, ...)
  type: "mc" | "fill" | "translate"
  prompt: string, hint?: string
  explanation: string        // shown after every answer, right or wrong
  // mc:
  options: [{ text, why? }]  // why = explanation for that wrong option
  answer: number             // index into options
  // fill / translate:
  answers: string[]          // all accepted answers
  wrong?: { "<typed answer>": "why it's wrong" }
}
```
Fill/translate grading ignores accents, case, punctuation (¿?¡!.,;:) and extra spaces.

## Behaviour
- After every answer: right/wrong, the explanation, and the per-option / per-answer "why".
- A miss queues a redo at the end: the next unused variant, otherwise the original question.
  The quiz only counts as finished once every slot is answered correctly.
- Progress is saved in localStorage (`quiz:v1:<date>`); reloads resume where you left off.
- Questions missed in earlier quizzes (up to 3, most recent) appear at the start of the next
  quiz as "Review" items (using a variant). Answering a review right first try clears it.
- Keep private identifiers out of quiz files: the repo and release are public.
