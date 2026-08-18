import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { QualificationsService } from './qualifications.service';

describe('QualificationsService', () => {
  let service: QualificationsService;
  let prisma: {
    staff: { findFirst: jest.Mock };
    staffQualification: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const qualificationA = {
    id: 'qualification-a',
    staffId: 'staff-a',
    name: 'Bachelor of Science in Physics',
    institution: 'Makerere University',
    qualificationType: 'Degree',
    fieldOfStudy: 'Physics',
    awardDate: '2012-06-15',
    grade: 'Second Class Upper',
    certificateNumber: 'CERT-12345',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    name: 'Bachelor of Science in Physics',
    institution: 'Makerere University',
  };

  beforeEach(async () => {
    prisma = {
      staff: { findFirst: jest.fn() },
      staffQualification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(QualificationsService);
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
        service.create(null, 'staff-a', createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.staffQualification.create).not.toHaveBeenCalled();
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-b', createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffQualification.create).not.toHaveBeenCalled();
    });

    it('creates a qualification for a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.create.mockResolvedValue(qualificationA);

      const result = await service.create(schoolA, 'staff-a', createDto);

      expect(prisma.staffQualification.create).toHaveBeenCalledWith({
        data: {
          staffId: 'staff-a',
          name: 'Bachelor of Science in Physics',
          institution: 'Makerere University',
          qualificationType: null,
          fieldOfStudy: null,
          awardDate: null,
          grade: null,
          certificateNumber: null,
        },
        select: expect.any(Object),
      });
      expect(result.name).toBe(createDto.name);
    });

    it('maps a P2003 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.create.mockRejectedValue(prismaError('P2003'));

      await expect(
        service.create(schoolA, 'staff-a', createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
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

    it('lists qualifications of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.findMany.mockResolvedValue([qualificationA]);

      const result = await service.list(schoolA, 'staff-a');

      expect(prisma.staffQualification.findMany).toHaveBeenCalledWith({
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
        service.update(null, 'staff-a', qualificationA.id, { grade: 'First' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'staff-b', qualificationA.id, { grade: 'First' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffQualification.update).not.toHaveBeenCalled();
    });

    it('reports a qualification of another staff member as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'staff-a', qualificationA.id, { grade: 'First' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffQualification.update).not.toHaveBeenCalled();
    });

    it('updates a qualification of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.findFirst.mockResolvedValue({
        id: qualificationA.id,
      });
      prisma.staffQualification.update.mockResolvedValue({
        ...qualificationA,
        grade: 'First Class',
      });

      const result = await service.update(schoolA, 'staff-a', qualificationA.id, {
        grade: 'First Class',
      });

      expect(prisma.staffQualification.update).toHaveBeenCalledWith({
        where: { id: qualificationA.id },
        data: { grade: 'First Class' },
        select: expect.any(Object),
      });
      expect(result.grade).toBe('First Class');
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.findFirst.mockResolvedValue({
        id: qualificationA.id,
      });
      prisma.staffQualification.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, 'staff-a', qualificationA.id, { grade: 'First' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.delete(null, 'staff-a', qualificationA.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, 'staff-b', qualificationA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffQualification.delete).not.toHaveBeenCalled();
    });

    it('reports a qualification of another staff member as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, 'staff-a', qualificationA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staffQualification.delete).not.toHaveBeenCalled();
    });

    it('deletes a qualification of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.findFirst.mockResolvedValue({
        id: qualificationA.id,
      });
      prisma.staffQualification.delete.mockResolvedValue({});

      await service.delete(schoolA, 'staff-a', qualificationA.id);

      expect(prisma.staffQualification.delete).toHaveBeenCalledWith({
        where: { id: qualificationA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.staffQualification.findFirst.mockResolvedValue({
        id: qualificationA.id,
      });
      prisma.staffQualification.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, 'staff-a', qualificationA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});