import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { Gender, StudentStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: {
    student: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const studentA1 = {
    id: 'student-a1',
    admissionNumber: 'S-2026-001',
    firstName: 'Grace',
    middleName: 'Akello',
    lastName: 'Nakato',
    preferredName: null,
    gender: Gender.FEMALE,
    dateOfBirth: new Date('2014-03-12'),
    placeOfBirth: 'Kampala',
    nationality: 'Ugandan',
    religion: null,
    profilePhotoUrl: null,
    nationalId: null,
    birthCertificateNumber: 'BSC-2020-01234',
    phone: '+256712345678',
    email: 'grace.nakato@example.com',
    address: null,
    district: 'Kampala',
    municipality: null,
    village: null,
    status: StudentStatus.ACTIVE,
    schoolId: schoolA,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    admissionNumber: '  S-2026-001  ',
    firstName: '  Grace  ',
    lastName: '  Nakato  ',
    gender: Gender.FEMALE,
    dateOfBirth: '2014-03-12',
    email: '  GRACE.NAKATO@EXAMPLE.COM  ',
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StudentsService);
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
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it('rejects a date of birth in the future', async () => {
      await expect(
        service.create(schoolA, {
          ...createDto,
          dateOfBirth: '2999-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate admission number within the same school', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.student.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates the student scoped to the active school, never a client school id', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.student.create.mockResolvedValue(studentA1);

      const dto = { ...createDto, schoolId: schoolB } as never;

      const result = await service.create(schoolA, dto);

      expect(result.id).toBe('student-a1');
      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: { schoolId: schoolA, admissionNumber: 'S-2026-001' },
        select: { id: true },
      });
      const createData = prisma.student.create.mock.calls[0][0].data;
      expect(createData.schoolId).toBe(schoolA);
      expect(createData.schoolId).not.toBe(schoolB);
    });

    it('normalizes names and lowercases the email', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.student.create.mockResolvedValue(studentA1);

      await service.create(schoolA, createDto);

      const createData = prisma.student.create.mock.calls[0][0].data;
      expect(createData).toMatchObject({
        schoolId: schoolA,
        admissionNumber: 'S-2026-001',
        firstName: 'Grace',
        lastName: 'Nakato',
        email: 'grace.nakato@example.com',
        middleName: null,
        status: StudentStatus.ACTIVE,
      });
    });

    it('writes only editable fields', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.student.create.mockResolvedValue(studentA1);

      const dto = {
        ...createDto,
        id: 'forged-id',
        createdAt: new Date('2000-01-01'),
        schoolId: schoolB,
      } as never;

      await service.create(schoolA, dto);

      const createData = prisma.student.create.mock.calls[0][0].data;
      expect(createData).not.toHaveProperty('id');
      expect(createData).not.toHaveProperty('createdAt');
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.student.findMany).not.toHaveBeenCalled();
    });

    it('queries only the active school', async () => {
      prisma.student.findMany.mockResolvedValue([studentA1]);

      const result = await service.list(schoolA);

      expect(result).toEqual([studentA1]);
      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, studentA1.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.student.findFirst).not.toHaveBeenCalled();
    });

    it('returns a student of the active school', async () => {
      prisma.student.findFirst.mockResolvedValue(studentA1);

      const result = await service.get(schoolA, studentA1.id);

      expect(result).toEqual(studentA1);
      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: { id: studentA1.id, schoolId: schoolA },
        select: expect.any(Object),
      });
    });

    it('reports a student of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.get(schoolA, 'student-other'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: { id: 'student-other', schoolId: schoolA },
        select: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, studentA1.id, { firstName: 'Gracie' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.student.update).not.toHaveBeenCalled();
    });

    it('rejects a student of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'student-other', { firstName: 'Gracie' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.student.update).not.toHaveBeenCalled();
    });

    it('rejects a future date of birth on update', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });

      await expect(
        service.update(schoolA, studentA1.id, {
          dateOfBirth: '2999-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.student.update).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.student.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(schoolA, studentA1.id, {
          admissionNumber: 'S-2026-009',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 to not found', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.student.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, studentA1.id, { firstName: 'Gracie' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates only the record scoped to the active school', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.student.update.mockResolvedValue({
        ...studentA1,
        firstName: 'Gracie',
      });

      const dto = {
        firstName: 'Gracie',
        schoolId: schoolB,
        id: 'forged-id',
      } as never;

      const result = await service.update(schoolA, studentA1.id, dto);

      expect(result.firstName).toBe('Gracie');
      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: studentA1.id } }),
      );
      const updateData = prisma.student.update.mock.calls[0][0].data;
      expect(updateData).toEqual({ firstName: 'Gracie' });
      expect(updateData).not.toHaveProperty('schoolId');
      expect(updateData).not.toHaveProperty('id');
    });

    it('clears a nullable field with an explicit null', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.student.update.mockResolvedValue({
        ...studentA1,
        middleName: null,
      });

      await service.update(schoolA, studentA1.id, { middleName: null });

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { middleName: null } }),
      );
    });

    it('writes only provided editable fields', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.student.update.mockResolvedValue({
        ...studentA1,
        status: StudentStatus.INACTIVE,
      });

      await service.update(schoolA, studentA1.id, {
        status: StudentStatus.INACTIVE,
      });

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: StudentStatus.INACTIVE } }),
      );
    });
  });
});
