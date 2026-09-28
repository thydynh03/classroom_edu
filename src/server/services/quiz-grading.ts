/** Chấm quiz (hàm thuần, không phụ thuộc DB — dễ unit test). */

export type GradableQuestion = {
  id: string;
  type: "SINGLE" | "MULTI" | "TRUE_FALSE";
  points: number;
  options: { id: string; isCorrect: boolean }[];
};

export type QuizAnswerMap = Record<string, string[]>;

/**
 * - SINGLE / TRUE_FALSE: đúng đáp án → đủ điểm.
 * - MULTI: phải chọn đúng toàn bộ đáp án đúng và không chọn đáp án sai (all-or-nothing).
 * Lựa chọn không thuộc câu hỏi bị bỏ qua (không tin dữ liệu client).
 */
export function gradeQuiz(questions: GradableQuestion[], answers: QuizAnswerMap) {
  let score = 0;
  let maxScore = 0;
  const perQuestion: Record<string, { correct: boolean; earned: number }> = {};
  for (const q of questions) {
    maxScore += q.points;
    const valid = new Set(q.options.map((o) => o.id));
    const chosen = new Set((answers[q.id] ?? []).filter((id) => valid.has(id)));
    const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
    const isSingle = q.type !== "MULTI";
    const ok =
      chosen.size > 0 &&
      (isSingle
        ? chosen.size === 1 && correct.has([...chosen][0])
        : chosen.size === correct.size && [...chosen].every((id) => correct.has(id)));
    const earned = ok ? q.points : 0;
    score += earned;
    perQuestion[q.id] = { correct: ok, earned };
  }
  return { score: Math.round(score * 100) / 100, maxScore, perQuestion };
}

/** Quy đổi điểm quiz về thang điểm của bài. */
export function scaleScore(score: number, maxScore: number, maxPoints: number) {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * maxPoints * 100) / 100;
}
