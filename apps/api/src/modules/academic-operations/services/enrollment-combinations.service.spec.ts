import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { EnrollmentCombinationsService } from './enrollment-combinations.service';

describe('EnrollmentCombinationsService', () => {
  let service: EnrollmentCombinationsService;
  let prisma: {
    $transaction: jest.Mock;
    enrollment: { findFirst: jest.Mock; update: jest.Mock };
    student: { findFirst: jest.Mock };
    subjectCombination: { findFirst: jest.Mock };
    academicClass: { findFirst: jest.Mock };
    subjectCombinationSubject: { findMany: jest.Mock };
    subjectOffering: { findFirst: jest.Mock };
    subjectAllocation: { findFirst: jest.Mock };
    studentSubjectEnrollment: {
      findMany: jest.Mock;
      createMany: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';
  const studentA = 'student-a';
  const enrollmentA = 'enrollment-a';
  const yearA = 'year-a';
  const classA = 'class-a';
  const levelA = 'level-a';
  const combinationA = {
    id: 'combination-a',
    code: 'PCM',
    name: 'Physics, Chemistry and Mathematics',
    academicLevelId: levelA,
  };
  const subjectPhy = 'subject-phy';
  const subjectChem = 'subject-chem';

  const enrollmentContext = {
    id: enrollmentA,
    studentId: studentA,
    academicYearId: yearA,
    academicClassId: classA,
    streamId: null,
    subjectCombinationId: null,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(prisma),
      ),
      enrollment: { findFirst: jest.fn(), update: jest.fn() },
      student: { findFirst: jest.fn() },
      subjectCombination: { findFirst: jest.fn() },
      academicClass: { findFirst: jest.fn() },
      subjectCombinationSubject: { findMany: jest.fn() },
      subjectOffering: { findFirst: jest.fn() },
      subjectAllocation: { findFirst: jest.fn() },
      studentSubjectEnrollment: {
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentCombinationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EnrollmentCombinationsService);
  });

  function mockEnrollment() {
    prisma.enrollment.findFirst.mockResolvedValue(enrollmentContext);
    prisma.student.findFirst.mockResolvedValue({ id: studentA });
  }

  describe('setCombination', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.setCombination(null, enrollmentA, {
          subjectCombinationId: combinationA.id,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports an enrollment of another school as not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.setCombination(schoolA, enrollmentA, {
          subjectCombinationId: combinationA.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('reports a combination of another school as not found', async () => {
      mockEnrollment();
      prisma.subjectCombination.findFirst.mockResolvedValue(null);

      await expect(
        service.setCombination(schoolA, enrollmentA, {
          subjectCombinationId: 'combination-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a combination whose level does not match the enrollment class', async () => {
      mockEnrollment();
      prisma.subjectCombination.findFirst.mockResolvedValue({
        ...combinationA,
        academicLevelId: 'level-b',
      });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });

      await expect(
        service.setCombination(schoolA, enrollmentA, {
          subjectCombinationId: combinationA.id,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.enrollment.update).not.toHaveBeenCalled();
    });

    it('sets the combination and enrolls its subjects', async () => {
      mockEnrollment();
      prisma.subjectCombination.findFirst.mockResolvedValue(combinationA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([
        { subjectId: subjectPhy },
        { subjectId: subjectChem },
      ]);
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([]);
      prisma.subjectOffering.findFirst.mockResolvedValue({ id: 'offering' });
      prisma.subjectAllocation.findFirst.mockResolvedValue({ id: 'alloc' });
      prisma.studentSubjectEnrollment.createMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.setCombination(schoolA, enrollmentA, {
        subjectCombinationId: combinationA.id,
      });

      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: enrollmentA },
        data: { subjectCombinationId: combinationA.id },
      });
      expect(prisma.studentSubjectEnrollment.createMany).toHaveBeenCalledWith({
        data: [
          { enrollmentId: enrollmentA, subjectId: subjectPhy, isActive: true },
          { enrollmentId: enrollmentA, subjectId: subjectChem, isActive: true },
        ],
      });
      expect(result.subjectCombinationId).toBe(combinationA.id);
      expect(result.enrolledSubjectIds).toEqual([subjectPhy, subjectChem]);
    });

    it('skips subjects already enrolled', async () => {
      mockEnrollment();
      prisma.subjectCombination.findFirst.mockResolvedValue(combinationA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([
        { subjectId: subjectPhy },
        { subjectId: subjectChem },
      ]);
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([
        { subjectId: subjectPhy },
      ]);
      prisma.subjectOffering.findFirst.mockResolvedValue({ id: 'offering' });
      prisma.subjectAllocation.findFirst.mockResolvedValue({ id: 'alloc' });

      const result = await service.setCombination(schoolA, enrollmentA, {
        subjectCombinationId: combinationA.id,
      });

      expect(prisma.studentSubjectEnrollment.createMany).toHaveBeenCalledWith({
        data: [
          { enrollmentId: enrollmentA, subjectId: subjectChem, isActive: true },
        ],
      });
      expect(result.enrolledSubjectIds).toEqual([subjectPhy, subjectChem]);
    });

    it('skips subjects not offered or allocated for the context', async () => {
      mockEnrollment();
      prisma.subjectCombination.findFirst.mockResolvedValue(combinationA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([
        { subjectId: subjectPhy },
        { subjectId: subjectChem },
      ]);
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([]);
      prisma.subjectOffering.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'offering' });
      prisma.subjectAllocation.findFirst.mockResolvedValue({ id: 'alloc' });

      const result = await service.setCombination(schoolA, enrollmentA, {
        subjectCombinationId: combinationA.id,
      });

      expect(prisma.studentSubjectEnrollment.createMany).toHaveBeenCalledWith({
        data: [
          { enrollmentId: enrollmentA, subjectId: subjectChem, isActive: true },
        ],
      });
      expect(result.enrolledSubjectIds).toEqual([subjectChem]);
    });

    it('only records the combination when subject enrollment is disabled', async () => {
      mockEnrollment();
      prisma.subjectCombination.findFirst.mockResolvedValue(combinationA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([
        { subjectId: subjectPhy },
      ]);
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([]);

      const result = await service.setCombination(schoolA, enrollmentA, {
        subjectCombinationId: combinationA.id,
        enrollSubjects: false,
      });

      expect(prisma.enrollment.update).toHaveBeenCalled();
      expect(prisma.studentSubjectEnrollment.createMany).not.toHaveBeenCalled();
      expect(result.enrolledSubjectIds).toEqual([]);
    });
  });

  describe('getCombination', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.getCombination(null, enrollmentA)).rejects
        .toBeInstanceOf(ForbiddenException);
    });

    it('reports an enrollment of another school as not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.getCombination(schoolA, enrollmentA),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns nulls when no combination is assigned', async () => {
      mockEnrollment();

      const result = await service.getCombination(schoolA, enrollmentA);

      expect(result).toEqual({
        enrollmentId: enrollmentA,
        subjectCombinationId: null,
        code: null,
        name: null,
        subjects: [],
        enrolledSubjectIds: [],
      });
    });

    it('returns the assigned combination with enrolled subjects', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        ...enrollmentContext,
        subjectCombinationId: combinationA.id,
      });
      prisma.student.findFirst.mockResolvedValue({ id: studentA });
      prisma.subjectCombination.findFirst.mockResolvedValue(combinationA);
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([
        { subjectId: subjectPhy },
        { subjectId: subjectChem },
      ]);
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([
        { subjectId: subjectPhy },
      ]);

      const result = await service.getCombination(schoolA, enrollmentA);

      expect(result.subjectCombinationId).toBe(combinationA.id);
      expect(result.subjects).toEqual([subjectPhy, subjectChem]);
      expect(result.enrolledSubjectIds).toEqual([subjectPhy]);
    });

    it('returns nulls when the assigned combination no longer exists', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        ...enrollmentContext,
        subjectCombinationId: 'combination-missing',
      });
      prisma.student.findFirst.mockResolvedValue({ id: studentA });
      prisma.subjectCombination.findFirst.mockResolvedValue(null);

      const result = await service.getCombination(schoolA, enrollmentA);

      expect(result.subjectCombinationId).toBeNull();
      expect(result.subjects).toEqual([]);
    });
  });
});
