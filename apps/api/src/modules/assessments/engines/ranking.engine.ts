import { RankingTieHandling } from '../../../../generated/prisma/enums';

/**
 * Deterministic ranking of learner metrics.
 *
 * Unranked entries (null metric) are dropped. Ordering is metric descending
 * and key ascending, so ties are resolved deterministically.
 *
 * Tie handling:
 * - COMPETITION (standard competition "1224"): tied learners share the rank
 *   of their first occurrence; the next rank skips the tied positions.
 * - DENSE ("1223"): tied learners share a rank and the next rank is the next
 *   integer.
 */

export interface RankingEntry {
  key: string;
  metric: number | null;
}

export interface RankedEntry {
  key: string;
  metric: number | null;
  rank: number | null;
  tie: boolean;
}

export function rankEntries(
  entries: RankingEntry[],
  tieHandling: RankingTieHandling,
): RankedEntry[] {
  const sorted = entries
    .filter((entry) => entry.metric !== null)
    .sort((a, b) => {
      const delta = (b.metric as number) - (a.metric as number);
      return delta !== 0
        ? delta
        : a.key < b.key
          ? -1
          : a.key > b.key
            ? 1
            : 0;
    });

  const output: RankedEntry[] = [];
  let rank = 0;
  let distinct = 0;
  let previous: number | null = null;

  for (let index = 0; index < sorted.length; index++) {
    const entry = sorted[index];
    const metric = entry.metric as number;
    const isNew = previous === null || metric !== previous;

    if (tieHandling === RankingTieHandling.DENSE) {
      if (isNew) {
        distinct += 1;
      }
      rank = distinct;
    } else {
      rank = isNew ? index + 1 : rank;
    }

    previous = metric;
    output.push({ key: entry.key, metric, rank, tie: !isNew });
  }

  return output;
}