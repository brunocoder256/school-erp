import { calculateLearnerScore } from './calculation.engine';

describe('calculation.engine', () => {
  describe('calculateLearnerScore', () => {
    it('averages components equally when no component declares a weight', () => {
      const result = calculateLearnerScore({
        enrollmentId: 'e1',
        components: [
          { id: 'c1', weight: null, maxScore: 100 },
          { id: 'c2', weight: null, maxScore: 100 },
          { id: 'c3', weight: null, maxScore: 100 },
        ],
        scored: new Map([
          ['c1', 50],
          ['c2', 60],
          ['c3', 70],
        ]),
      });

      expect(result.finalScore).toBe(60);
      expect(result.weightedBy).toBe(1);
    });

    it('uses explicit weights and scales to the assessed weight', () => {
      const result = calculateLearnerScore({
        enrollmentId: 'e1',
        components: [
          { id: 'ca', weight: 40, maxScore: 40 },
          { id: 'exam', weight: 60, maxScore: 100 },
        ],
        scored: new Map([
          ['ca', 32],
          ['exam', 78.8],
        ]),
      });

      // (32/40)*40 + (78.8/100)*60 = 32 + 47.28 = 79.28
      expect(result.finalScore).toBe(79.28);
      expect(result.weightedBy).toBe(100);
    });

    it('scales up when the learner was only assessed on part of the scheme', () => {
      const result = calculateLearnerScore({
        enrollmentId: 'e1',
        components: [
          { id: 'c1', weight: 30, maxScore: 100 },
          { id: 'c2', weight: 20, maxScore: 100 },
          { id: 'c3', weight: 50, maxScore: 100 },
        ],
        scored: new Map([
          ['c1', 80],
          ['c2', 50],
        ]),
      });

      // (0.8*30 + 0.5*20) / 50 * 100 = 34 / 50 * 100 = 68
      expect(result.finalScore).toBe(68);
      expect(result.weightedBy).toBe(50);
    });

    it('returns null when the learner was assessed on nothing', () => {
      const result = calculateLearnerScore({
        enrollmentId: 'e1',
        components: [{ id: 'c1', weight: 100, maxScore: 100 }],
        scored: new Map(),
      });

      expect(result.finalScore).toBeNull();
      expect(result.weightedBy).toBe(0);
    });

    it('rounds the final score to two decimal places half-up', () => {
      const result = calculateLearnerScore({
        enrollmentId: 'e1',
        components: [{ id: 'c1', weight: 100, maxScore: 3 }],
        scored: new Map([['c1', 1]]),
      });

      // 1/3 = 0.3333... -> 33.33
      expect(result.finalScore).toBe(33.33);
    });

    it('guards against a zero maximum score', () => {
      const result = calculateLearnerScore({
        enrollmentId: 'e1',
        components: [{ id: 'c1', weight: 100, maxScore: 0 }],
        scored: new Map([['c1', 5]]),
      });

      expect(result.finalScore).toBe(0);
    });

    it('excludes unassessed components from the weighting', () => {
      const result = calculateLearnerScore({
        enrollmentId: 'e1',
        components: [
          { id: 'c1', weight: 60, maxScore: 100 },
          { id: 'c2', weight: 40, maxScore: 100 },
        ],
        scored: new Map([['c1', 100]]),
      });

      // 1.0 * 60 / 60 * 100 = 100
      expect(result.finalScore).toBe(100);
      expect(result.weightedBy).toBe(60);
    });
  });
});