import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TeachingGroupsService } from './teaching-groups.service';

describe('TeachingGroupsService', () => {
  let service: TeachingGroupsService;
  let prisma: {
    academicYear: { findFirst: jest.Mock };
    academicClass: { findFirst: jest.Mock };
    stream: { findFirst: jest.Mock };
    subject: { findFirst: jest.Mock };
    subjectOffering: { findFirst: jest.Mock };
    subjectAllocation: { findFirst: jest.Mock };
    teachingGroup: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    student: { findMany: jest.Mock };
    enrollment: { findMany: jest.Mock };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';
  const yearA = 'year-a';
  const classA = 'class-a';
  const levelA = 'level-a';
  const streamA = 'stream-a';
  const subjectA = 'subject-a';
  const offeringA = 'offering-a';
  const studentA = 'student-a';
  const studentB = 'student-b';
  const enrollmentA = 'enrollment-a';
  const enrollmentB = 'enrollment-b';

  const groupA = {
    id: 'group-a',
    name: 'S2A Mathematics',
    isActive: true,
    schoolId: schoolA,
    academicYearId: yearA,
    academicClassId: classA,
    streamId: null,
    subjectId: subjectA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    academicYearId: yearA,
    academicClassId: classA,
    subjectId: subjectA,
  };

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  beforeEach(async () => {
    prisma = {
      academicYear: { findFirst: jest.fn() },
      academicClass: { findFirst: jest.fn() },
      stream: { findFirst: jest.fn() },
      subject: { findFirst: jest.fn() },
      subjectOffering: { findFirst: jest.fn() },
      subjectAllocation: { findFirst: jest.fn() },
      teachingGroup: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      student: { findMany: jest.fn() },
      enrollment: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachingGroupsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TeachingGroupsService);
  });

  function mockContext(streamId?: string) {
    prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
    prisma.academicClass.findFirst.mockResolvedValue({
      id: classA,
      academicLevelId: levelA,
    });
    prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
    if (streamId) {
      prisma.stream.findFirst.mockResolvedValue({ id: streamId });
    }
    prisma.subjectOffering.findFirst.mockResolvedValue({ id: offeringA });
    prisma.subjectAllocation.findFirst.mockResolvedValue({ id: 'alloc-a' });
    prisma.teachingGroup.findFirst.mockResolvedValue(null);
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.create(null, createDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('reports an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('reports a class of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('reports a subject of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('rejects a stream that does not belong to the class', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, streamId: 'stream-b' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('requires the subject to be offered for the context', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
      prisma.subjectOffering.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('requires the subject to be allocated for the context', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
      prisma.subjectOffering.findFirst.mockResolvedValue({ id: offeringA });
      prisma.subjectAllocation.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate group for the same context', async () => {
      mockContext();
      prisma.teachingGroup.findFirst.mockResolvedValue({ id: 'group-existing' });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.teachingGroup.create).not.toHaveBeenCalled();
    });

    it('creates a teaching group scoped to the active school', async () => {
      mockContext(streamA);
      prisma.teachingGroup.create.mockResolvedValue({
        ...groupA,
        streamId: streamA,
      });

      const result = await service.create(schoolA, {
        ...createDto,
        streamId: streamA,
        name: 'S2A Mathematics',
      });

      expect(prisma.teachingGroup.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          academicYearId: yearA,
          academicClassId: classA,
          streamId: streamA,
          subjectId: subjectA,
          name: 'S2A Mathematics',
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.streamId).toBe(streamA);
    });

    it('maps a P2002 race to a conflict', async () => {
      mockContext();
      prisma.teachingGroup.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a P2003 race to a conflict', async () => {
      mockContext();
      prisma.teachingGroup.create.mockRejectedValue(prismaError('P2003'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lists teaching groups of the active school', async () => {
      prisma.teachingGroup.findMany.mockResolvedValue([groupA]);

      const result = await service.list(schoolA, {});

      expect(prisma.teachingGroup.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('filters by subject of the active school', async () => {
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA });
      prisma.teachingGroup.findMany.mockResolvedValue([groupA]);

      await service.list(schoolA, { subjectId: subjectA });

      expect(prisma.teachingGroup.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA, subjectId: subjectA },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('reports a filter subject of another school as not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.list(schoolA, { subjectId: 'subject-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, groupA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a group of the active school', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue(groupA);

      const result = await service.get(schoolA, groupA.id);

      expect(prisma.teachingGroup.findFirst).toHaveBeenCalledWith({
        where: { id: groupA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(groupA.id);
    });

    it('reports a group of another school as not found', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'group-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, groupA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a group of another school as not found', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'group-b', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teachingGroup.update).not.toHaveBeenCalled();
    });

    it('updates a group of the active school', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue({ id: groupA.id });
      prisma.teachingGroup.update.mockResolvedValue({
        ...groupA,
        name: 'Renamed',
      });

      const result = await service.update(schoolA, groupA.id, {
        name: 'Renamed',
      });

      expect(prisma.teachingGroup.update).toHaveBeenCalledWith({
        where: { id: groupA.id },
        data: { name: 'Renamed' },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Renamed');
    });

    it('maps a P2025 race to not found', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue({ id: groupA.id });
      prisma.teachingGroup.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, groupA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('students', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.students(null, groupA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports a group of another school as not found', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue(null);

      await expect(service.students(schoolA, 'group-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('resolves the students enrolled in the group context', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue({
        id: groupA.id,
        academicYearId: yearA,
        academicClassId: classA,
        streamId: null,
      });
      prisma.student.findMany.mockResolvedValueOnce([
        { id: studentA },
        { id: studentB },
      ]);
      prisma.enrollment.findMany.mockResolvedValueOnce([
        { id: enrollmentA, studentId: studentA },
        { id: enrollmentB, studentId: studentB },
      ]);
      prisma.student.findMany.mockResolvedValueOnce([
        {
          id: studentA,
          admissionNumber: 'STU-001',
          firstName: 'A',
          middleName: null,
          lastName: 'One',
          preferredName: null,
          gender: 'MALE',
        },
        {
          id: studentB,
          admissionNumber: 'STU-002',
          firstName: 'B',
          middleName: null,
          lastName: 'Two',
          preferredName: null,
          gender: 'FEMALE',
        },
      ]);

      const result = await service.students(schoolA, groupA.id);

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
        where: {
          studentId: { in: [studentA, studentB] },
          academicYearId: yearA,
          academicClassId: classA,
        },
        select: { id: true, studentId: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].student.firstName).toBe('A');
    });

    it('scopes the students to the group stream when set', async () => {
      prisma.teachingGroup.findFirst.mockResolvedValue({
        id: groupA.id,
        academicYearId: yearA,
        academicClassId: classA,
        streamId: streamA,
      });
      prisma.student.findMany.mockResolvedValueOnce([{ id: studentA }]);
      prisma.enrollment.findMany.mockResolvedValueOnce([
        { id: enrollmentA, studentId: studentA },
      ]);
      prisma.student.findMany.mockResolvedValueOnce([
        {
          id: studentA,
          admissionNumber: 'STU-001',
          firstName: 'A',
          middleName: null,
          lastName: 'One',
          preferredName: null,
          gender: 'MALE',
        },
      ]);

      await service.students(schoolA, groupA.id);

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
        where: {
          studentId: { in: [studentA] },
          academicYearId: yearA,
          academicClassId: classA,
          streamId: streamA,
        },
        select: { id: true, studentId: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
