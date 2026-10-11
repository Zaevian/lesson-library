export type Language = "spanish" | "russian";

export interface PairSide { word: string; spoken: string; sentence: string }
export interface Pair { n: number; left: PairSide; right: PairSide; tip: string | null; fromLesson?: string }

export interface Lesson {
  id: string;
  language: Language;
  languageLabel: string;
  slug: string;
  number: number;
  isSample: boolean;
  title: string;
  date: string;
  dateSource: string;
  dateEstimated: boolean;
  slot: string | null;
  slotLabel: string | null;
  slotOrder: number;
  theme: string | null;
  themeLabel: string | null;
  themeEnglish: string | null;
  introTitle: string | null;
  question: string | null;
  voice: string | null;
  durationSeconds: number | null;
  sizeBytes: number;
  videoUrl: string;
  pairs: Pair[];
  reviewPairs: Pair[];
}

export interface Manifest {
  version: number;
  updatedAt: string;
  counts: { total: number; spanish: number; russian: number };
  lessons: Lesson[];
}
