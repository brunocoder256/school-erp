import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TeacherProfilesService } from './teacher-profiles.service';

describe('TeacherProfilesService', () => {
  let service: TeacherProfilesService;
  let prisma: {
    staff: { findFirst: jest.Mock };
    teacherProfile: {
      findFirst: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const profileA = {
    id: 'profile-a',
    staffId: 'staff-a',
    specialization: 'Physics',
    yearsOfExperience: 8,
    professionalQualification: 'B.Ed',
    registrationNumber: 'UNT-12345',
    registrationBody: 'Ministry of Education',
    registrationDate: '2015-01-01',
    registrationExpiryDate: null,
    registrationStatus: 'Registered',
    highestAcademicQualification: 'Bachelor of Education',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      staff: { findFirst: jest.fn() },
      teacherProfile: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherProfilesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TeacherProfilesService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, 'staff-a')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'staff-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.teacherProfile.findFirst).not.toHaveBeenCalled();
    });

    it('reports a missing profile as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherProfile.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'staff-a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the teacher profile of a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherProfile.findFirst.mockResolvedValue(profileA);

      const result = await service.get(schoolA, 'staff-a');

      expect(prisma.teacherProfile.findFirst).toHaveBeenCalledWith({
        where: { staffId: 'staff-a' },
        select: expect.any(Object),
      });
      expect(result.id).toBe(profileA.id);
    });
  });

  describe('upsert', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.upsert(null, 'staff-a', { yearsOfExperience: 3 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.teacherProfile.upsert).not.toHaveBeenCalled();
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.upsert(schoolA, 'staff-b', { yearsOfExperience: 3 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.teacherProfile.upsert).not.toHaveBeenCalled();
    });

    it('creates the profile on first write', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherProfile.upsert.mockResolvedValue({
        ...profileA,
        yearsOfExperience: 3,
      });

      const result = await service.upsert(schoolA, 'staff-a', {
        yearsOfExperience: 3,
      });

      expect(prisma.teacherProfile.upsert).toHaveBeenCalledWith({
        where: { staffId: 'staff-a' },
        create: {
          staff: { connect: { id: 'staff-a' } },
          specialization: null,
          yearsOfExperience: 3,
          professionalQualification: null,
          registrationNumber: null,
          registrationBody: null,
          registrationDate: null,
          registrationExpiryDate: null,
          registrationStatus: null,
          highestAcademicQualification: null,
        },
        update: { yearsOfExperience: 3 },
        select: expect.any(Object),
      });
      expect(result.yearsOfExperience).toBe(3);
    });

    it('updates only the supplied fields', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherProfile.upsert.mockResolvedValue(profileA);

      await service.upsert(schoolA, 'staff-a', {
        registrationNumber: 'UNT-99999',
        registrationStatus: 'Expired',
      });

      expect(prisma.teacherProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            registrationNumber: 'UNT-99999',
            registrationStatus: 'Expired',
          },
        }),
      );
    });

    it('maps a P2003 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
      prisma.teacherProfile.upsert.mockRejectedValue(prismaError('P2003'));

      await expect(
        service.upsert(schoolA, 'staff-a', { yearsOfExperience: 3 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});