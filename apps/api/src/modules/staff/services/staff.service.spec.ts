import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { MembershipStatus, StaffStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: {
    staff: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    staffCategory: { findFirst: jest.Mock };
    department: { findFirst: jest.Mock };
    staffPosition: { findFirst: jest.Mock };
    schoolMembership: { findUnique: jest.Mock };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const staffA = {
    id: 'staff-a',
    schoolId: schoolA,
    staffNumber: 'STF001',
    firstName: 'John',
    middleName: null,
    lastName: 'Okello',
    preferredName: null,
    email: null,
    phone: null,
    alternativePhone: null,
    dateOfBirth: null,
    gender: null,
    nationalId: null,
    address: null,
    employmentStatus: StaffStatus.ACTIVE,
    employmentType: null,
    joiningDate: null,
    leavingDate: null,
    notes: null,
    staffCategoryId: null,
    departmentId: null,
    positionId: null,
    userId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    staffNumber: 'STF001',
    firstName: 'John',
    lastName: 'Okello',
  };

  beforeEach(async () => {
    prisma = {
      staff: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      staffCategory: { findFirst: jest.fn() },
      department: { findFirst: jest.fn() },
      staffPosition: { findFirst: jest.fn() },
      schoolMembership: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StaffService);
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
      expect(prisma.staff.create).not.toHaveBeenCalled();
    });

    it('rejects a staff category of another school as not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, {
          ...createDto,
          staffCategoryId: 'category-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staff.create).not.toHaveBeenCalled();
    });

    it('rejects a department of another school as not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, departmentId: 'dept-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staff.create).not.toHaveBeenCalled();
    });

    it('rejects a position of another school as not found', async () => {
      prisma.staffCategory.findFirst.mockResolvedValue(null);
      prisma.department.findFirst.mockResolvedValue(null);
      prisma.staffPosition.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, positionId: 'position-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staff.create).not.toHaveBeenCalled();
    });

    it('rejects a linked user without an active school membership', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, userId: 'user-b' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staff.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate staff number within the school', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: staffA.id });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.staff.findFirst).toHaveBeenCalledWith({
        where: { schoolId: schoolA, staffNumber: 'STF001' },
        select: { id: true },
      });
      expect(prisma.staff.create).not.toHaveBeenCalled();
    });

    it('creates a staff member scoped to the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      prisma.staff.create.mockResolvedValue(staffA);

      const result = await service.create(schoolA, createDto);

      expect(prisma.staff.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          staffNumber: 'STF001',
          firstName: 'John',
          middleName: null,
          lastName: 'Okello',
          preferredName: null,
          email: null,
          phone: null,
          alternativePhone: null,
          dateOfBirth: null,
          gender: null,
          nationalId: null,
          address: null,
          employmentStatus: undefined,
          employmentType: null,
          joiningDate: null,
          leavingDate: null,
          notes: null,
          staffCategoryId: null,
          departmentId: null,
          positionId: null,
          userId: null,
        },
        select: expect.any(Object),
      });
      expect(result.staffNumber).toBe('STF001');
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      prisma.staff.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a P2003 race to a conflict', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);
      prisma.staff.create.mockRejectedValue(prismaError('P2003'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lists staff of the active school filtered by status and search', async () => {
      prisma.staff.findMany.mockResolvedValue([staffA]);

      const result = await service.list(schoolA, {
        status: StaffStatus.ACTIVE,
        search: 'John',
      });

      expect(prisma.staff.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: schoolA,
          employmentStatus: StaffStatus.ACTIVE,
          OR: [
            { firstName: { contains: 'John', mode: 'insensitive' } },
            { middleName: { contains: 'John', mode: 'insensitive' } },
            { lastName: { contains: 'John', mode: 'insensitive' } },
            { preferredName: { contains: 'John', mode: 'insensitive' } },
            { staffNumber: { contains: 'John', mode: 'insensitive' } },
          ],
        },
        select: expect.any(Object),
        orderBy: { firstName: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('filters by staff category and department when provided', async () => {
      prisma.staff.findMany.mockResolvedValue([]);

      await service.list(schoolA, {
        staffCategoryId: 'category-a',
        departmentId: 'dept-a',
      });

      expect(prisma.staff.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: schoolA,
          staffCategoryId: 'category-a',
          departmentId: 'dept-a',
        },
        select: expect.any(Object),
        orderBy: { firstName: 'asc' },
      });
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, staffA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValue(staffA);

      const result = await service.get(schoolA, staffA.id);

      expect(prisma.staff.findFirst).toHaveBeenCalledWith({
        where: { id: staffA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(staffA.id);
    });

    it('reports a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, 'staff-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.update(null, staffA.id, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports updating a staff member of another school as not found', async () => {
      prisma.staff.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'staff-b', { firstName: 'Jane' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.staff.update).not.toHaveBeenCalled();
    });

    it('rejects a linked user without an active school membership', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: staffA.id, staffNumber: staffA.staffNumber });
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.INVITED,
      });

      await expect(
        service.update(schoolA, staffA.id, { userId: 'user-b' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staff.update).not.toHaveBeenCalled();
    });

    it('rejects a staff number already used by another member of the school', async () => {
      prisma.staff.findFirst.mockResolvedValueOnce({
        id: staffA.id,
        staffNumber: staffA.staffNumber,
      });
      prisma.staff.findFirst.mockResolvedValueOnce({ id: 'staff-other' });

      await expect(
        service.update(schoolA, staffA.id, { staffNumber: 'STF002' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.staff.update).not.toHaveBeenCalled();
    });

    it('updates a staff member of the active school', async () => {
      prisma.staff.findFirst.mockResolvedValueOnce({
        id: staffA.id,
        staffNumber: staffA.staffNumber,
      });
      prisma.staff.findFirst.mockResolvedValueOnce(null);
      prisma.staff.update.mockResolvedValue({
        ...staffA,
        firstName: 'Jane',
        employmentStatus: StaffStatus.INACTIVE,
      });

      const result = await service.update(schoolA, staffA.id, {
        firstName: 'Jane',
        employmentStatus: StaffStatus.INACTIVE,
      });

      expect(prisma.staff.update).toHaveBeenCalledWith({
        where: { id: staffA.id },
        data: {
          firstName: 'Jane',
          employmentStatus: StaffStatus.INACTIVE,
        },
        select: expect.any(Object),
      });
      expect(result.firstName).toBe('Jane');
    });

    it('clears nullable relation links when an explicit null is supplied', async () => {
      prisma.staff.findFirst.mockResolvedValueOnce({
        id: staffA.id,
        staffNumber: staffA.staffNumber,
      });
      prisma.staff.findFirst.mockResolvedValueOnce(null);
      prisma.staff.update.mockResolvedValue({ ...staffA, departmentId: null });

      await service.update(schoolA, staffA.id, {
        departmentId: null,
        positionId: null,
      });

      expect(prisma.staff.update).toHaveBeenCalledWith({
        where: { id: staffA.id },
        data: {
          department: { disconnect: true },
          position: { disconnect: true },
        },
        select: expect.any(Object),
      });
    });

    it('connects validated relation links', async () => {
      prisma.staff.findFirst.mockResolvedValueOnce({
        id: staffA.id,
        staffNumber: staffA.staffNumber,
      });
      prisma.staff.findFirst.mockResolvedValueOnce(null);
      prisma.staffCategory.findFirst.mockResolvedValue({ id: 'category-a' });
      prisma.staff.update.mockResolvedValue({
        ...staffA,
        staffCategoryId: 'category-a',
      });

      await service.update(schoolA, staffA.id, {
        staffCategoryId: 'category-a',
      });

      expect(prisma.staff.update).toHaveBeenCalledWith({
        where: { id: staffA.id },
        data: {
          staffCategory: { connect: { id: 'category-a' } },
        },
        select: expect.any(Object),
      });
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.staff.findFirst.mockResolvedValueOnce({
        id: staffA.id,
        staffNumber: staffA.staffNumber,
      });
      prisma.staff.findFirst.mockResolvedValueOnce(null);
      prisma.staff.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, staffA.id, { staffNumber: 'STF002' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.staff.findFirst.mockResolvedValueOnce({
        id: staffA.id,
        staffNumber: staffA.staffNumber,
      });
      prisma.staff.findFirst.mockResolvedValueOnce(null);
      prisma.staff.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, staffA.id, { firstName: 'Jane' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});