import { RankingTieHandling } from '../../../../generated/prisma/enums';
import { rankEntries } from './ranking.engine';

describe('ranking.engine', () => {
  describe('rankEntries', () => {
    it('ranks with competition tie handling (1, 2, 2, 4)', () => {
      const result = rankEntries(
        [
          { key: 'e1', metric: 95 },
          { key: 'e2', metric: 90 },
          { key: 'e3', metric: 90 },
          { key: 'e4', metric: 85 },
        ],
        RankingTieHandling.COMPETITION,
      );

      expect(result.map((entry) => [entry.key, entry.rank])).toEqual([
        ['e1', 1],
        ['e2', 2],
        ['e3', 2],
        ['e4', 4],
      ]);
      expect(result.map((entry) => entry.tie)).toEqual([false, false, true, false]);
    });

    it('ranks with dense tie handling (1, 2, 2, 3)', () => {
      const result = rankEntries(
        [
          { key: 'e1', metric: 95 },
          { key: 'e2', metric: 90 },
          { key: 'e3', metric: 90 },
          { key: 'e4', metric: 85 },
        ],
        RankingTieHandling.DENSE,
      );

      expect(result.map((entry) => [entry.key, entry.rank])).toEqual([
        ['e1', 1],
        ['e2', 2],
        ['e3', 2],
        ['e4', 3],
      ]);
    });

    it('drops entries without a metric', () => {
      const result = rankEntries(
        [
          { key: 'e1', metric: null },
          { key: 'e2', metric: 70 },
        ],
        RankingTieHandling.COMPETITION,
      );

      expect(result).toEqual([{ key: 'e2', metric: 70, rank: 1, tie: false }]);
    });

    it('breaks metric ties deterministically by key ascending', () => {
      const result = rankEntries(
        [
          { key: 'z', metric: 50 },
          { key: 'a', metric: 50 },
        ],
        RankingTieHandling.DENSE,
      );

      expect(result.map((entry) => entry.key)).toEqual(['a', 'z']);
      expect(result.map((entry) => entry.rank)).toEqual([1, 1]);
    });

    it('handles a single entry', () => {
      const result = rankEntries(
        [{ key: 'e1', metric: 66.5 }],
        RankingTieHandling.COMPETITION,
      );

      expect(result).toEqual([{ key: 'e1', metric: 66.5, rank: 1, tie: false }]);
    });

    it('returns an empty list for no entries', () => {
      expect(rankEntries([], RankingTieHandling.COMPETITION)).toEqual([]);
    });
  });
});