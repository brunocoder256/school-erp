import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prisma: {
    department: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const departmentA = {
    id: 'dept-a',
    name: 'Science',
    code: 'SCI',
    description: null,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = { name: 'Science', code: 'SCI' };

  beforeEach(async () => {
    prisma = {
      department: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DepartmentsService);
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
      expect(prisma.department.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.department.findFirst.mockResolvedValue({ id: departmentA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.department.create).not.toHaveBeenCalled();
    });

    it('creates a department scoped to the active school', async () => {
      prisma.department.findFirst.mockResolvedValue(null);
      prisma.department.create.mockResolvedValue(departmentA);

      const result = await service.create(schoolA, createDto);

      expect(prisma.department.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          name: 'Science',
          code: 'SCI',
          description: null,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('SCI');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.department.findFirst.mockResolvedValue(null);
      prisma.department.create.mockRejectedValue(prismaError('P2002'));

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

    it('lists departments of the active school', async () => {
      prisma.department.findMany.mockResolvedValue([departmentA]);

      const result = await service.list(schoolA);

      expect(prisma.department.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, departmentA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a department of the active school', async () => {
      prisma.department.findFirst.mockResolvedValue(departmentA);

      const result = await service.get(schoolA, departmentA.id);

      expect(prisma.department.findFirst).toHaveBeenCalledWith({
        where: { id: departmentA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(departmentA.id);
    });

    it('reports a department of another school as not found', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'dept-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, departmentA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a department of another school as not found', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'dept-b', { name: 'Languages' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.department.update).not.toHaveBeenCalled();
    });

    it('rejects a code already used by another department', async () => {
      prisma.department.findFirst.mockResolvedValueOnce({
        id: departmentA.id,
      });
      prisma.department.findFirst.mockResolvedValueOnce({ id: 'dept-other' });

      await expect(
        service.update(schoolA, departmentA.id, { code: 'MAT' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.department.update).not.toHaveBeenCalled();
    });

    it('updates a department of the active school', async () => {
      prisma.department.findFirst.mockResolvedValueOnce({
        id: departmentA.id,
      });
      prisma.department.findFirst.mockResolvedValueOnce(null);
      prisma.department.update.mockResolvedValue({
        ...departmentA,
        isActive: false,
      });

      const result = await service.update(schoolA, departmentA.id, {
        isActive: false,
      });

      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: departmentA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.department.findFirst.mockResolvedValueOnce({
        id: departmentA.id,
      });
      prisma.department.findFirst.mockResolvedValueOnce(null);
      prisma.department.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, departmentA.id, { code: 'MAT' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.department.findFirst.mockResolvedValueOnce({
        id: departmentA.id,
      });
      prisma.department.findFirst.mockResolvedValueOnce(null);
      prisma.department.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, departmentA.id, { name: 'Languages' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, departmentA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a department of another school as not found', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, 'dept-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects deleting a department that still has staff members', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: departmentA.id,
        _count: { staffMembers: 2, responsibilities: 0 },
      });

      await expect(
        service.delete(schoolA, departmentA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.department.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting a department that still has responsibilities', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: departmentA.id,
        _count: { staffMembers: 0, responsibilities: 1 },
      });

      await expect(
        service.delete(schoolA, departmentA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.department.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced department of the active school', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: departmentA.id,
        _count: { staffMembers: 0, responsibilities: 0 },
      });
      prisma.department.delete.mockResolvedValue({});

      await service.delete(schoolA, departmentA.id);

      expect(prisma.department.delete).toHaveBeenCalledWith({
        where: { id: departmentA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: departmentA.id,
        _count: { staffMembers: 0, responsibilities: 0 },
      });
      prisma.department.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, departmentA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});