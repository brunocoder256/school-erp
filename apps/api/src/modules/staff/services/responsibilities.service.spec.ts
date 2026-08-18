import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ResponsibilitiesService } from './responsibilities.service';

describe('ResponsibilitiesService', () => {
  let service: ResponsibilitiesService;
  let prisma: {
    staff: { findFirst: jest.Mock };
    academicYear: { findFirst: jest.Mock };
    academicClass: { findFirst: jest.Mock };
    stream: { findFirst: jest.Mock };
    department: { findFirst: jest.Mock };
    staffResponsibility: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const responsibilityA = {
    id: 'responsibility-a',
    staffId: 'staff-a',
    type: 'Class Teacher',
    isActive: true,
    academicYearId: 'year-a',
    classId: 'class-a',
    streamId: null,
    departmentId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    type: 'Class Teacher',
    academicYearId: 'year-a',
  };

  beforeEach(async () => {
    prisma = {
      staff: { findFirst: jest.fn() },
      academicYear: { findFirst: jest.fn() },
      academicClass: { findFirst: jest.fn() },
      stream: { findFirst: jest.fn() },
      department: { findFirst: jest.fn() },
      staffResponsibility: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsibilitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ResponsibilitiesService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  function mockParents() {
    prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
    prisma.academicYear.findFirst.mockResolvedValue({ id: 'year-a' });
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.create(null, 'staff-a', createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.staffResponsibility.create).not.toHaveBeenCalled();
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-b', createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffResponsibility.create).not.toHaveBeenCalled();
    });

    it('reports an academic year of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-a', {
          ...createDto,
          academicYearId: 'year-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffResponsibility.create).not.toHaveBeenCalled();
    });

    it('rejects a class of another school as not found', async () => {
      mockParents();
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-a', {
          ...createDto,
          classId: 'class-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffResponsibility.create).not.toHaveBeenCalled();
    });

    it('rejects a stream without a class', async () => {
      mockParents();

      await expect(
        service.create(schoolA, 'staff-a', {
          ...createDto,
          streamId: 'stream-a',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staffResponsibility.create).not.toHaveBeenCalled();
    });

    it('rejects a stream that does not belong to the class', async () => {
      mockParents();
      prisma.academicClass.findFirst.mockResolvedValue({ id: 'class-a' });
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-a', {
          ...createDto,
          classId: 'class-a',
          streamId: 'stream-b',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staffResponsibility.create).not.toHaveBeenCalled();
    });

    it('rejects a department of another school as not found', async () => {
      mockParents();
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-a', {
          ...createDto,
          departmentId: 'dept-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffResponsibility.create).not.toHaveBeenCalled();
    });

    it('creates a responsibility for a staff member of the active school', async () => {
      mockParents();
      prisma.staffResponsibility.create.mockResolvedValue(responsibilityA);

      const result = await service.create(schoolA, 'staff-a', createDto);

      expect(prisma.staffResponsibility.create).toHaveBeenCalledWith({
        data: {
          staffId: 'staff-a',
          type: 'Class Teacher',
          academicYearId: 'year-a',
          classId: null,
          streamId: null,
          departmentId: null,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.type).toBe('Class Teacher');
    });

    it('maps a P2003 race to a bad request', async () => {
      mockParents();
      prisma.staffResponsibility.create.mockRejectedValue(prismaError('P2003'));

      await expect(
        service.create(schoolA, 'staff-a', createDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, 'staff-a')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(service.list(schoolA, 'staff-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists responsibilities of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findMany.mockResolvedValue([responsibilityA]);

      const result = await service.list(schoolA, 'staff-a');

      expect(prisma.staffResponsibility.findMany).toHaveBeenCalledWith({
        where: { staffId: 'staff-a' },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, 'staff-a', responsibilityA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'staff-b', responsibilityA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffResponsibility.update).not.toHaveBeenCalled();
    });

    it('reports a responsibility of another staff member as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'staff-a', responsibilityA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffResponsibility.update).not.toHaveBeenCalled();
    });

    it('rejects clearing the class while a stream remains', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findFirst.mockResolvedValue({
        id: responsibilityA.id,
        classId: 'class-a',
        streamId: 'stream-a',
      });

      await expect(
        service.update(schoolA, 'staff-a', responsibilityA.id, {
          classId: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staffResponsibility.update).not.toHaveBeenCalled();
    });

    it('rejects a stream without a class after update', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findFirst.mockResolvedValue({
        id: responsibilityA.id,
        classId: null,
        streamId: null,
      });

      await expect(
        service.update(schoolA, 'staff-a', responsibilityA.id, {
          streamId: 'stream-a',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staffResponsibility.update).not.toHaveBeenCalled();
    });

    it('updates a responsibility of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findFirst.mockResolvedValue({
        id: responsibilityA.id,
        classId: 'class-a',
        streamId: null,
      });
      prisma.staffResponsibility.update.mockResolvedValue({
        ...responsibilityA,
        isActive: false,
      });

      const result = await service.update(schoolA, 'staff-a', responsibilityA.id, {
        isActive: false,
      });

      expect(prisma.staffResponsibility.update).toHaveBeenCalledWith({
        where: { id: responsibilityA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('clears the stream when an explicit null is supplied', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findFirst.mockResolvedValue({
        id: responsibilityA.id,
        classId: 'class-a',
        streamId: 'stream-a',
      });
      prisma.staffResponsibility.update.mockResolvedValue({
        ...responsibilityA,
        streamId: null,
      });

      await service.update(schoolA, 'staff-a', responsibilityA.id, {
        streamId: null,
      });

      expect(prisma.staffResponsibility.update).toHaveBeenCalledWith({
        where: { id: responsibilityA.id },
        data: { streamId: null },
        select: expect.any(Object),
      });
    });

    it('validates a changed class belongs to the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findFirst.mockResolvedValue({
        id: responsibilityA.id,
        classId: 'class-a',
        streamId: null,
      });
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'staff-a', responsibilityA.id, {
          classId: 'class-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffResponsibility.update).not.toHaveBeenCalled();
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffResponsibility.findFirst.mockResolvedValue({
        id: responsibilityA.id,
        classId: null,
        streamId: null,
      });
      prisma.staffResponsibility.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, 'staff-a', responsibilityA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});