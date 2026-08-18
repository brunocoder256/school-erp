import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SectionsService } from './sections.service';

describe('SectionsService', () => {
  let service: SectionsService;
  let prisma: {
    educationSection: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const sectionA = {
    id: 'section-a',
    name: 'Lower Secondary',
    code: 'LOWER_SECONDARY',
    description: null,
    displayOrder: 3,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const sectionB = {
    id: 'section-b',
    name: 'Primary',
    code: 'PRIMARY',
    description: null,
    displayOrder: 2,
    isActive: true,
    schoolId: schoolB,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  Upper Secondary  ',
    code: '  UPPER_SECONDARY  ',
    description: 'S5-S6',
    displayOrder: 4,
  };

  beforeEach(async () => {
    prisma = {
      educationSection: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SectionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SectionsService);
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
      expect(prisma.educationSection.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.educationSection.findFirst.mockResolvedValue({ id: sectionA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.educationSection.findFirst).toHaveBeenCalledWith({
        where: { schoolId: schoolA, code: 'UPPER_SECONDARY' },
        select: { id: true },
      });
      expect(prisma.educationSection.create).not.toHaveBeenCalled();
    });

    it('creates a section scoped to the active school', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(null);
      prisma.educationSection.create.mockResolvedValue({
        ...sectionA,
        id: 'section-c',
        name: 'Upper Secondary',
        code: 'UPPER_SECONDARY',
        displayOrder: 4,
        schoolId: schoolA,
      });

      const result = await service.create(schoolA, createDto);

      expect(prisma.educationSection.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          name: 'Upper Secondary',
          code: 'UPPER_SECONDARY',
          description: 'S5-S6',
          displayOrder: 4,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('UPPER_SECONDARY');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(null);
      prisma.educationSection.create.mockRejectedValue(prismaError('P2002'));

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

    it('lists only sections of the active school', async () => {
      prisma.educationSection.findMany.mockResolvedValue([sectionA]);

      const result = await service.list(schoolA);

      expect(prisma.educationSection.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { displayOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(sectionA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, sectionA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a section of the active school', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);

      const result = await service.get(schoolA, sectionA.id);

      expect(prisma.educationSection.findFirst).toHaveBeenCalledWith({
        where: { id: sectionA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(sectionA.id);
    });

    it('reports a section of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, sectionB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.update(null, sectionA.id, { name: 'X' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports updating a section of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, sectionB.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.educationSection.update).not.toHaveBeenCalled();
    });

    it('updates a section of the active school', async () => {
      prisma.educationSection.findFirst.mockResolvedValue({ id: sectionA.id });
      prisma.educationSection.update.mockResolvedValue({
        ...sectionA,
        name: 'Secondary',
        description: null,
      });

      const result = await service.update(schoolA, sectionA.id, {
        name: '  Secondary  ',
        description: '  ',
      });

      expect(prisma.educationSection.update).toHaveBeenCalledWith({
        where: { id: sectionA.id },
        data: { name: 'Secondary', description: null },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Secondary');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.educationSection.findFirst.mockResolvedValue({ id: sectionA.id });
      prisma.educationSection.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, sectionA.id, { code: 'SECONDARY' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue({ id: sectionA.id });
      prisma.educationSection.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, sectionA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, sectionA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a section of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, sectionB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to delete a section that still has levels', async () => {
      prisma.educationSection.findFirst.mockResolvedValue({
        id: sectionA.id,
        _count: { levels: 1 },
      });

      await expect(service.delete(schoolA, sectionA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.educationSection.delete).not.toHaveBeenCalled();
    });

    it('deletes a section with no levels', async () => {
      prisma.educationSection.findFirst.mockResolvedValue({
        id: sectionA.id,
        _count: { levels: 0 },
      });
      prisma.educationSection.delete.mockResolvedValue({});

      await service.delete(schoolA, sectionA.id);

      expect(prisma.educationSection.delete).toHaveBeenCalledWith({
        where: { id: sectionA.id },
      });
    });

    it('maps a P2003 race to a conflict', async () => {
      prisma.educationSection.findFirst.mockResolvedValue({
        id: sectionA.id,
        _count: { levels: 0 },
      });
      prisma.educationSection.delete.mockRejectedValue(prismaError('P2003'));

      await expect(service.delete(schoolA, sectionA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});