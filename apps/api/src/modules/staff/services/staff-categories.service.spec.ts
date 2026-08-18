import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { StaffCategoriesService } from './staff-categories.service';

describe('StaffCategoriesService', () => {
  let service: StaffCategoriesService;
  let prisma: {
    staffCategory: {
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
    name: 'Teaching',
    code: 'TEACHING',
    description: null,
    displayOrder: 0,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = { name: 'Teaching', code: 'TEACHING' };

  beforeEach(async () => {
    prisma = {
      staffCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffCategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StaffCategoriesService);
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
      expect(prisma.staffCategory.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue({ id: categoryA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.staffCategory.create).not.toHaveBeenCalled();
    });

    it('creates a staff category scoped to the active school', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);
      prisma.staffCategory.create.mockResolvedValue(categoryA);

      const result = await service.create(schoolA, createDto);

      expect(prisma.staffCategory.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          name: 'Teaching',
          code: 'TEACHING',
          description: null,
          displayOrder: 0,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('TEACHING');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);
      prisma.staffCategory.create.mockRejectedValue(prismaError('P2002'));

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

    it('lists staff categories of the active school by display order', async () => {
      prisma.staffCategory.findMany.mockResolvedValue([categoryA]);

      const result = await service.list(schoolA);

      expect(prisma.staffCategory.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { displayOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, categoryA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a staff category of the active school', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(categoryA);

      const result = await service.get(schoolA, categoryA.id);

      expect(prisma.staffCategory.findFirst).toHaveBeenCalledWith({
        where: { id: categoryA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(categoryA.id);
    });

    it('reports a staff category of another school as not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'category-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, categoryA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a staff category of another school as not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'category-b', { name: 'Non-Teaching' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffCategory.update).not.toHaveBeenCalled();
    });

    it('rejects a code already used by another category', async () => {
      prisma.staffCategory.findFirst.mockResolvedValueOnce({
        id: categoryA.id,
      });
      prisma.staffCategory.findFirst.mockResolvedValueOnce({
        id: 'category-other',
      });

      await expect(
        service.update(schoolA, categoryA.id, { code: 'SUPPORT' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.staffCategory.update).not.toHaveBeenCalled();
    });

    it('updates a staff category of the active school', async () => {
      prisma.staffCategory.findFirst.mockResolvedValueOnce({
        id: categoryA.id,
      });
      prisma.staffCategory.findFirst.mockResolvedValueOnce(null);
      prisma.staffCategory.update.mockResolvedValue({
        ...categoryA,
        displayOrder: 2,
      });

      const result = await service.update(schoolA, categoryA.id, {
        displayOrder: 2,
      });

      expect(prisma.staffCategory.update).toHaveBeenCalledWith({
        where: { id: categoryA.id },
        data: { displayOrder: 2 },
        select: expect.any(Object),
      });
      expect(result.displayOrder).toBe(2);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.staffCategory.findFirst.mockResolvedValueOnce({
        id: categoryA.id,
      });
      prisma.staffCategory.findFirst.mockResolvedValueOnce(null);
      prisma.staffCategory.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, categoryA.id, { code: 'SUPPORT' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValueOnce({
        id: categoryA.id,
      });
      prisma.staffCategory.findFirst.mockResolvedValueOnce(null);
      prisma.staffCategory.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, categoryA.id, { name: 'Support' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, categoryA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a staff category of another school as not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, 'category-b'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects deleting a staff category that still has staff members', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue({
        id: categoryA.id,
        _count: { staffMembers: 2 },
      });

      await expect(
        service.delete(schoolA, categoryA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.staffCategory.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced staff category of the active school', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue({
        id: categoryA.id,
        _count: { staffMembers: 0 },
      });
      prisma.staffCategory.delete.mockResolvedValue({});

      await service.delete(schoolA, categoryA.id);

      expect(prisma.staffCategory.delete).toHaveBeenCalledWith({
        where: { id: categoryA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue({
        id: categoryA.id,
        _count: { staffMembers: 0 },
      });
      prisma.staffCategory.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, categoryA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});