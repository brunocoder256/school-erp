import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SubjectOfferingsService } from './subject-offerings.service';

describe('SubjectOfferingsService', () => {
  let service: SubjectOfferingsService;
  let prisma: {
    subject: { findFirst: jest.Mock };
    academicLevel: { findFirst: jest.Mock };
    academicYear: { findFirst: jest.Mock };
    subjectOffering: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const subjectA = { id: 'subject-a', code: 'PHY', schoolId: schoolA };
  const subjectB = { id: 'subject-b', code: 'PHY', schoolId: schoolB };
  const levelA = { id: 'level-a', code: 'S2', schoolId: schoolA };
  const levelB = { id: 'level-b', code: 'S2', schoolId: schoolB };
  const yearA = { id: 'year-a', code: '2026', schoolId: schoolA };
  const yearB = { id: 'year-b', code: '2026', schoolId: schoolB };

  const offeringA = {
    id: 'offering-a',
    isActive: true,
    schoolId: schoolA,
    subjectId: subjectA.id,
    academicLevelId: levelA.id,
    academicYearId: yearA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const offeringB = {
    id: 'offering-b',
    isActive: true,
    schoolId: schoolB,
    subjectId: subjectB.id,
    academicLevelId: levelB.id,
    academicYearId: yearB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    subjectId: subjectA.id,
    academicLevelId: levelA.id,
    academicYearId: yearA.id,
  };

  beforeEach(async () => {
    prisma = {
      subject: { findFirst: jest.fn() },
      academicLevel: { findFirst: jest.fn() },
      academicYear: { findFirst: jest.fn() },
      subjectOffering: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectOfferingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubjectOfferingsService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  function mockParentsInSchool() {
    prisma.subject.findFirst.mockResolvedValue(subjectA);
    prisma.academicLevel.findFirst.mockResolvedValue(levelA);
    prisma.academicYear.findFirst.mockResolvedValue(yearA);
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.create(null, createDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.subjectOffering.create).not.toHaveBeenCalled();
    });

    it('rejects a subject of another school as not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, subjectId: subjectB.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectOffering.create).not.toHaveBeenCalled();
    });

    it('rejects a level of another school as not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(subjectA);
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, academicLevelId: levelB.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectOffering.create).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(subjectA);
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, academicYearId: yearB.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectOffering.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate offering for the same subject, level and year', async () => {
      mockParentsInSchool();
      prisma.subjectOffering.findFirst.mockResolvedValue({ id: offeringA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subjectOffering.findFirst).toHaveBeenCalledWith({
        where: {
          schoolId: schoolA,
          subjectId: subjectA.id,
          academicLevelId: levelA.id,
          academicYearId: yearA.id,
        },
        select: { id: true },
      });
      expect(prisma.subjectOffering.create).not.toHaveBeenCalled();
    });

    it('creates an offering scoped to the active school', async () => {
      mockParentsInSchool();
      prisma.subjectOffering.findFirst.mockResolvedValue(null);
      prisma.subjectOffering.create.mockResolvedValue({
        ...offeringA,
        id: 'offering-c',
      });

      const result = await service.create(schoolA, createDto);

      expect(prisma.subjectOffering.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          subjectId: subjectA.id,
          academicLevelId: levelA.id,
          academicYearId: yearA.id,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result.subjectId).toBe(subjectA.id);
    });

    it('maps a P2002 race to a conflict', async () => {
      mockParentsInSchool();
      prisma.subjectOffering.findFirst.mockResolvedValue(null);
      prisma.subjectOffering.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a P2003 race to a conflict', async () => {
      mockParentsInSchool();
      prisma.subjectOffering.findFirst.mockResolvedValue(null);
      prisma.subjectOffering.create.mockRejectedValue(prismaError('P2003'));

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

    it('lists only offerings of the active school', async () => {
      prisma.subjectOffering.findMany.mockResolvedValue([offeringA]);

      const result = await service.list(schoolA);

      expect(prisma.subjectOffering.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(offeringA.id);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, offeringA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns an offering of the active school', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValue(offeringA);

      const result = await service.get(schoolA, offeringA.id);

      expect(prisma.subjectOffering.findFirst).toHaveBeenCalledWith({
        where: { id: offeringA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(offeringA.id);
    });

    it('reports an offering of another school as not found', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, offeringB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, offeringA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating an offering of another school as not found', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, offeringB.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectOffering.update).not.toHaveBeenCalled();
    });

    it('rejects a subject of another school as not found', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValue({
        id: offeringA.id,
        subjectId: subjectA.id,
        academicLevelId: levelA.id,
        academicYearId: yearA.id,
      });
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, offeringA.id, { subjectId: subjectB.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectOffering.update).not.toHaveBeenCalled();
    });

    it('rejects a change that collides with another offering', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValueOnce({
        id: offeringA.id,
        subjectId: subjectA.id,
        academicLevelId: levelA.id,
        academicYearId: yearA.id,
      });
      prisma.subjectOffering.findFirst.mockResolvedValueOnce({
        id: offeringB.id,
      });

      await expect(
        service.update(schoolA, offeringA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.subjectOffering.update).not.toHaveBeenCalled();
    });

    it('updates an offering of the active school', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValueOnce({
        id: offeringA.id,
        subjectId: subjectA.id,
        academicLevelId: levelA.id,
        academicYearId: yearA.id,
      });
      prisma.subjectOffering.findFirst.mockResolvedValueOnce({
        id: offeringA.id,
      });
      prisma.subjectOffering.update.mockResolvedValue({
        ...offeringA,
        isActive: false,
      });

      const result = await service.update(schoolA, offeringA.id, {
        isActive: false,
      });

      expect(prisma.subjectOffering.update).toHaveBeenCalledWith({
        where: { id: offeringA.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
      expect(result.isActive).toBe(false);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValueOnce({
        id: offeringA.id,
        subjectId: subjectA.id,
        academicLevelId: levelA.id,
        academicYearId: yearA.id,
      });
      prisma.subjectOffering.findFirst.mockResolvedValueOnce({
        id: offeringA.id,
      });
      prisma.subjectOffering.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, offeringA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, offeringA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting an offering of another school as not found', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, offeringB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes an offering of the active school', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValue({ id: offeringA.id });
      prisma.subjectOffering.delete.mockResolvedValue({});

      await service.delete(schoolA, offeringA.id);

      expect(prisma.subjectOffering.delete).toHaveBeenCalledWith({
        where: { id: offeringA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.subjectOffering.findFirst.mockResolvedValue({ id: offeringA.id });
      prisma.subjectOffering.delete.mockRejectedValue(prismaError('P2025'));

      await expect(service.delete(schoolA, offeringA.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});