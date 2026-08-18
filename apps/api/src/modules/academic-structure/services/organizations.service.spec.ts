import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: {
    academicOrganization: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const organizationA = {
    id: 'org-a',
    name: 'Competency-based',
    code: 'COMPETENCY_BASED',
    description: null,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const organizationB = {
    id: 'org-b',
    name: 'Thematic',
    code: 'THEMATIC',
    description: null,
    isActive: true,
    schoolId: schoolB,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  Mixed  ',
    code: '  MIXED  ',
    description: 'Transitional organization',
  };

  beforeEach(async () => {
    prisma = {
      academicOrganization: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OrganizationsService);
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
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue({
        id: organizationA.id,
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.academicOrganization.create).not.toHaveBeenCalled();
    });

    it('creates an organization scoped to the active school', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue(null);
      prisma.academicOrganization.create.mockResolvedValue({
        ...organizationA,
        id: 'org-c',
        name: 'Mixed',
        code: 'MIXED',
        schoolId: schoolA,
      });

      const result = await service.create(schoolA, createDto);

      expect(prisma.academicOrganization.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          name: 'Mixed',
          code: 'MIXED',
          description: 'Transitional organization',
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('MIXED');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue(null);
      prisma.academicOrganization.create.mockRejectedValue(prismaError('P2002'));

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

    it('lists only organizations of the active school', async () => {
      prisma.academicOrganization.findMany.mockResolvedValue([organizationA]);

      const result = await service.list(schoolA);

      expect(prisma.academicOrganization.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(organizationA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, organizationA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns an organization of the active school', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue(organizationA);

      const result = await service.get(schoolA, organizationA.id);

      expect(prisma.academicOrganization.findFirst).toHaveBeenCalledWith({
        where: { id: organizationA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(organizationA.id);
    });

    it('reports an organization of another school as not found', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.get(schoolA, organizationB.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, organizationA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating an organization of another school as not found', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, organizationB.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicOrganization.update).not.toHaveBeenCalled();
    });

    it('updates an organization of the active school', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue({
        id: organizationA.id,
      });
      prisma.academicOrganization.update.mockResolvedValue({
        ...organizationA,
        name: 'Competency',
      });

      const result = await service.update(schoolA, organizationA.id, {
        name: '  Competency  ',
      });

      expect(prisma.academicOrganization.update).toHaveBeenCalledWith({
        where: { id: organizationA.id },
        data: { name: 'Competency' },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Competency');
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, organizationA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting an organization of another school as not found', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, organizationB.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to delete an organization still used by levels', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue({
        id: organizationA.id,
        _count: { levels: 1 },
      });

      await expect(
        service.delete(schoolA, organizationA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.academicOrganization.delete).not.toHaveBeenCalled();
    });

    it('deletes an unused organization', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue({
        id: organizationA.id,
        _count: { levels: 0 },
      });
      prisma.academicOrganization.delete.mockResolvedValue({});

      await service.delete(schoolA, organizationA.id);

      expect(prisma.academicOrganization.delete).toHaveBeenCalledWith({
        where: { id: organizationA.id },
      });
    });

    it('maps a P2003 race to a conflict', async () => {
      prisma.academicOrganization.findFirst.mockResolvedValue({
        id: organizationA.id,
        _count: { levels: 0 },
      });
      prisma.academicOrganization.delete.mockRejectedValue(prismaError('P2003'));

      await expect(
        service.delete(schoolA, organizationA.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});