import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { StreamsService } from './streams.service';

describe('StreamsService', () => {
  let service: StreamsService;
  let prisma: {
    academicClass: { findFirst: jest.Mock };
    stream: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const classA = { id: 'class-a', code: 'S2', schoolId: schoolA };
  const classB = { id: 'class-b', code: 'S2', schoolId: schoolB };

  const streamA = {
    id: 'stream-a',
    name: 'A',
    code: 'A',
    capacity: null,
    isActive: true,
    classId: classA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const streamB = {
    id: 'stream-b',
    name: 'A',
    code: 'A',
    capacity: null,
    isActive: true,
    classId: classB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  A  ',
    code: '  A  ',
    capacity: 40,
  };

  beforeEach(async () => {
    prisma = {
      academicClass: { findFirst: jest.fn() },
      stream: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(StreamsService);
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
        service.create(null, classA.id, createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.stream.create).not.toHaveBeenCalled();
    });

    it('rejects a class of another school as not found', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, classB.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicClass.findFirst).toHaveBeenCalledWith({
        where: { id: classB.id, schoolId: schoolA },
        select: { id: true },
      });
      expect(prisma.stream.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue({ id: streamA.id });

      await expect(service.create(schoolA, classA.id, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.stream.findFirst).toHaveBeenCalledWith({
        where: { classId: classA.id, code: 'A' },
        select: { id: true },
      });
      expect(prisma.stream.create).not.toHaveBeenCalled();
    });

    it('creates a stream tied to the class of the active school', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue(null);
      prisma.stream.create.mockResolvedValue({
        ...streamA,
        id: 'stream-c',
        name: 'A',
        code: 'A',
        capacity: 40,
      });

      const result = await service.create(schoolA, classA.id, createDto);

      expect(prisma.stream.create).toHaveBeenCalledWith({
        data: {
          classId: classA.id,
          name: 'A',
          code: 'A',
          capacity: 40,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.classId).toBe(classA.id);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue(null);
      prisma.stream.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, classA.id, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, classA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects a class of another school as not found', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(service.list(schoolA, classB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists only streams of the class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findMany.mockResolvedValue([streamA]);

      const result = await service.list(schoolA, classA.id);

      expect(prisma.stream.findMany).toHaveBeenCalledWith({
        where: { classId: classA.id },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(streamA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, classA.id, streamA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a stream of the class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue(streamA);

      const result = await service.get(schoolA, classA.id, streamA.id);

      expect(prisma.stream.findFirst).toHaveBeenCalledWith({
        where: { id: streamA.id, classId: classA.id },
        select: expect.any(Object),
      });
      expect(result.id).toBe(streamA.id);
    });

    it('reports a stream of another school as not found', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, classA.id, streamB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, classA.id, streamA.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a stream of another school as not found', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, classA.id, streamB.id, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.stream.update).not.toHaveBeenCalled();
    });

    it('rejects clearing a previously set capacity', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue({ id: streamA.id });

      await expect(
        service.update(schoolA, classA.id, streamA.id, { capacity: null }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.stream.update).not.toHaveBeenCalled();
    });

    it('updates a stream of the active school', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue({ id: streamA.id });
      prisma.stream.update.mockResolvedValue({
        ...streamA,
        name: 'East',
        capacity: 45,
      });

      const result = await service.update(schoolA, classA.id, streamA.id, {
        name: '  East  ',
        capacity: 45,
      });

      expect(prisma.stream.update).toHaveBeenCalledWith({
        where: { id: streamA.id },
        data: { name: 'East', capacity: 45 },
        select: expect.any(Object),
      });
      expect(result.name).toBe('East');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue({ id: streamA.id });
      prisma.stream.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, classA.id, streamA.id, { code: 'AX' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, classA.id, streamA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a stream of another school as not found', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, classA.id, streamB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to delete a stream that still has enrollments', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue({
        id: streamA.id,
        _count: { enrollments: 1 },
      });

      await expect(service.delete(schoolA, classA.id, streamA.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.stream.delete).not.toHaveBeenCalled();
    });

    it('deletes a stream with no enrollments', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue({
        id: streamA.id,
        _count: { enrollments: 0 },
      });
      prisma.stream.delete.mockResolvedValue({});

      await service.delete(schoolA, classA.id, streamA.id);

      expect(prisma.stream.delete).toHaveBeenCalledWith({
        where: { id: streamA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(classA);
      prisma.stream.findFirst.mockResolvedValue({
        id: streamA.id,
        _count: { enrollments: 0 },
      });
      prisma.stream.delete.mockRejectedValue(prismaError('P2025'));

      await expect(service.delete(schoolA, classA.id, streamA.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});