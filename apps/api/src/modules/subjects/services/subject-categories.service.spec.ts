import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SubjectCategoriesService } from './subject-categories.service';

describe('SubjectCategoriesService', () => {
  let service: SubjectCategoriesService;
  let prisma: {
    subjectCategory: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const categoryA = {
    id: 'category-a',
    name: 'Core',
    code: 'CORE',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const categoryB = {
    id: 'category-b',
    name: 'Core',
    code: 'CORE',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolB,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  Elective  ',
    code: '  ELECTIVE  ',
    description: 'Optional subjects',
    displayOrder: 2,
  };

  beforeEach(async () => {
    prisma = {
      subjectCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectCategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubjectCategoriesService);
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
      expect(prisma.subjectCategory.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue({ id: categoryA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subjectCategory.findFirst).toHaveBeenCalledWith({
        where: { schoolId: schoolA, code: 'ELECTIVE' },
        select: { id: true },
      });
      expect(prisma.subjectCategory.create).not.toHaveBeenCalled();
    });

    it('creates a category scoped to the active school', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(null);
      prisma.subjectCategory.create.mockResolvedValue({
        ...categoryA,
        id: 'category-c',
        name: 'Elective',
        code: 'ELECTIVE',
        schoolId: schoolA,
      });

      const result = await service.create(schoolA, createDto);

      expect(prisma.subjectCategory.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          name: 'Elective',
          code: 'ELECTIVE',
          description: 'Optional subjects',
          displayOrder: 2,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('ELECTIVE');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(null);
      prisma.subjectCategory.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lists only categories of the active school', async () => {
      prisma.subjectCategory.findMany.mockResolvedValue([categoryA]);

      const result = await service.list(schoolA);

      expect(prisma.subjectCategory.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { displayOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(categoryA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, categoryA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a category of the active school', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(categoryA);

      const result = await service.get(schoolA, categoryA.id);

      expect(prisma.subjectCategory.findFirst).toHaveBeenCalledWith({
        where: { id: categoryA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(categoryA.id);
    });

    it('reports a category of another school as not found', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, categoryB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, categoryA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a category of another school as not found', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, categoryB.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectCategory.update).not.toHaveBeenCalled();
    });

    it('updates a category of the active school', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue({ id: categoryA.id });
      prisma.subjectCategory.update.mockResolvedValue({
        ...categoryA,
        name: 'Core Compulsory',
        description: null,
      });

      const result = await service.update(schoolA, categoryA.id, {
        name: '  Core Compulsory  ',
        description: '  ',
      });

      expect(prisma.subjectCategory.update).toHaveBeenCalledWith({
        where: { id: categoryA.id },
        data: { name: 'Core Compulsory', description: null },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Core Compulsory');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue({ id: categoryA.id });
      prisma.subjectCategory.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, categoryA.id, { code: 'CORE_X' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue({ id: categoryA.id });
      prisma.subjectCategory.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, categoryA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, categoryA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a category of another school as not found', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, categoryB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to delete a category that still has subjects', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue({
        id: categoryA.id,
        _count: { subjects: 1 },
      });

      await expect(service.delete(schoolA, categoryA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subjectCategory.delete).not.toHaveBeenCalled();
    });

    it('deletes a category with no subjects', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue({
        id: categoryA.id,
        _count: { subjects: 0 },
      });
      prisma.subjectCategory.delete.mockResolvedValue({});

      await service.delete(schoolA, categoryA.id);

      expect(prisma.subjectCategory.delete).toHaveBeenCalledWith({
        where: { id: categoryA.id },
      });
    });

    it('maps a P2003 race to a conflict', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue({
        id: categoryA.id,
        _count: { subjects: 0 },
      });
      prisma.subjectCategory.delete.mockRejectedValue(prismaError('P2003'));

      await expect(service.delete(schoolA, categoryA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});