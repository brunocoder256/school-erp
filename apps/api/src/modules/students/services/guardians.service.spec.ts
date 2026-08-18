import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { GuardianRelationshipType } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { GuardiansService } from './guardians.service';

describe('GuardiansService', () => {
  let service: GuardiansService;
  let prisma: {
    $transaction: jest.Mock;
    student: {
      findFirst: jest.Mock;
    };
    guardian: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    studentGuardian: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const studentA1 = { id: 'student-a1', schoolId: schoolA };

  const guardianA1 = {
    id: 'guardian-a1',
    fullName: 'John Mukasa',
    phone: '+256712345678',
    alternatePhone: null,
    email: 'john.mukasa@example.com',
    address: null,
    occupation: 'Teacher',
    preferredContactMethod: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const guardianLinkA1 = {
    relationshipType: GuardianRelationshipType.FATHER,
    isPrimary: true,
    isEmergencyContact: false,
    isAuthorizedPickup: false,
    guardian: guardianA1,
  };

  const guardianResponseA1 = {
    id: guardianA1.id,
    fullName: guardianA1.fullName,
    phone: guardianA1.phone,
    alternatePhone: guardianA1.alternatePhone,
    email: guardianA1.email,
    address: guardianA1.address,
    occupation: guardianA1.occupation,
    preferredContactMethod: guardianA1.preferredContactMethod,
    relationshipType: GuardianRelationshipType.FATHER,
    isPrimary: true,
    isEmergencyContact: false,
    isAuthorizedPickup: false,
    createdAt: guardianA1.createdAt,
    updatedAt: guardianA1.updatedAt,
  };

  const createDto = {
    relationshipType: GuardianRelationshipType.FATHER,
    fullName: '  John Mukasa  ',
    phone: ' +256712345678 ',
    isPrimary: true,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(prisma),
      ),
      student: { findFirst: jest.fn() },
      guardian: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      studentGuardian: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuardiansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(GuardiansService);
  });

  function mockStudentInSchool() {
    prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
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
        service.create(null, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a student of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('reuses an existing guardian with the same name and phone in the school', async () => {
      mockStudentInSchool();
      prisma.guardian.findFirst.mockResolvedValue({ id: guardianA1.id });
      prisma.studentGuardian.create.mockResolvedValue(guardianLinkA1);

      const result = await service.create(schoolA, studentA1.id, createDto);

      expect(prisma.guardian.findFirst).toHaveBeenCalledWith({
        where: {
          schoolId: schoolA,
          fullName: 'John Mukasa',
          phone: '+256712345678',
        },
        select: { id: true },
      });
      expect(prisma.guardian.create).not.toHaveBeenCalled();
      expect(result).toEqual(guardianResponseA1);
    });

    it('creates a new guardian when none matches', async () => {
      mockStudentInSchool();
      prisma.guardian.findFirst.mockResolvedValue(null);
      prisma.guardian.create.mockResolvedValue({ id: guardianA1.id });
      prisma.studentGuardian.create.mockResolvedValue(guardianLinkA1);

      await service.create(schoolA, studentA1.id, createDto);

      expect(prisma.guardian.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            fullName: 'John Mukasa',
            phone: '+256712345678',
          }),
        }),
      );
    });

    it('never auto-reuses a guardian when no phone is supplied', async () => {
      mockStudentInSchool();
      prisma.guardian.create.mockResolvedValue({ id: guardianA1.id });
      prisma.studentGuardian.create.mockResolvedValue(guardianLinkA1);

      await service.create(schoolA, studentA1.id, {
        relationshipType: GuardianRelationshipType.MOTHER,
        fullName: 'Sarah Mukasa',
      });

      expect(prisma.guardian.findFirst).not.toHaveBeenCalled();
      expect(prisma.guardian.create).toHaveBeenCalledTimes(1);
    });

    it('unmarks other primary guardians of the student', async () => {
      mockStudentInSchool();
      prisma.guardian.findFirst.mockResolvedValue(null);
      prisma.guardian.create.mockResolvedValue({ id: guardianA1.id });
      prisma.studentGuardian.create.mockResolvedValue(guardianLinkA1);

      await service.create(schoolA, studentA1.id, createDto);

      expect(prisma.studentGuardian.updateMany).toHaveBeenCalledWith({
        where: { studentId: studentA1.id, guardianId: { not: guardianA1.id } },
        data: { isPrimary: false },
      });
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      mockStudentInSchool();
      prisma.guardian.findFirst.mockResolvedValue(null);
      prisma.guardian.create.mockResolvedValue({ id: guardianA1.id });
      prisma.studentGuardian.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('writes only editable fields', async () => {
      mockStudentInSchool();
      prisma.guardian.findFirst.mockResolvedValue(null);
      prisma.guardian.create.mockResolvedValue({ id: guardianA1.id });
      prisma.studentGuardian.create.mockResolvedValue(guardianLinkA1);

      await service.create(schoolA, studentA1.id, {
        ...createDto,
        schoolId: schoolB,
        studentId: 'forged-student',
      } as never);

      const guardianData = prisma.guardian.create.mock.calls[0][0].data;
      expect(guardianData.schoolId).toBe(schoolA);
      const linkData = prisma.studentGuardian.create.mock.calls[0][0].data;
      expect(linkData.studentId).toBe(studentA1.id);
    });
  });

  describe('listByStudent', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.listByStudent(null, studentA1.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.studentGuardian.findMany).not.toHaveBeenCalled();
    });

    it('rejects a student of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.listByStudent(schoolA, studentA1.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.studentGuardian.findMany).not.toHaveBeenCalled();
    });

    it('returns the joined guardian shapes', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findMany.mockResolvedValue([guardianLinkA1]);

      const result = await service.listByStudent(schoolA, studentA1.id);

      expect(result).toEqual([guardianResponseA1]);
      expect(prisma.studentGuardian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: studentA1.id },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, studentA1.id, guardianA1.id, {
          fullName: 'John Mukasa Jr.',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a student of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, studentA1.id, guardianA1.id, {
          fullName: 'John Mukasa Jr.',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a guardian not linked to the student as not found', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, studentA1.id, 'guardian-other', {
          fullName: 'John Mukasa Jr.',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('updates guardian and link fields', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findFirst
        .mockResolvedValueOnce({ id: 'link-1' })
        .mockResolvedValue({
          ...guardianLinkA1,
          guardian: { ...guardianA1, fullName: 'John Mukasa Jr.' },
        });
      prisma.guardian.update.mockResolvedValue({
        ...guardianA1,
        fullName: 'John Mukasa Jr.',
      });
      prisma.studentGuardian.update.mockResolvedValue({});

      await service.update(schoolA, studentA1.id, guardianA1.id, {
        fullName: '  John Mukasa Jr.  ',
      });

      expect(prisma.guardian.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: guardianA1.id },
          data: { fullName: 'John Mukasa Jr.' },
        }),
      );
      expect(prisma.studentGuardian.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'link-1' } }),
      );
    });

    it('unmarks other primary guardians when setting primary', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findFirst
        .mockResolvedValueOnce({ id: 'link-1' })
        .mockResolvedValue(guardianLinkA1);
      prisma.guardian.update.mockResolvedValue(guardianA1);
      prisma.studentGuardian.update.mockResolvedValue({});

      await service.update(schoolA, studentA1.id, guardianA1.id, {
        isPrimary: true,
      });

      expect(prisma.studentGuardian.updateMany).toHaveBeenCalledWith({
        where: { studentId: studentA1.id, guardianId: { not: guardianA1.id } },
        data: { isPrimary: false },
      });
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.delete(null, studentA1.id, guardianA1.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a guardian not linked to the student as not found', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(schoolA, studentA1.id, guardianA1.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deletes the link and leaves a still-linked guardian in place', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findFirst.mockResolvedValue({ id: 'link-1' });
      prisma.studentGuardian.delete.mockResolvedValue({});
      prisma.studentGuardian.count.mockResolvedValue(2);

      await service.delete(schoolA, studentA1.id, guardianA1.id);

      expect(prisma.studentGuardian.delete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      });
      expect(prisma.guardian.delete).not.toHaveBeenCalled();
    });

    it('deletes the guardian too when no links remain', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findFirst.mockResolvedValue({ id: 'link-1' });
      prisma.studentGuardian.delete.mockResolvedValue({});
      prisma.studentGuardian.count.mockResolvedValue(0);
      prisma.guardian.delete.mockResolvedValue({});

      await service.delete(schoolA, studentA1.id, guardianA1.id);

      expect(prisma.studentGuardian.count).toHaveBeenCalledWith({
        where: { guardianId: guardianA1.id },
      });
      expect(prisma.guardian.delete).toHaveBeenCalledWith({
        where: { id: guardianA1.id },
      });
    });

    it('ignores a P2025 race when deleting an orphaned guardian', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.studentGuardian.findFirst.mockResolvedValue({ id: 'link-1' });
      prisma.studentGuardian.delete.mockResolvedValue({});
      prisma.studentGuardian.count.mockResolvedValue(0);
      prisma.guardian.delete.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.delete(schoolA, studentA1.id, guardianA1.id),
      ).resolves.toBeUndefined();
    });
  });
});
