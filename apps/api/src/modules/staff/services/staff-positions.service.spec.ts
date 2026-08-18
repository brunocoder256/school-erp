import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { StaffPositionsService } from './staff-positions.service';

describe('StaffPositionsService', () => {
  let service: StaffPositionsService;
  let prisma: {
    staffPosition: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const positionA = {
    id: 'position-a',
    name: 'Head Teacher',
    code: 'HEAD_TEACHER',
    description: null,
    isActive: true,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = { name: 'Head Teacher', code: 'HEAD_TEACHER' };

  beforeEach(async () => {
    prisma = {
      staffPosition: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffPositionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StaffPositionsService);
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
      expect(prisma.staffPosition.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue({ id: positionA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.staffPosition.create).not.toHaveBeenCalled();
    });

    it('creates a staff position scoped to the active school', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue(null);
      prisma.staffPosition.create.mockResolvedValue(positionA);

      const result = await service.create(schoolA, createDto);

      expect(prisma.staffPosition.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          name: 'Head Teacher',
          code: 'HEAD_TEACHER',
          description: null,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.code).toBe('HEAD_TEACHER');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue(null);
      prisma.staffPosition.create.mockRejectedValue(prismaError('P2002'));

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

    it('lists staff positions of the active school', async () => {
      prisma.staffPosition.findMany.mockResolvedValue([positionA]);

      const result = await service.list(schoolA);

      expect(prisma.staffPosition.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, positionA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a staff position of the active school', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue(positionA);

      const result = await service.get(schoolA, positionA.id);

      expect(prisma.staffPosition.findFirst).toHaveBeenCalledWith({
        where: { id: positionA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(positionA.id);
    });

    it('reports a staff position of another school as not found', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'position-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, positionA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a staff position of another school as not found', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'position-b', { name: 'Deputy' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffPosition.update).not.toHaveBeenCalled();
    });

    it('rejects a code already used by another position', async () => {
      prisma.staffPosition.findFirst.mockResolvedValueOnce({
        id: positionA.id,
      });
      prisma.staffPosition.findFirst.mockResolvedValueOnce({
        id: 'position-other',
      });

      await expect(
        service.update(schoolA, positionA.id, { code: 'DEPUTY' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.staffPosition.update).not.toHaveBeenCalled();
    });

    it('updates a staff position of the active school', async () => {
      prisma.staffPosition.findFirst.mockResolvedValueOnce({
        id: positionA.id,
      });
      prisma.staffPosition.findFirst.mockResolvedValueOnce(null);
      prisma.staffPosition.update.mockResolvedValue({
        ...positionA,
        isActive: false,
      });

      const result = await service.update(schoolA, positionA.id, {
        isActive: false,
      });

      expect(prisma.staffPosition.update).toHaveBeenCalledWith({
        where: { id: positionA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.staffPosition.findFirst.mockResolvedValueOnce({
        id: positionA.id,
      });
      prisma.staffPosition.findFirst.mockResolvedValueOnce(null);
      prisma.staffPosition.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, positionA.id, { code: 'DEPUTY' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staffPosition.findFirst.mockResolvedValueOnce({
        id: positionA.id,
      });
      prisma.staffPosition.findFirst.mockResolvedValueOnce(null);
      prisma.staffPosition.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, positionA.id, { name: 'Deputy Head' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, positionA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a staff position of another school as not found', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, 'position-b'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects deleting a staff position still held by staff members', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue({
        id: positionA.id,
        _count: { staffMembers: 1 },
      });

      await expect(
        service.delete(schoolA, positionA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.staffPosition.delete).not.toHaveBeenCalled();
    });

    it('deletes an unheld staff position of the active school', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue({
        id: positionA.id,
        _count: { staffMembers: 0 },
      });
      prisma.staffPosition.delete.mockResolvedValue({});

      await service.delete(schoolA, positionA.id);

      expect(prisma.staffPosition.delete).toHaveBeenCalledWith({
        where: { id: positionA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staffPosition.findFirst.mockResolvedValue({
        id: positionA.id,
        _count: { staffMembers: 0 },
      });
      prisma.staffPosition.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, positionA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});