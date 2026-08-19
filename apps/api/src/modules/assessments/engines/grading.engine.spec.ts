import { gradeScore, validateBands } from './grading.engine';

describe('grading.engine', () => {
  const bands = [
    { minScore: 80, maxScore: 100, grade: 'A', descriptor: 'Excellent', achievementLevel: 'Outstanding' },
    { minScore: 70, maxScore: 79.99, grade: 'B', descriptor: 'Very Good', achievementLevel: 'Above expectation' },
    { minScore: 60, maxScore: 69.99, grade: 'C', descriptor: 'Good', achievementLevel: null },
    { minScore: 0, maxScore: 49.99, grade: 'F', descriptor: 'Failing', achievementLevel: null },
  ];

  describe('gradeScore', () => {
    it('grades a score inside a band', () => {
      expect(gradeScore(78.8, bands)).toEqual({
        grade: 'B',
        descriptor: 'Very Good',
        achievementLevel: 'Above expectation',
      });
    });

    it('is inclusive on both the minimum and maximum', () => {
      expect(gradeScore(80, bands).grade).toBe('A');
      expect(gradeScore(79.99, bands).grade).toBe('B');
      expect(gradeScore(70, bands).grade).toBe('B');
      expect(gradeScore(0, bands).grade).toBe('F');
    });

    it('returns no grade for a score in a gap', () => {
      // 49.99 < 60 gap
      expect(gradeScore(55, bands)).toEqual({
        grade: null,
        descriptor: null,
        achievementLevel: null,
      });
    });

    it('returns no grade for a score above the top band', () => {
      expect(gradeScore(101, bands).grade).toBeNull();
    });

    it('returns no grade for a null final score', () => {
      expect(gradeScore(null, bands)).toEqual({
        grade: null,
        descriptor: null,
        achievementLevel: null,
      });
    });
  });

  describe('validateBands', () => {
    it('accepts a valid, gap-tolerant set of bands', () => {
      expect(() => validateBands(bands)).not.toThrow();
    });

    it('rejects overlapping bands', () => {
      expect(() =>
        validateBands([
          { minScore: 50, maxScore: 80, grade: 'B', descriptor: null, achievementLevel: null },
          { minScore: 79, maxScore: 100, grade: 'A', descriptor: null, achievementLevel: null },
        ]),
      ).toThrow('overlap');
    });

    it('rejects an inverted band', () => {
      expect(() =>
        validateBands([
          { minScore: 100, maxScore: 50, grade: 'B', descriptor: null, achievementLevel: null },
        ]),
      ).toThrow('above its maximum');
    });

    it('rejects duplicate grades', () => {
      expect(() =>
        validateBands([
          { minScore: 0, maxScore: 50, grade: 'A', descriptor: null, achievementLevel: null },
          { minScore: 51, maxScore: 100, grade: 'A', descriptor: null, achievementLevel: null },
        ]),
      ).toThrow('Duplicate');
    });

    it('allows intentional gaps between bands', () => {
      expect(() =>
        validateBands([
          { minScore: 0, maxScore: 39.99, grade: 'F', descriptor: null, achievementLevel: null },
          { minScore: 80, maxScore: 100, grade: 'A', descriptor: null, achievementLevel: null },
        ]),
      ).not.toThrow();
    });
  });
});