export type MasteryAttemptResult =
  | 'INDEPENDENT_CORRECT'
  | 'HINTED_CORRECT'
  | 'UNDERSTOOD_AFTER_REVIEW'
  | 'WRONG'
  | 'UNABLE'
  | 'SKIPPED';

export function calculateMastery(results: MasteryAttemptResult[], threshold: number) {
  let correctStreak = 0;
  let wrongCount = 0;
  for (const result of results) {
    if (result === 'INDEPENDENT_CORRECT') correctStreak += 1;
    else if (result !== 'SKIPPED') correctStreak = 0;
    if (result === 'WRONG' || result === 'UNABLE') wrongCount += 1;
  }
  return { correctStreak, wrongCount, mastered: correctStreak >= threshold };
}
