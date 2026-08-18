import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AcademicYearsService } from './academic-years.service';

describe('AcademicYearsService', () => {
  let service: AcademicYearsService;
  let prisma: {
    academicYear: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const academicYearA = {
    id: 'ay-1',
    name: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: false,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  2026  ',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  };

  beforeEach(async () => {
    prisma = {
      academicYear: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicYearsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AcademicYearsService);
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
      expect(prisma.academicYear.create).not.toHaveBeenCalled();
    });

    it('rejects an end date before the start date', async () => {
      await expect(
        service.create(schoolA, {
          ...createDto,
          startDate: '2026-12-31',
          endDate: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.academicYear.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid date', async () => {
      await expect(
        service.create(schoolA, {
          ...createDto,
          startDate: 'not-a-date',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.academicYear.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate name within the same school', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.academicYear.create).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);
      prisma.academicYear.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates the academic year scoped to the active school, never a client school id', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);
      prisma.academicYear.create.mockResolvedValue(academicYearA);

      const dto = { ...createDto, schoolId: schoolB } as never;

      const result = await service.create(schoolA, dto);

      expect(result.id).toBe('ay-1');
      expect(prisma.academicYear.findFirst).toHaveBeenCalledWith({
        where: { schoolId: schoolA, name: '2026' },
        select: { id: true },
      });
      expect(prisma.academicYear.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            name: '2026',
            isActive: false,
          }),
        }),
      );
      const createData = prisma.academicYear.create.mock.calls[0][0].data;
      expect(createData.schoolId).not.toBe(schoolB);
    });

    it('writes only editable fields', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);
      prisma.academicYear.create.mockResolvedValue(academicYearA);

      const dto = {
        name: '2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        id: 'forged-id',
        createdAt: new Date('2000-01-01'),
        schoolId: schoolB,
      } as never;

      await service.create(schoolA, dto);

      const createData = prisma.academicYear.create.mock.calls[0][0].data;
      expect(createData).toEqual({
        schoolId: schoolA,
        name: '2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: false,
      });
      expect(createData).not.toHaveProperty('id');
      expect(createData).not.toHaveProperty('createdAt');
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.academicYear.findMany).not.toHaveBeenCalled();
    });

    it('queries only the active school', async () => {
      prisma.academicYear.findMany.mockResolvedValue([academicYearA]);

      const result = await service.list(schoolA);

      expect(result).toEqual([academicYearA]);
      expect(prisma.academicYear.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { startDate: 'asc' },
      });
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, academicYearA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.academicYear.findFirst).not.toHaveBeenCalled();
    });

    it('returns an academic year of the active school', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(academicYearA);

      const result = await service.get(schoolA, academicYearA.id);

      expect(result).toEqual(academicYearA);
      expect(prisma.academicYear.findFirst).toHaveBeenCalledWith({
        where: { id: academicYearA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
    });

    it('reports an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'ay-other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.academicYear.findFirst).toHaveBeenCalledWith({
        where: { id: 'ay-other', schoolId: schoolA },
        select: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, academicYearA.id, { name: '2027' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.academicYear.update).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'ay-other', { name: '2027' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicYear.update).not.toHaveBeenCalled();
    });

    it('rejects an invalid date range built from the update and existing dates', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        startDate: academicYearA.startDate,
        endDate: academicYearA.endDate,
      });

      await expect(
        service.update(schoolA, academicYearA.id, {
          endDate: '2020-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.academicYear.update).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        startDate: academicYearA.startDate,
        endDate: academicYearA.endDate,
      });
      prisma.academicYear.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, academicYearA.id, { name: '2027' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 to not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        startDate: academicYearA.startDate,
        endDate: academicYearA.endDate,
      });
      prisma.academicYear.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, academicYearA.id, { name: '2027' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates only the record scoped to the active school', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        startDate: academicYearA.startDate,
        endDate: academicYearA.endDate,
      });
      prisma.academicYear.update.mockResolvedValue({
        ...academicYearA,
        name: '2027',
      });

      const dto = {
        name: '2027',
        schoolId: schoolB,
        id: 'forged-id',
      } as never;

      const result = await service.update(schoolA, academicYearA.id, dto);

      expect(result.name).toBe('2027');
      expect(prisma.academicYear.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: academicYearA.id } }),
      );
      const updateData = prisma.academicYear.update.mock.calls[0][0].data;
      expect(updateData).toEqual({ name: '2027' });
      expect(updateData).not.toHaveProperty('schoolId');
      expect(updateData).not.toHaveProperty('id');
    });

    it('writes only provided editable fields', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        startDate: academicYearA.startDate,
        endDate: academicYearA.endDate,
      });
      prisma.academicYear.update.mockResolvedValue({
        ...academicYearA,
        isActive: true,
      });

      await service.update(schoolA, academicYearA.id, { isActive: true });

      expect(prisma.academicYear.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.delete(null, academicYearA.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.academicYear.delete).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, 'ay-other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.academicYear.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete an academic year that still has terms', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        _count: { terms: 3, enrollments: 0 },
      });

      await expect(
        service.delete(schoolA, academicYearA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.academicYear.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete an academic year that still has enrollments', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        _count: { terms: 0, enrollments: 2 },
      });

      await expect(
        service.delete(schoolA, academicYearA.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.academicYear.delete).not.toHaveBeenCalled();
    });

    it('deletes an academic year with no terms and no enrollments', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        _count: { terms: 0, enrollments: 0 },
      });
      prisma.academicYear.delete.mockResolvedValue(academicYearA);

      await service.delete(schoolA, academicYearA.id);

      expect(prisma.academicYear.delete).toHaveBeenCalledWith({
        where: { id: academicYearA.id },
      });
    });

    it('maps a P2025 to not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearA.id,
        _count: { terms: 0, enrollments: 0 },
      });
      prisma.academicYear.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, academicYearA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
