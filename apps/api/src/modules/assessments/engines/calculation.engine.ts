/**
 * Pure deterministic calculation of a learner's final score for an
 * assessment.
 *
 * Rules:
 * - A learner is assessed on a component only when they have a valid score
 *   (absent, exempt, pending, withheld and not-assessed learners have no
 *   score and are excluded from the calculation).
 * - When no component declares an explicit weight, all components count
 *   equally (1/n each).
 * - Otherwise each component contributes `normalizedScore x weight`.
 * - The weighted total is scaled to the weight actually assessed, so a
 *   learner missing part of a scheme is never penalized for the missing part
 *   (absent is not zero).
 * - The final score is rounded to two decimal places, half-up. Normalized
 *   ratios are rounded to four decimal places before weighting.
 */

export interface CalculationComponent {
  id: string;
  weight: number | null;
  maxScore: number;
}

export interface LearnerCalculationInput {
  enrollmentId: string;
  /** Effective score per component id (already resolved, incl. source results). */
  scored: Map<string, number>;
  components: CalculationComponent[];
}

export interface LearnerCalculationOutput {
  enrollmentId: string;
  /** 0..100 rounded to 2dp, or null when the learner was not assessed on any component. */
  finalScore: number | null;
  /** Sum of the weights that actually contributed (percentage, 4dp). */
  weightedBy: number;
}

export function roundHundredths(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundTenThousandths(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function calculateLearnerScore(
  input: LearnerCalculationInput,
): LearnerCalculationOutput {
  const considered = input.components.filter((component) =>
    input.scored.has(component.id),
  );

  if (considered.length === 0) {
    return { enrollmentId: input.enrollmentId, finalScore: null, weightedBy: 0 };
  }

  const equalSplit = input.components.every(
    (component) => component.weight === null,
  );

  const weightOf = new Map<string, number>();
  if (equalSplit) {
    const share = 1 / input.components.length;
    for (const component of input.components) {
      weightOf.set(component.id, share);
    }
  } else {
    for (const component of input.components) {
      weightOf.set(component.id, component.weight ?? 0);
    }
  }

  let sumWeighted = 0;
  let sumWeights = 0;

  for (const component of considered) {
    const score = input.scored.get(component.id) ?? 0;
    const normalized =
      component.maxScore > 0
        ? roundTenThousandths(score / component.maxScore)
        : 0;
    const weight = weightOf.get(component.id) ?? 0;
    sumWeighted += normalized * weight;
    sumWeights += weight;
  }

  const finalScore =
    sumWeights > 0
      ? roundHundredths((sumWeighted / sumWeights) * 100)
      : null;

  return {
    enrollmentId: input.enrollmentId,
    finalScore,
    weightedBy: roundTenThousandths(sumWeights),
  };
}