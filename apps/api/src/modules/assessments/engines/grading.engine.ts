/**
 * Deterministic grading of a final score against a grading scheme version's
 * bands.
 *
 * Bands are inclusive on both ends ([min, max]). Scores that fall into a gap
 * between bands produce no grade (the gap is intentional and preserved).
 * Bands are validated up front: overlaps, inverted ranges and duplicate
 * grades are rejected.
 */

export interface GradingBand {
  minScore: number;
  maxScore: number;
  grade: string;
  descriptor: string | null;
  achievementLevel: string | null;
}

export interface GradeOutcome {
  grade: string | null;
  descriptor: string | null;
  achievementLevel: string | null;
}

export function gradeScore(
  finalScore: number | null,
  bands: GradingBand[],
): GradeOutcome {
  if (finalScore === null) {
    return { grade: null, descriptor: null, achievementLevel: null };
  }

  const band = bands.find(
    (candidate) =>
      finalScore >= candidate.minScore && finalScore <= candidate.maxScore,
  );

  if (!band) {
    return { grade: null, descriptor: null, achievementLevel: null };
  }

  return {
    grade: band.grade,
    descriptor: band.descriptor,
    achievementLevel: band.achievementLevel,
  };
}

export function validateBands(bands: GradingBand[]): void {
  const seen = new Set<string>();

  for (const band of bands) {
    if (band.minScore > band.maxScore) {
      throw new Error(
        `Grading band "${band.grade}" has a minimum score above its maximum.`,
      );
    }

    if (seen.has(band.grade)) {
      throw new Error(`Duplicate grading band grade "${band.grade}".`);
    }

    seen.add(band.grade);
  }

  const sorted = [...bands].sort((a, b) => a.minScore - b.minScore);

  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index].minScore <= sorted[index - 1].maxScore) {
      throw new Error('Grading bands must not overlap.');
    }
  }
}