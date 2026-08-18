import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SubjectsService } from './subjects.service';

describe('SubjectsService', () => {
  let service: SubjectsService;
  let prisma: {
    subjectCategory: { findFirst: jest.Mock };
    subject: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const categoryA = { id: 'category-a', code: 'CORE', schoolId: schoolA };
  const categoryB = { id: 'category-b', code: 'CORE', schoolId: schoolB };

  const subjectA = {
    id: 'subject-a',
    name: 'Physics',
    code: 'PHY',
    shortName: 'Phy',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolA,
    categoryId: categoryA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const subjectB = {
    id: 'subject-b',
    name: 'Physics',
    code: 'PHY',
    shortName: 'Phy',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolB,
    categoryId: categoryB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  Biology  ',
    code: '  BIO  ',
    shortName: '  Bio  ',
    categoryId: categoryA.id,
    displayOrder: 2,
  };

  beforeEach(async () => {
    prisma = {
      subjectCategory: { findFirst: jest.fn() },
      subject: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SubjectsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SubjectsService);
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
      expect(prisma.subject.create).not.toHaveBeenCalled();
    });

    it('rejects a category of another school as not found', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, categoryId: categoryB.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectCategory.findFirst).toHaveBeenCalledWith({
        where: { id: categoryB.id, schoolId: schoolA },
        select: { id: true },
      });
      expect(prisma.subject.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(categoryA);
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subject.create).not.toHaveBeenCalled();
    });

    it('creates a subject scoped to the active school', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(categoryA);
      prisma.subject.findFirst.mockResolvedValue(null);
      prisma.subject.create.mockResolvedValue({
        ...subjectA,
        id: 'subject-c',
        name: 'Biology',
        code: 'BIO',
        shortName: 'Bio',
        schoolId: schoolA,
      });

      const result = await service.create(schoolA, createDto);

      expect(prisma.subject.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          categoryId: categoryA.id,
          name: 'Biology',
          code: 'BIO',
          shortName: 'Bio',
          description: null,
          displayOrder: 2,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('BIO');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(categoryA);
      prisma.subject.findFirst.mockResolvedValue(null);
      prisma.subject.create.mockRejectedValue(prismaError('P2002'));

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

    it('lists only subjects of the active school', async () => {
      prisma.subject.findMany.mockResolvedValue([subjectA]);

      const result = await service.list(schoolA);

      expect(prisma.subject.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { displayOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(subjectA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, subjectA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a subject of the active school', async () => {
      prisma.subject.findFirst.mockResolvedValue(subjectA);

      const result = await service.get(schoolA, subjectA.id);

      expect(prisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: subjectA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(subjectA.id);
    });

    it('reports a subject of another school as not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, subjectB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, subjectA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a category of another school as not found', async () => {
      prisma.subjectCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, subjectA.id, { categoryId: categoryB.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subject.update).not.toHaveBeenCalled();
    });

    it('reports updating a subject of another school as not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, subjectB.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subject.update).not.toHaveBeenCalled();
    });

    it('updates a subject of the active school', async () => {
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA.id });
      prisma.subject.update.mockResolvedValue({
        ...subjectA,
        name: 'Physics Advanced',
        shortName: null,
      });

      const result = await service.update(schoolA, subjectA.id, {
        name: '  Physics Advanced  ',
        shortName: '  ',
      });

      expect(prisma.subject.update).toHaveBeenCalledWith({
        where: { id: subjectA.id },
        data: { name: 'Physics Advanced', shortName: null },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Physics Advanced');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.subject.findFirst.mockResolvedValue({ id: subjectA.id });
      prisma.subject.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, subjectA.id, { code: 'PHYX' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, subjectA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a subject of another school as not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, subjectB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to delete a subject that is still offered', async () => {
      prisma.subject.findFirst.mockResolvedValue({
        id: subjectA.id,
        _count: { offerings: 1, combinations: 0 },
      });

      await expect(service.delete(schoolA, subjectA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subject.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete a subject still used by a combination', async () => {
      prisma.subject.findFirst.mockResolvedValue({
        id: subjectA.id,
        _count: { offerings: 0, combinations: 1 },
      });

      await expect(service.delete(schoolA, subjectA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deletes an unreferenced subject', async () => {
      prisma.subject.findFirst.mockResolvedValue({
        id: subjectA.id,
        _count: { offerings: 0, combinations: 0 },
      });
      prisma.subject.delete.mockResolvedValue({});

      await service.delete(schoolA, subjectA.id);

      expect(prisma.subject.delete).toHaveBeenCalledWith({
        where: { id: subjectA.id },
      });
    });

    it('maps a P2003 race to a conflict', async () => {
      prisma.subject.findFirst.mockResolvedValue({
        id: subjectA.id,
        _count: { offerings: 0, combinations: 0 },
      });
      prisma.subject.delete.mockRejectedValue(prismaError('P2003'));

      await expect(service.delete(schoolA, subjectA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});