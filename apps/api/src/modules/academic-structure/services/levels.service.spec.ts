import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { LevelsService } from './levels.service';

describe('LevelsService', () => {
  let service: LevelsService;
  let prisma: {
    educationSection: { findFirst: jest.Mock };
    academicOrganization: { findFirst: jest.Mock };
    academicLevel: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const sectionA = { id: 'section-a', name: 'Lower Secondary', schoolId: schoolA };
  const sectionB = { id: 'section-b', name: 'Primary', schoolId: schoolB };
  const organizationA = {
    id: 'org-a',
    name: 'Competency-based',
    schoolId: schoolA,
  };
  const organizationB = { id: 'org-b', name: 'Thematic', schoolId: schoolB };

  const levelA = {
    id: 'level-a',
    name: 'Senior 2',
    code: 'S2',
    levelNumber: 2,
    description: null,
    displayOrder: 12,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolA,
    sectionId: sectionA.id,
    academicOrganizationId: organizationA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const levelB = {
    id: 'level-b',
    name: 'Primary 2',
    code: 'P2',
    levelNumber: 2,
    description: null,
    displayOrder: 5,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolB,
    sectionId: sectionB.id,
    academicOrganizationId: organizationB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  Senior 2  ',
    code: '  S2  ',
    levelNumber: 2,
    academicOrganizationId: organizationA.id,
    displayOrder: 12,
  };

  beforeEach(async () => {
    prisma = {
      educationSection: { findFirst: jest.fn() },
      academicOrganization: { findFirst: jest.fn() },
      academicLevel: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LevelsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(LevelsService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  function mockParentsInSchool() {
    prisma.educationSection.findFirst.mockResolvedValue(sectionA);
    prisma.academicOrganization.findFirst.mockResolvedValue(organizationA);
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.create(null, sectionA.id, createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.academicLevel.create).not.toHaveBeenCalled();
    });

    it('rejects a section of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, sectionB.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.educationSection.findFirst).toHaveBeenCalledWith({
        where: { id: sectionB.id, schoolId: schoolA },
        select: { id: true },
      });
      expect(prisma.academicLevel.create).not.toHaveBeenCalled();
    });

    it('rejects an organization of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, sectionA.id, {
          ...createDto,
          academicOrganizationId: organizationB.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicLevel.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      mockParentsInSchool();
      prisma.academicLevel.findFirst.mockResolvedValue({ id: levelA.id });

      await expect(
        service.create(schoolA, sectionA.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.academicLevel.create).not.toHaveBeenCalled();
    });

    it('creates a level scoped to the active school and section', async () => {
      mockParentsInSchool();
      prisma.academicLevel.findFirst.mockResolvedValue(null);
      prisma.academicLevel.create.mockResolvedValue({
        ...levelA,
        name: 'Senior 2',
        code: 'S2',
      });

      const result = await service.create(schoolA, sectionA.id, createDto);

      expect(prisma.academicLevel.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          sectionId: sectionA.id,
          academicOrganizationId: organizationA.id,
          name: 'Senior 2',
          code: 'S2',
          levelNumber: 2,
          description: null,
          displayOrder: 12,
          canEnroll: true,
          isTerminal: false,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('S2');
    });

    it('maps a P2002 race to a conflict', async () => {
      mockParentsInSchool();
      prisma.academicLevel.findFirst.mockResolvedValue(null);
      prisma.academicLevel.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.create(schoolA, sectionA.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, sectionA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects a section of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(null);

      await expect(service.list(schoolA, sectionB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists only levels of the section', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findMany.mockResolvedValue([levelA]);

      const result = await service.list(schoolA, sectionA.id);

      expect(prisma.academicLevel.findMany).toHaveBeenCalledWith({
        where: { sectionId: sectionA.id },
        select: expect.any(Object),
        orderBy: { displayOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(levelA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.get(null, sectionA.id, levelA.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns a level of the section', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);

      const result = await service.get(schoolA, sectionA.id, levelA.id);

      expect(prisma.academicLevel.findFirst).toHaveBeenCalledWith({
        where: { id: levelA.id, sectionId: sectionA.id },
        select: expect.any(Object),
      });
      expect(result.id).toBe(levelA.id);
    });

    it('reports a level of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.get(schoolA, sectionA.id, levelB.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, sectionA.id, levelA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an organization of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, sectionA.id, levelA.id, {
          academicOrganizationId: organizationB.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicLevel.update).not.toHaveBeenCalled();
    });

    it('reports updating a level of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, sectionA.id, levelB.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicLevel.update).not.toHaveBeenCalled();
    });

    it('updates a level of the active school', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue({ id: levelA.id });
      prisma.academicLevel.update.mockResolvedValue({
        ...levelA,
        name: 'Senior Two',
        isTerminal: true,
      });

      const result = await service.update(schoolA, sectionA.id, levelA.id, {
        name: '  Senior Two  ',
        isTerminal: true,
      });

      expect(prisma.academicLevel.update).toHaveBeenCalledWith({
        where: { id: levelA.id },
        data: { name: 'Senior Two', isTerminal: true },
        select: expect.any(Object),
      });
      expect(result.isTerminal).toBe(true);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue({ id: levelA.id });
      prisma.academicLevel.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, sectionA.id, levelA.id, { code: 'S2A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.delete(null, sectionA.id, levelA.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports deleting a level of another school as not found', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, sectionA.id, levelB.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to delete a level that still has classes', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue({
        id: levelA.id,
        _count: { classes: 1, fromProgressions: 0, toProgressions: 0 },
      });

      await expect(
        service.delete(schoolA, sectionA.id, levelA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.academicLevel.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete a level used by progression rules', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue({
        id: levelA.id,
        _count: { classes: 0, fromProgressions: 1, toProgressions: 0 },
      });

      await expect(
        service.delete(schoolA, sectionA.id, levelA.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deletes a level with no classes or progression rules', async () => {
      prisma.educationSection.findFirst.mockResolvedValue(sectionA);
      prisma.academicLevel.findFirst.mockResolvedValue({
        id: levelA.id,
        _count: { classes: 0, fromProgressions: 0, toProgressions: 0 },
      });
      prisma.academicLevel.delete.mockResolvedValue({});

      await service.delete(schoolA, sectionA.id, levelA.id);

      expect(prisma.academicLevel.delete).toHaveBeenCalledWith({
        where: { id: levelA.id },
      });
    });
  });
});