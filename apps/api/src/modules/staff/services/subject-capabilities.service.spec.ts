import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SubjectCapabilitiesService } from './subject-capabilities.service';

describe('SubjectCapabilitiesService', () => {
  let service: SubjectCapabilitiesService;
  let prisma: {
    staff: { findFirst: jest.Mock };
    subject: { findFirst: jest.Mock };
    teacherSubjectCapability: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const capabilityA = {
    id: 'capability-a',
    staffId: 'staff-a',
    subjectId: 'subject-a',
    isPrimary: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = { subjectId: 'subject-a', isPrimary: true };

  beforeEach(async () => {
    prisma = {
      staff: { findFirst: jest.fn() },
      subject: { findFirst: jest.fn() },
      teacherSubjectCapability: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectCapabilitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubjectCapabilitiesService);
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
      expect(prisma.teacherSubjectCapability.create).not.toHaveBeenCalled();
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-b', createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teacherSubjectCapability.create).not.toHaveBeenCalled();
    });

    it('reports a subject of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, 'staff-a', { ...createDto, subjectId: 'subject-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teacherSubjectCapability.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate capability for the same subject', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-a' });
      prisma.teacherSubjectCapability.findFirst.mockResolvedValue({
        id: capabilityA.id,
      });

      await expect(service.create(schoolA, 'staff-a', createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.teacherSubjectCapability.create).not.toHaveBeenCalled();
    });

    it('creates a capability for a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-a' });
      prisma.teacherSubjectCapability.findFirst.mockResolvedValue(null);
      prisma.teacherSubjectCapability.create.mockResolvedValue(capabilityA);

      const result = await service.create(schoolA, 'staff-a', createDto);

      expect(prisma.teacherSubjectCapability.create).toHaveBeenCalledWith({
        data: {
          staffId: 'staff-a',
          subjectId: 'subject-a',
          isPrimary: true,
        },
        select: expect.any(Object),
      });
      expect(result.subjectId).toBe('subject-a');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-a' });
      prisma.teacherSubjectCapability.findFirst.mockResolvedValue(null);
      prisma.teacherSubjectCapability.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, 'staff-a', createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a P2003 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-a' });
      prisma.teacherSubjectCapability.findFirst.mockResolvedValue(null);
      prisma.teacherSubjectCapability.create.mockRejectedValue(prismaError('P2003'));

      await expect(service.create(schoolA, 'staff-a', createDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
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

    it('lists capabilities of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherSubjectCapability.findMany.mockResolvedValue([capabilityA]);

      const result = await service.list(schoolA, 'staff-a');

      expect(prisma.teacherSubjectCapability.findMany).toHaveBeenCalledWith({
        where: { staffId: 'staff-a' },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.delete(null, 'staff-a', capabilityA.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, 'staff-b', capabilityA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teacherSubjectCapability.delete).not.toHaveBeenCalled();
    });

    it('reports a capability of another staff member as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherSubjectCapability.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, 'staff-a', capabilityA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teacherSubjectCapability.delete).not.toHaveBeenCalled();
    });

    it('deletes a capability of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherSubjectCapability.findFirst.mockResolvedValue({
        id: capabilityA.id,
      });
      prisma.teacherSubjectCapability.delete.mockResolvedValue({});

      await service.delete(schoolA, 'staff-a', capabilityA.id);

      expect(prisma.teacherSubjectCapability.delete).toHaveBeenCalledWith({
        where: { id: capabilityA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherSubjectCapability.findFirst.mockResolvedValue({
        id: capabilityA.id,
      });
      prisma.teacherSubjectCapability.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, 'staff-a', capabilityA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});