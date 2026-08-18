import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SubjectAllocationsService } from './subject-allocations.service';

describe('SubjectAllocationsService', () => {
  let service: SubjectAllocationsService;
  let prisma: {
    academicYear: { findFirst: jest.Mock };
    academicClass: { findFirst: jest.Mock };
    stream: { findFirst: jest.Mock };
    subjectOffering: { findFirst: jest.Mock; findMany: jest.Mock };
    subjectAllocation: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';
  const yearA = 'year-a';
  const classA = 'class-a';
  const levelA = 'level-a';
  const streamA = 'stream-a';
  const offeringA = 'offering-a';

  const allocationA = {
    id: 'allocation-a',
    isActive: true,
    schoolId: schoolA,
    academicYearId: yearA,
    academicClassId: classA,
    streamId: null,
    subjectOfferingId: offeringA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    academicYearId: yearA,
    academicClassId: classA,
    subjectOfferingId: offeringA,
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
      subjectOffering: { findFirst: jest.fn(), findMany: jest.fn() },
      subjectAllocation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectAllocationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubjectAllocationsService);
  });

  function mockParents(streamId?: string) {
    prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
    prisma.academicClass.findFirst.mockResolvedValue({
      id: classA,
      academicLevelId: levelA,
    });
    if (streamId) {
      prisma.stream.findFirst.mockResolvedValue({ id: streamId });
    }
    prisma.subjectOffering.findFirst.mockResolvedValue({
      id: offeringA,
      academicYearId: yearA,
      academicLevelId: levelA,
    });
    prisma.subjectAllocation.findFirst.mockResolvedValue(null);
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.create(null, createDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('reports an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('reports a class of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('rejects a stream that does not belong to the class', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, streamId: 'stream-b' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('reports a subject offering of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectOffering.findFirst.mockResolvedValue(null);

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('rejects an offering whose year does not match the allocation year', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectOffering.findFirst.mockResolvedValue({
        id: offeringA,
        academicYearId: 'year-b',
        academicLevelId: levelA,
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('rejects an offering whose level does not match the class level', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: yearA });
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA,
        academicLevelId: levelA,
      });
      prisma.subjectOffering.findFirst.mockResolvedValue({
        id: offeringA,
        academicYearId: yearA,
        academicLevelId: 'level-b',
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate allocation for the same context', async () => {
      mockParents();
      prisma.subjectAllocation.findFirst.mockResolvedValue({
        id: 'allocation-existing',
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subjectAllocation.create).not.toHaveBeenCalled();
    });

    it('creates an allocation scoped to the active school', async () => {
      mockParents(streamA);
      prisma.subjectAllocation.create.mockResolvedValue({
        ...allocationA,
        streamId: streamA,
      });

      const result = await service.create(schoolA, {
        ...createDto,
        streamId: streamA,
      });

      expect(prisma.subjectAllocation.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          academicYearId: yearA,
          academicClassId: classA,
          streamId: streamA,
          subjectOfferingId: offeringA,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.streamId).toBe(streamA);
    });

    it('maps a P2002 race to a conflict', async () => {
      mockParents();
      prisma.subjectAllocation.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a P2003 race to a conflict', async () => {
      mockParents();
      prisma.subjectAllocation.create.mockRejectedValue(prismaError('P2003'));

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

    it('lists allocations of the active school', async () => {
      prisma.subjectAllocation.findMany.mockResolvedValue([allocationA]);

      const result = await service.list(schoolA, {});

      expect(prisma.subjectAllocation.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('reports a filter class of another school as not found', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.list(schoolA, { academicClassId: 'class-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('filters by subject through its offerings', async () => {
      prisma.subjectOffering.findMany.mockResolvedValue([{ id: offeringA }]);
      prisma.subjectAllocation.findMany.mockResolvedValue([allocationA]);

      await service.list(schoolA, { subjectId: 'subject-a' });

      expect(prisma.subjectAllocation.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: schoolA,
          subjectOfferingId: { in: [offeringA] },
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('filters by active status', async () => {
      prisma.subjectAllocation.findMany.mockResolvedValue([]);

      await service.list(schoolA, { isActive: true });

      expect(prisma.subjectAllocation.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA, isActive: true },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, allocationA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns an allocation of the active school', async () => {
      prisma.subjectAllocation.findFirst.mockResolvedValue(allocationA);

      const result = await service.get(schoolA, allocationA.id);

      expect(prisma.subjectAllocation.findFirst).toHaveBeenCalledWith({
        where: { id: allocationA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(allocationA.id);
    });

    it('reports an allocation of another school as not found', async () => {
      prisma.subjectAllocation.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'allocation-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    function mockExisting(overrides: Record<string, unknown> = {}) {
      prisma.subjectAllocation.findFirst.mockResolvedValue({
        id: allocationA.id,
        academicYearId: yearA,
        academicClassId: classA,
        streamId: null,
        subjectOfferingId: offeringA,
        ...overrides,
      });
    }

    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, allocationA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating an allocation of another school as not found', async () => {
      prisma.subjectAllocation.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'allocation-b', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectAllocation.update).not.toHaveBeenCalled();
    });

    it('rejects a changed stream that does not belong to the class', async () => {
      mockExisting();
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, allocationA.id, { streamId: 'stream-b' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subjectAllocation.update).not.toHaveBeenCalled();
    });

    it('rejects a change that collides with another allocation', async () => {
      prisma.subjectAllocation.findFirst
        .mockResolvedValueOnce({
          id: allocationA.id,
          academicYearId: yearA,
          academicClassId: classA,
          streamId: null,
          subjectOfferingId: offeringA,
        })
        .mockResolvedValueOnce({ id: 'allocation-other' });
      prisma.stream.findFirst.mockResolvedValue({ id: streamA });

      await expect(
        service.update(schoolA, allocationA.id, { streamId: streamA }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.subjectAllocation.update).not.toHaveBeenCalled();
    });

    it('deactivates an allocation of the active school', async () => {
      prisma.subjectAllocation.findFirst
        .mockResolvedValueOnce({
          id: allocationA.id,
          academicYearId: yearA,
          academicClassId: classA,
          streamId: null,
          subjectOfferingId: offeringA,
        })
        .mockResolvedValueOnce(null);
      prisma.subjectAllocation.update.mockResolvedValue({
        ...allocationA,
        isActive: false,
      });

      const result = await service.update(schoolA, allocationA.id, {
        isActive: false,
      });

      expect(prisma.subjectAllocation.update).toHaveBeenCalledWith({
        where: { id: allocationA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.subjectAllocation.findFirst
        .mockResolvedValueOnce({
          id: allocationA.id,
          academicYearId: yearA,
          academicClassId: classA,
          streamId: null,
          subjectOfferingId: offeringA,
        })
        .mockResolvedValueOnce(null);
      prisma.subjectAllocation.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, allocationA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
