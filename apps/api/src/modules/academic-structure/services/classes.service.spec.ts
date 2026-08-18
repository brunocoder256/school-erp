import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ClassesService } from './classes.service';

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: {
    academicLevel: { findFirst: jest.Mock };
    academicClass: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const levelA = { id: 'level-a', code: 'S2', schoolId: schoolA };
  const levelB = { id: 'level-b', code: 'S2', schoolId: schoolB };

  const classA = {
    id: 'class-a',
    name: 'Senior 2',
    code: 'S2',
    description: null,
    isActive: true,
    schoolId: schoolA,
    academicLevelId: levelA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const classB = {
    id: 'class-b',
    name: 'Senior 2',
    code: 'S2',
    description: null,
    isActive: true,
    schoolId: schoolB,
    academicLevelId: levelB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  Senior 2  ',
    code: '  S2  ',
    description: 'Main class',
  };

  beforeEach(async () => {
    prisma = {
      academicLevel: { findFirst: jest.fn() },
      academicClass: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ClassesService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.create(null, levelA.id, createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.academicClass.create).not.toHaveBeenCalled();
    });

    it('rejects a level of another school as not found', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, levelB.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicLevel.findFirst).toHaveBeenCalledWith({
        where: { id: levelB.id, schoolId: schoolA },
        select: { id: true },
      });
      expect(prisma.academicClass.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue({ id: classA.id });

      await expect(service.create(schoolA, levelA.id, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.academicClass.create).not.toHaveBeenCalled();
    });

    it('creates a class tied to the level of the active school', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue(null);
      prisma.academicClass.create.mockResolvedValue({
        ...classA,
        name: 'Senior 2',
        code: 'S2',
      });

      const result = await service.create(schoolA, levelA.id, createDto);

      expect(prisma.academicClass.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          academicLevelId: levelA.id,
          name: 'Senior 2',
          code: 'S2',
          description: 'Main class',
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.academicLevelId).toBe(levelA.id);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue(null);
      prisma.academicClass.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, levelA.id, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a P2003 race to a conflict', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue(null);
      prisma.academicClass.create.mockRejectedValue(prismaError('P2003'));

      await expect(service.create(schoolA, levelA.id, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, levelA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects a level of another school as not found', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(service.list(schoolA, levelB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists only classes of the level', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findMany.mockResolvedValue([classA]);

      const result = await service.list(schoolA, levelA.id);

      expect(prisma.academicClass.findMany).toHaveBeenCalledWith({
        where: { academicLevelId: levelA.id },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(classA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, levelA.id, classA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a class of the level', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue(classA);

      const result = await service.get(schoolA, levelA.id, classA.id);

      expect(prisma.academicClass.findFirst).toHaveBeenCalledWith({
        where: { id: classA.id, academicLevelId: levelA.id },
        select: expect.any(Object),
      });
      expect(result.id).toBe(classA.id);
    });

    it('reports a class of another school as not found', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, levelA.id, classB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, levelA.id, classA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a class of another school as not found', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, levelA.id, classB.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicClass.update).not.toHaveBeenCalled();
    });

    it('updates a class of the active school', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue({ id: classA.id });
      prisma.academicClass.update.mockResolvedValue({
        ...classA,
        name: 'Senior Two',
        description: null,
      });

      const result = await service.update(schoolA, levelA.id, classA.id, {
        name: '  Senior Two  ',
        description: '  ',
      });

      expect(prisma.academicClass.update).toHaveBeenCalledWith({
        where: { id: classA.id },
        data: { name: 'Senior Two', description: null },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Senior Two');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue({ id: classA.id });
      prisma.academicClass.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, levelA.id, classA.id, { code: 'S2X' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, levelA.id, classA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a class of another school as not found', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, levelA.id, classB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to delete a class that still has streams', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA.id,
        _count: { streams: 1, enrollments: 0 },
      });

      await expect(service.delete(schoolA, levelA.id, classA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.academicClass.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete a class that still has enrollments', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA.id,
        _count: { streams: 0, enrollments: 1 },
      });

      await expect(service.delete(schoolA, levelA.id, classA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deletes a class with no streams or enrollments', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA.id,
        _count: { streams: 0, enrollments: 0 },
      });
      prisma.academicClass.delete.mockResolvedValue({});

      await service.delete(schoolA, levelA.id, classA.id);

      expect(prisma.academicClass.delete).toHaveBeenCalledWith({
        where: { id: classA.id },
      });
    });

    it('maps a P2003 race to a conflict', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classA.id,
        _count: { streams: 0, enrollments: 0 },
      });
      prisma.academicClass.delete.mockRejectedValue(prismaError('P2003'));

      await expect(service.delete(schoolA, levelA.id, classA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});