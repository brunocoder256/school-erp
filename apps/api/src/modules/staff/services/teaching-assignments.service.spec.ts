import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { StaffStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { TeachingAssignmentsService } from './teaching-assignments.service';

describe('TeachingAssignmentsService', () => {
  let service: TeachingAssignmentsService;
  let prisma: {
    staff: { findFirst: jest.Mock };
    academicYear: { findFirst: jest.Mock };
    subject: { findFirst: jest.Mock };
    academicClass: { findFirst: jest.Mock };
    stream: { findFirst: jest.Mock };
    teachingGroup: { findFirst: jest.Mock };
    teachingAssignment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const assignmentA = {
    id: 'assignment-a',
    staffId: 'staff-a',
    academicYearId: 'year-a',
    subjectId: 'subject-a',
    academicClassId: 'class-a',
    streamId: null,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    staffId: 'staff-a',
    academicYearId: 'year-a',
    subjectId: 'subject-a',
    academicClassId: 'class-a',
  };

  beforeEach(async () => {
    prisma = {
      staff: { findFirst: jest.fn() },
      academicYear: { findFirst: jest.fn() },
      subject: { findFirst: jest.fn() },
      academicClass: { findFirst: jest.fn() },
      stream: { findFirst: jest.fn() },
      teachingGroup: { findFirst: jest.fn() },
      teachingAssignment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachingAssignmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TeachingAssignmentsService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  function mockActiveStaff() {
    prisma.staff.findFirst.mockResolvedValue({
      id: 'staff-a',
      employmentStatus: StaffStatus.ACTIVE,
    });
  }

  function mockParents() {
    mockActiveStaff();
    prisma.academicYear.findFirst.mockResolvedValue({ id: 'year-a' });
    prisma.subject.findFirst.mockResolvedValue({ id: 'subject-a' });
    prisma.academicClass.findFirst.mockResolvedValue({ id: 'class-a' });
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.create(null, createDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects an inactive staff member', async () => {
      prisma.staff.findFirst.mockResolvedValue({
        id: 'staff-a',
        employmentStatus: StaffStatus.LEFT,
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('reports an academic year of another school as not found', async () => {
      mockActiveStaff();
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, academicYearId: 'year-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('reports a subject of another school as not found', async () => {
      mockActiveStaff();
      prisma.academicYear.findFirst.mockResolvedValue({ id: 'year-a' });
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, subjectId: 'subject-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('reports a class of another school as not found', async () => {
      mockActiveStaff();
      prisma.academicYear.findFirst.mockResolvedValue({ id: 'year-a' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-a' });
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, academicClassId: 'class-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects a stream that does not belong to the class', async () => {
      mockParents();
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, streamId: 'stream-b' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate assignment for the same combination', async () => {
      mockParents();
      prisma.teachingAssignment.findFirst.mockResolvedValue({
        id: assignmentA.id,
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.teachingAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          schoolId: schoolA,
          staffId: 'staff-a',
          academicYearId: 'year-a',
          subjectId: 'subject-a',
          academicClassId: 'class-a',
          streamId: null,
        },
        select: { id: true },
      });
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('creates an assignment scoped to the active school', async () => {
      mockParents();
      prisma.teachingAssignment.findFirst.mockResolvedValue(null);
      prisma.teachingAssignment.create.mockResolvedValue(assignmentA);

      const result = await service.create(schoolA, createDto);

      expect(prisma.teachingAssignment.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          staffId: 'staff-a',
          academicYearId: 'year-a',
          subjectId: 'subject-a',
          academicClassId: 'class-a',
          streamId: null,
          teachingGroupId: null,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.id).toBe(assignmentA.id);
    });

    it('maps a P2003 race to a conflict', async () => {
      mockParents();
      prisma.teachingAssignment.findFirst.mockResolvedValue(null);
      prisma.teachingAssignment.create.mockRejectedValue(prismaError('P2003'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reports a teaching group of another school as not found', async () => {
      mockParents();
      prisma.teachingAssignment.findFirst.mockResolvedValue(null);
      prisma.teachingGroup.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, {
          ...createDto,
          teachingGroupId: 'group-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects a teaching group that does not match the assignment context', async () => {
      mockParents();
      prisma.teachingAssignment.findFirst.mockResolvedValue(null);
      prisma.teachingGroup.findFirst.mockResolvedValue({
        id: 'group-a',
        academicYearId: 'year-b',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
      });

      await expect(
        service.create(schoolA, {
          ...createDto,
          teachingGroupId: 'group-a',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.teachingAssignment.create).not.toHaveBeenCalled();
    });

    it('creates an assignment linked to a compatible teaching group', async () => {
      mockParents();
      prisma.teachingAssignment.findFirst.mockResolvedValue(null);
      prisma.teachingGroup.findFirst.mockResolvedValue({
        id: 'group-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
      });
      prisma.teachingAssignment.create.mockResolvedValue({
        ...assignmentA,
        teachingGroupId: 'group-a',
      });

      const result = await service.create(schoolA, {
        ...createDto,
        teachingGroupId: 'group-a',
      });

      expect(prisma.teachingAssignment.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          staffId: 'staff-a',
          academicYearId: 'year-a',
          subjectId: 'subject-a',
          academicClassId: 'class-a',
          streamId: null,
          teachingGroupId: 'group-a',
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.teachingGroupId).toBe('group-a');
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lists assignments of the active school', async () => {
      prisma.teachingAssignment.findMany.mockResolvedValue([assignmentA]);

      const result = await service.list(schoolA);

      expect(prisma.teachingAssignment.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, assignmentA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns an assignment of the active school', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValue(assignmentA);

      const result = await service.get(schoolA, assignmentA.id);

      expect(prisma.teachingAssignment.findFirst).toHaveBeenCalledWith({
        where: { id: assignmentA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(assignmentA.id);
    });

    it('reports an assignment of another school as not found', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'assignment-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, assignmentA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating an assignment of another school as not found', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'assignment-b', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
    });

    it('rejects reactivating an assignment whose staff member is no longer active', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValue({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
      });
      prisma.staff.findFirst.mockResolvedValue({
        id: 'staff-a',
        employmentStatus: StaffStatus.INACTIVE,
      });

      await expect(
        service.update(schoolA, assignmentA.id, { isActive: true }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
    });

    it('rejects a changed stream that does not belong to the class', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValue({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
      });
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, assignmentA.id, { streamId: 'stream-b' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
    });

    it('rejects a change that collides with another assignment', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
      });
      prisma.academicClass.findFirst.mockResolvedValue({ id: 'class-b' });
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce({
        id: 'assignment-other',
      });

      await expect(
        service.update(schoolA, assignmentA.id, { academicClassId: 'class-b' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
    });

    it('updates an assignment of the active school', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
      });
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce(null);
      prisma.teachingAssignment.update.mockResolvedValue({
        ...assignmentA,
        isActive: false,
      });

      const result = await service.update(schoolA, assignmentA.id, {
        isActive: false,
      });

      expect(prisma.teachingAssignment.update).toHaveBeenCalledWith({
        where: { id: assignmentA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('clears the stream when an explicit null is supplied', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: 'stream-a',
      });
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce(null);
      prisma.teachingAssignment.update.mockResolvedValue({
        ...assignmentA,
        streamId: null,
      });

      await service.update(schoolA, assignmentA.id, { streamId: null });

      expect(prisma.teachingAssignment.update).toHaveBeenCalledWith({
        where: { id: assignmentA.id },
        data: { streamId: null },
        select: expect.any(Object),
      });
    });

    it('rejects a teaching group that does not match the updated context', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
        teachingGroupId: null,
      });
      prisma.teachingGroup.findFirst.mockResolvedValue({
        id: 'group-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: 'stream-a',
      });

      await expect(
        service.update(schoolA, assignmentA.id, { teachingGroupId: 'group-a' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.teachingAssignment.update).not.toHaveBeenCalled();
    });

    it('clears the teaching group when an explicit null is supplied', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
        teachingGroupId: 'group-a',
      });
      prisma.teachingAssignment.update.mockResolvedValue({
        ...assignmentA,
        teachingGroupId: null,
      });

      await service.update(schoolA, assignmentA.id, { teachingGroupId: null });

      expect(prisma.teachingAssignment.update).toHaveBeenCalledWith({
        where: { id: assignmentA.id },
        data: { teachingGroupId: null },
        select: expect.any(Object),
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce({
        id: assignmentA.id,
        staffId: 'staff-a',
        academicYearId: 'year-a',
        subjectId: 'subject-a',
        academicClassId: 'class-a',
        streamId: null,
      });
      prisma.teachingAssignment.findFirst.mockResolvedValueOnce(null);
      prisma.teachingAssignment.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, assignmentA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});