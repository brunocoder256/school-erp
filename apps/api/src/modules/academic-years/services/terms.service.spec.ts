import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TermsService } from './terms.service';

describe('TermsService', () => {
  let service: TermsService;
  let prisma: {
    academicYear: {
      findFirst: jest.Mock;
    };
    term: {
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
    id: 'ay-a',
    name: '2026',
    schoolId: schoolA,
  };
  const academicYearB = {
    id: 'ay-b',
    name: '2026',
    schoolId: schoolB,
  };

  const termA1 = {
    id: 'term-a1',
    name: 'Term 1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    isActive: false,
    academicYearId: academicYearA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: '  Term 1  ',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
  };

  beforeEach(async () => {
    prisma = {
      academicYear: {
        findFirst: jest.fn(),
      },
      term: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TermsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TermsService);
  });

  function mockAcademicYearInSchool() {
    prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearA.id });
  }

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.create(null, academicYearA.id, createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.term.create).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent academic year as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'ay-unknown', createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.create).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, academicYearB.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.academicYear.findFirst).toHaveBeenCalledWith({
        where: { id: academicYearB.id, schoolId: schoolA },
        select: { id: true },
      });
      expect(prisma.term.create).not.toHaveBeenCalled();
    });

    it('rejects an end date before the start date', async () => {
      mockAcademicYearInSchool();

      await expect(
        service.create(schoolA, academicYearA.id, {
          ...createDto,
          startDate: '2026-03-31',
          endDate: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.term.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate term name within the academic year', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(schoolA, academicYearA.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.term.create).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue(null);
      prisma.term.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.create(schoolA, academicYearA.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the term under the verified academic year, never a client school id', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue(null);
      prisma.term.create.mockResolvedValue(termA1);

      const dto = { ...createDto, schoolId: schoolB } as never;

      const result = await service.create(schoolA, academicYearA.id, dto);

      expect(result.id).toBe('term-a1');
      expect(prisma.term.findFirst).toHaveBeenCalledWith({
        where: { academicYearId: academicYearA.id, name: 'Term 1' },
        select: { id: true },
      });
      expect(prisma.term.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            academicYearId: academicYearA.id,
            name: 'Term 1',
            isActive: false,
          }),
        }),
      );
      const createData = prisma.term.create.mock.calls[0][0].data;
      expect(createData).not.toHaveProperty('schoolId');
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, academicYearA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.term.findMany).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.list(schoolA, academicYearB.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.findMany).not.toHaveBeenCalled();
    });

    it('returns only terms of the verified academic year', async () => {
      mockAcademicYearInSchool();
      prisma.term.findMany.mockResolvedValue([termA1]);

      const result = await service.list(schoolA, academicYearA.id);

      expect(result).toEqual([termA1]);
      expect(prisma.term.findMany).toHaveBeenCalledWith({
        where: { academicYearId: academicYearA.id },
        select: expect.any(Object),
        orderBy: { startDate: 'asc' },
      });
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.get(null, academicYearA.id, termA1.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.term.findFirst).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.get(schoolA, academicYearB.id, termA1.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.findFirst).not.toHaveBeenCalled();
    });

    it('returns a term within the verified academic year', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue(termA1);

      const result = await service.get(schoolA, academicYearA.id, termA1.id);

      expect(result).toEqual(termA1);
      expect(prisma.term.findFirst).toHaveBeenCalledWith({
        where: { id: termA1.id, academicYearId: academicYearA.id },
        select: expect.any(Object),
      });
    });

    it('reports a term under a different academic year as not found', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue(null);

      await expect(
        service.get(schoolA, academicYearA.id, 'term-b1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.findFirst).toHaveBeenCalledWith({
        where: { id: 'term-b1', academicYearId: academicYearA.id },
        select: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, academicYearA.id, termA1.id, { name: 'Term 2' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.term.update).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, academicYearB.id, termA1.id, {
          name: 'Term 2',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.update).not.toHaveBeenCalled();
    });

    it('rejects a term of another academic year as not found', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, academicYearA.id, 'term-b1', {
          name: 'Term 2',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.update).not.toHaveBeenCalled();
    });

    it('rejects an invalid date range', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue({
        id: termA1.id,
        startDate: termA1.startDate,
        endDate: termA1.endDate,
      });

      await expect(
        service.update(schoolA, academicYearA.id, termA1.id, {
          endDate: '2020-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.term.update).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue({
        id: termA1.id,
        startDate: termA1.startDate,
        endDate: termA1.endDate,
      });
      prisma.term.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, academicYearA.id, termA1.id, {
          name: 'Term 2',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates only the term scoped to the verified academic year', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue({
        id: termA1.id,
        startDate: termA1.startDate,
        endDate: termA1.endDate,
      });
      prisma.term.update.mockResolvedValue({ ...termA1, name: 'Term 2' });

      const dto = {
        name: 'Term 2',
        schoolId: schoolB,
        academicYearId: 'forged-ay',
      } as never;

      const result = await service.update(
        schoolA,
        academicYearA.id,
        termA1.id,
        dto,
      );

      expect(result.name).toBe('Term 2');
      expect(prisma.term.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: termA1.id } }),
      );
      const updateData = prisma.term.update.mock.calls[0][0].data;
      expect(updateData).toEqual({ name: 'Term 2' });
      expect(updateData).not.toHaveProperty('schoolId');
      expect(updateData).not.toHaveProperty('academicYearId');
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.delete(null, academicYearA.id, termA1.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.term.delete).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, academicYearB.id, termA1.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.delete).not.toHaveBeenCalled();
    });

    it('rejects a term of another academic year as not found', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, academicYearA.id, 'term-b1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.term.findFirst).toHaveBeenCalledWith({
        where: { id: 'term-b1', academicYearId: academicYearA.id },
        select: { id: true },
      });
      expect(prisma.term.delete).not.toHaveBeenCalled();
    });

    it('deletes a term within the verified academic year', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue({ id: termA1.id });
      prisma.term.delete.mockResolvedValue(termA1);

      await service.delete(schoolA, academicYearA.id, termA1.id);

      expect(prisma.term.delete).toHaveBeenCalledWith({
        where: { id: termA1.id },
      });
    });

    it('maps a P2025 to not found', async () => {
      mockAcademicYearInSchool();
      prisma.term.findFirst.mockResolvedValue({ id: termA1.id });
      prisma.term.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, academicYearA.id, termA1.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
