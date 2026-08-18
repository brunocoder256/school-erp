import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ProgressionsService } from './progressions.service';

describe('ProgressionsService', () => {
  let service: ProgressionsService;
  let prisma: {
    academicLevel: { findFirst: jest.Mock };
    academicLevelProgression: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const levelA = { id: 'level-a', code: 'P7', schoolId: schoolA };
  const levelB = { id: 'level-b', code: 'S1', schoolId: schoolA };
  const levelC = { id: 'level-c', code: 'P7', schoolId: schoolB };

  const progressionA = {
    id: 'progression-a',
    fromLevelId: levelA.id,
    toLevelId: levelB.id,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const progressionB = {
    id: 'progression-b',
    fromLevelId: levelC.id,
    toLevelId: levelB.id,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolB,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    fromLevelId: levelA.id,
    toLevelId: levelB.id,
    displayOrder: 1,
  };

  beforeEach(async () => {
    prisma = {
      academicLevel: { findFirst: jest.fn() },
      academicLevelProgression: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ProgressionsService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.create(null, createDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.academicLevelProgression.create).not.toHaveBeenCalled();
    });

    it('rejects a progression where the from level equals the to level', async () => {
      await expect(
        service.create(schoolA, { ...createDto, toLevelId: levelA.id }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.academicLevelProgression.create).not.toHaveBeenCalled();
    });

    it('rejects a from level of another school as not found', async () => {
      prisma.academicLevel.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create(schoolA, { ...createDto, fromLevelId: levelC.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicLevelProgression.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate progression within the school', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicLevelProgression.findFirst.mockResolvedValue({
        id: progressionA.id,
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.academicLevelProgression.findFirst).toHaveBeenCalledWith({
        where: {
          schoolId: schoolA,
          fromLevelId: levelA.id,
          toLevelId: levelB.id,
        },
        select: { id: true },
      });
      expect(prisma.academicLevelProgression.create).not.toHaveBeenCalled();
    });

    it('creates a progression scoped to the active school', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicLevelProgression.findFirst.mockResolvedValue(null);
      prisma.academicLevelProgression.create.mockResolvedValue(progressionA);

      const result = await service.create(schoolA, createDto);

      expect(prisma.academicLevelProgression.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          fromLevelId: levelA.id,
          toLevelId: levelB.id,
          displayOrder: 1,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.fromLevelId).toBe(levelA.id);
      expect(result.toLevelId).toBe(levelB.id);
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lists only progressions of the active school', async () => {
      prisma.academicLevelProgression.findMany.mockResolvedValue([
        progressionA,
      ]);

      const result = await service.list(schoolA);

      expect(prisma.academicLevelProgression.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { displayOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(progressionA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, progressionA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a progression of the active school', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue(progressionA);

      const result = await service.get(schoolA, progressionA.id);

      expect(prisma.academicLevelProgression.findFirst).toHaveBeenCalledWith({
        where: { id: progressionA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(progressionA.id);
    });

    it('reports a progression of another school as not found', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue(null);

      await expect(
        service.get(schoolA, progressionB.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, progressionA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a progression of another school as not found', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, progressionB.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicLevelProgression.update).not.toHaveBeenCalled();
    });

    it('rejects updating so the from level equals the to level', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue({
        id: progressionA.id,
        fromLevelId: levelA.id,
        toLevelId: levelB.id,
      });

      await expect(
        service.update(schoolA, progressionA.id, { fromLevelId: levelB.id }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.academicLevelProgression.update).not.toHaveBeenCalled();
    });

    it('rejects a to level of another school as not found', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue({
        id: progressionA.id,
        fromLevelId: levelA.id,
        toLevelId: levelB.id,
      });
      prisma.academicLevel.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update(schoolA, progressionA.id, { toLevelId: levelC.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates a progression of the active school', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue({
        id: progressionA.id,
        fromLevelId: levelA.id,
        toLevelId: levelB.id,
      });
      prisma.academicLevelProgression.update.mockResolvedValue({
        ...progressionA,
        isActive: false,
      });

      const result = await service.update(schoolA, progressionA.id, {
        isActive: false,
      });

      expect(prisma.academicLevelProgression.update).toHaveBeenCalledWith({
        where: { id: progressionA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, progressionA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a progression of another school as not found', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, progressionB.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes a progression of the active school', async () => {
      prisma.academicLevelProgression.findFirst.mockResolvedValue({
        id: progressionA.id,
      });
      prisma.academicLevelProgression.delete.mockResolvedValue({});

      await service.delete(schoolA, progressionA.id);

      expect(prisma.academicLevelProgression.delete).toHaveBeenCalledWith({
        where: { id: progressionA.id },
      });
    });
  });
});