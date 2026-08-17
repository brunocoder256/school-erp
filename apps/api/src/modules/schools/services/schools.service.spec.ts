import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MembershipStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { SchoolsService } from './schools.service';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let prisma: {
    school: {
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    schoolMembership: {
      findUnique: jest.Mock;
    };
  };

  const userId = 'user-1';
  const schoolA = {
    id: 'school-a',
    name: 'School A',
    code: 'A',
    description: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
  const schoolB = { id: 'school-b', name: 'School B', code: 'B' };

  beforeEach(async () => {
    prisma = {
      school: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      schoolMembership: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SchoolsService);
  });

  function mockActiveMembership() {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
  }

  describe('getCurrentSchool', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.getCurrentSchool(userId, null),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.schoolMembership.findUnique).not.toHaveBeenCalled();
      expect(prisma.school.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a missing membership', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.getCurrentSchool(userId, schoolA.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.school.findUnique).not.toHaveBeenCalled();
    });

    it('rejects an inactive membership', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.INACTIVE,
      });

      await expect(
        service.getCurrentSchool(userId, schoolA.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.school.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a school that does not exist', async () => {
      mockActiveMembership();
      prisma.school.findUnique.mockResolvedValue(null);

      await expect(
        service.getCurrentSchool(userId, schoolA.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('looks up the school using only the active school id', async () => {
      mockActiveMembership();
      prisma.school.findUnique.mockResolvedValue(schoolA);

      const result = await service.getCurrentSchool(userId, schoolA.id);

      expect(result).toEqual(schoolA);
      expect(prisma.schoolMembership.findUnique).toHaveBeenCalledWith({
        where: { userId_schoolId: { userId, schoolId: schoolA.id } },
        select: { status: true },
      });
      expect(prisma.school.findUnique).toHaveBeenCalledWith({
        where: { id: schoolA.id },
        select: expect.any(Object),
      });
    });
  });

  describe('updateCurrentSchool', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.updateCurrentSchool(userId, null, { name: 'Renamed' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.school.update).not.toHaveBeenCalled();
    });

    it('rejects an inactive membership', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.INACTIVE,
      });

      await expect(
        service.updateCurrentSchool(userId, schoolA.id, { name: 'Renamed' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.school.update).not.toHaveBeenCalled();
    });

    it('rejects a school that does not exist', async () => {
      mockActiveMembership();
      prisma.school.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCurrentSchool(userId, schoolA.id, { name: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('targets the school using only the active school id, never a client value', async () => {
      mockActiveMembership();
      prisma.school.findUnique.mockResolvedValue(schoolA);
      prisma.school.update.mockResolvedValue({ ...schoolA, name: 'Renamed' });

      const dto = { schoolId: schoolB.id, name: 'Renamed' } as never;

      const result = await service.updateCurrentSchool(
        userId,
        schoolA.id,
        dto as Parameters<typeof service.updateCurrentSchool>[2],
      );

      expect(result.name).toBe('Renamed');
      expect(prisma.school.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: schoolA.id },
        }),
      );
      expect(prisma.school.update.mock.calls[0][0].where.id).not.toBe(
        schoolB.id,
      );
    });

    it('does not write forbidden or non-editable fields', async () => {
      mockActiveMembership();
      prisma.school.findUnique.mockResolvedValue(schoolA);
      prisma.school.update.mockResolvedValue({
        ...schoolA,
        name: 'Renamed',
        description: 'Updated description',
      });

      const dto = {
        name: 'Renamed',
        description: 'Updated description',
        id: 'forged-id',
        createdAt: new Date('2000-01-01'),
        updatedAt: new Date('2000-01-01'),
        code: 'FORGED',
      } as never;

      await service.updateCurrentSchool(
        userId,
        schoolA.id,
        dto as Parameters<typeof service.updateCurrentSchool>[2],
      );

      const updateData = prisma.school.update.mock.calls[0][0].data;
      expect(updateData).toEqual({
        name: 'Renamed',
        description: 'Updated description',
      });
      expect(updateData).not.toHaveProperty('id');
      expect(updateData).not.toHaveProperty('createdAt');
      expect(updateData).not.toHaveProperty('updatedAt');
      expect(updateData).not.toHaveProperty('code');
      expect(updateData).not.toHaveProperty('memberships');
      expect(updateData).not.toHaveProperty('roles');
    });

    it('writes only provided editable fields', async () => {
      mockActiveMembership();
      prisma.school.findUnique.mockResolvedValue(schoolA);
      prisma.school.update.mockResolvedValue({ ...schoolA, description: 'X' });

      await service.updateCurrentSchool(userId, schoolA.id, {
        description: 'X',
      });

      expect(prisma.school.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { description: 'X' },
        }),
      );
    });
  });

  describe('createSchool', () => {
    const dto: CreateSchoolDto = {
      name: 'Kampala Primary School',
      code: 'kla-p',
      description: 'Primary school in Kampala',
    };

    it('normalizes the code to uppercase', async () => {
      prisma.school.findUnique.mockResolvedValue(null);
      prisma.school.create.mockResolvedValue({
        ...schoolA,
        code: 'KLA-P',
        name: dto.name,
        description: dto.description,
      });

      await service.createSchool(dto);

      expect(prisma.school.findUnique).toHaveBeenCalledWith({
        where: { code: 'KLA-P' },
        select: { id: true },
      });
      expect(prisma.school.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'KLA-P' }),
        }),
      );
    });

    it('rejects a duplicate school code', async () => {
      prisma.school.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createSchool(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.school.create).not.toHaveBeenCalled();
    });

    it('creates a school without inventing memberships or roles', async () => {
      prisma.school.findUnique.mockResolvedValue(null);
      prisma.school.create.mockResolvedValue({
        id: 'school-new',
        name: dto.name,
        code: 'KLA-P',
        description: dto.description,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const result = await service.createSchool(dto);

      expect(result.id).toBe('school-new');
      const createData = prisma.school.create.mock.calls[0][0].data;
      expect(createData).toEqual({
        name: dto.name,
        code: 'KLA-P',
        description: dto.description,
      });
      expect(createData).not.toHaveProperty('memberships');
      expect(createData).not.toHaveProperty('userRoles');
    });
  });
});