import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { StudentSubjectsService } from './student-subjects.service';

describe('StudentSubjectsService', () => {
  let service: StudentSubjectsService;
  let prisma: {
    student: { findMany: jest.Mock; findFirst: jest.Mock };
    enrollment: { findMany: jest.Mock; findFirst: jest.Mock };
    academicClass: { findFirst: jest.Mock };
    subject: { findFirst: jest.Mock };
    academicYear: { findFirst: jest.Mock };
    stream: { findFirst: jest.Mock };
    subjectOffering: { findFirst: jest.Mock };
    subjectAllocation: { findFirst: jest.Mock };
    studentSubjectEnrollment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';
  const studentA = 'student-a';
  const studentB = 'student-b';
  const enrollmentA = 'enrollment-a';
  const yearA = 'year-a';
  const classA = 'class-a';
  const levelA = 'level-a';
  const subjectA = 'subject-a';
  const offeringA = 'offering-a';
  const streamA = 'stream-a';

  const subjectEnrollmentA = {
    id: 'subject-enrollment-a',
    isActive: true,
    enrollmentId: enrollmentA,
    subjectId: subjectA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const enrollmentContext = {
    id: enrollmentA,
    studentId: studentA,
    academicYearId: yearA,
    academicClassId: classA,
    streamId: null,
  };

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  beforeEach(async () => {
    prisma = {
      student: { findMany: jest.fn(), findFirst: jest.fn() },
      enrollment: { findMany: jest.fn(), findFirst: jest.fn() },
      academicClass: { findFirst: jest.fn() },
      subject: { findFirst: jest.fn() },
      academicYear: { findFirst: jest.fn() },
      stream: { findFirst: jest.fn() },
      subjectOffering: { findFirst: jest.fn() },
      subjectAllocation: { findFirst: jest.fn() },
      studentSubjectEnrollment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentSubjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StudentSubjectsService);
  });

  function mockEnrollment() {
    prisma.enrollment.findFirst.mockResolvedValue(enrollmentContext);
    prisma.student.findFirst.mockResolvedValue({ id: studentA });
  }

  function mockContext() {
    mockEnrollment();
    prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
    prisma.academicClass.findFirst.mockResolvedValue({
      id: classA,
      academicLevelId: levelA,
    });
    prisma.subjectOffering.findFirst.mockResolvedValue({ id: offeringA });
    prisma.subjectAllocation.findFirst.mockResolvedValue({ id: 'alloc-a' });
    prisma.studentSubjectEnrollment.findFirst.mockResolvedValue(null);
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.create(null, enrollmentA, { subjectId: subjectA }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.studentSubjectEnrollment.create).not.toHaveBeenCalled();
    });

    it('reports an enrollment of another school as not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, enrollmentA, { subjectId: subjectA }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.studentSubjectEnrollment.create).not.toHaveBeenCalled();
    });

    it('reports a subject of another school as not found', async () => {
      mockEnrollment();
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, enrollmentA, { subjectId: subjectA }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.studentSubjectEnrollment.create).not.toHaveBeenCalled();
    });

    it('requires the subject to be offered for the enrollment context', async () => {
      mockEnrollment();
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectOffering.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, enrollmentA, { subjectId: subjectA }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.studentSubjectEnrollment.create).not.toHaveBeenCalled();
    });

    it('requires the subject to be allocated to the class/stream', async () => {
      mockEnrollment();
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectOffering.findFirst.mockResolvedValue({ id: offeringA });
      prisma.subjectAllocation.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, enrollmentA, { subjectId: subjectA }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.studentSubjectEnrollment.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate subject enrollment', async () => {
      mockContext();
      prisma.studentSubjectEnrollment.findFirst.mockResolvedValue({
        id: 'subject-enrollment-existing',
      });

      await expect(
        service.create(schoolA, enrollmentA, { subjectId: subjectA }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.studentSubjectEnrollment.create).not.toHaveBeenCalled();
    });

    it('creates a subject enrollment for the enrollment', async () => {
      mockContext();
      prisma.studentSubjectEnrollment.create.mockResolvedValue(
        subjectEnrollmentA,
      );

      const result = await service.create(schoolA, enrollmentA, {
        subjectId: subjectA,
      });

      expect(prisma.studentSubjectEnrollment.create).toHaveBeenCalledWith({
        data: {
          enrollmentId: enrollmentA,
          subjectId: subjectA,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.subjectId).toBe(subjectA);
    });

    it('maps a P2002 race to a conflict', async () => {
      mockContext();
      prisma.studentSubjectEnrollment.create.mockRejectedValue(
        prismaError('P2002'),
      );

      await expect(
        service.create(schoolA, enrollmentA, { subjectId: subjectA }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('listByEnrollment', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.listByEnrollment(null, enrollmentA)).rejects
        .toBeInstanceOf(ForbiddenException);
    });

    it('reports an enrollment of another school as not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.listByEnrollment(schoolA, enrollmentA),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists the subjects of an enrollment of the active school', async () => {
      mockEnrollment();
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([
        subjectEnrollmentA,
      ]);

      const result = await service.listByEnrollment(schoolA, enrollmentA);

      expect(prisma.studentSubjectEnrollment.findMany).toHaveBeenCalledWith({
        where: { enrollmentId: enrollmentA },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, enrollmentA, 'subject-enrollment-a', {
          isActive: false,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a subject enrollment of another school as not found', async () => {
      mockEnrollment();
      prisma.studentSubjectEnrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, enrollmentA, 'subject-enrollment-b', {
          isActive: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.studentSubjectEnrollment.update).not.toHaveBeenCalled();
    });

    it('deactivates a subject enrollment of the active school', async () => {
      mockEnrollment();
      prisma.studentSubjectEnrollment.findFirst.mockResolvedValue({
        id: subjectEnrollmentA.id,
      });
      prisma.studentSubjectEnrollment.update.mockResolvedValue({
        ...subjectEnrollmentA,
        isActive: false,
      });

      const result = await service.update(schoolA, enrollmentA, subjectEnrollmentA.id, {
        isActive: false,
      });

      expect(prisma.studentSubjectEnrollment.update).toHaveBeenCalledWith({
        where: { id: subjectEnrollmentA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('maps a P2025 race to not found', async () => {
      mockEnrollment();
      prisma.studentSubjectEnrollment.findFirst.mockResolvedValue({
        id: subjectEnrollmentA.id,
      });
      prisma.studentSubjectEnrollment.update.mockRejectedValue(
        prismaError('P2025'),
      );

      await expect(
        service.update(schoolA, enrollmentA, subjectEnrollmentA.id, {
          isActive: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('scopes the list to the active school enrollments', async () => {
      prisma.student.findMany.mockResolvedValue([{ id: studentA }]);
      prisma.enrollment.findMany.mockResolvedValue([{ id: enrollmentA }]);
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([
        subjectEnrollmentA,
      ]);

      const result = await service.list(schoolA, {});

      expect(prisma.studentSubjectEnrollment.findMany).toHaveBeenCalledWith({
        where: { enrollmentId: { in: [enrollmentA] } },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('filters by a school-scoped subject', async () => {
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
      prisma.student.findMany.mockResolvedValue([{ id: studentA }]);
      prisma.enrollment.findMany.mockResolvedValue([{ id: enrollmentA }]);
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([]);

      await service.list(schoolA, { subjectId: subjectA });

      expect(prisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: subjectA, schoolId: schoolA },
        select: { id: true },
      });
      expect(prisma.studentSubjectEnrollment.findMany).toHaveBeenCalledWith({
        where: { subjectId: subjectA, enrollmentId: { in: [enrollmentA] } },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('uses a provided enrollment id directly', async () => {
      mockEnrollment();
      prisma.studentSubjectEnrollment.findMany.mockResolvedValue([]);

      await service.list(schoolA, { enrollmentId: enrollmentA });

      expect(prisma.enrollment.findFirst).toHaveBeenCalled();
      expect(prisma.student.findMany).not.toHaveBeenCalled();
      expect(prisma.studentSubjectEnrollment.findMany).toHaveBeenCalledWith({
        where: { enrollmentId: enrollmentA },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('reports a filter stream of another school as not found', async () => {
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.list(schoolA, { streamId: 'stream-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
