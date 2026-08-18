import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import {
  AdmissionType,
  BoardingStatus,
  EnrollmentStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let prisma: {
    student: {
      findFirst: jest.Mock;
    };
    academicYear: {
      findFirst: jest.Mock;
    };
    academicClass: {
      findFirst: jest.Mock;
    };
    stream: {
      findFirst: jest.Mock;
    };
    enrollment: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const studentA1 = { id: 'student-a1', schoolId: schoolA };
  const academicYearA = { id: 'ay-a', schoolId: schoolA };
  const classP7A = { id: 'class-p7a', schoolId: schoolA };
  const classS4B = { id: 'class-s4b', schoolId: schoolB };
  const streamEast = { id: 'stream-east', classId: classP7A.id };
  const streamB1 = { id: 'stream-b1', classId: classS4B.id };

  const enrollmentA1 = {
    id: 'enrollment-a1',
    studentId: studentA1.id,
    academicYearId: academicYearA.id,
    academicClassId: classP7A.id,
    streamId: streamEast.id,
    status: EnrollmentStatus.PENDING,
    enrollmentDate: new Date('2026-01-15'),
    admissionType: AdmissionType.NEW,
    previousSchool: null,
    previousClass: null,
    boardingStatus: BoardingStatus.DAY,
    house: null,
    remarks: null,
    withdrawalDate: null,
    withdrawalReason: null,
    completedDate: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  };

  const createDto = {
    academicYearId: academicYearA.id,
    academicClassId: classP7A.id,
    streamId: streamEast.id,
    enrollmentDate: '2026-01-15',
  };

  beforeEach(async () => {
    prisma = {
      student: { findFirst: jest.fn() },
      academicYear: { findFirst: jest.fn() },
      academicClass: { findFirst: jest.fn() },
      stream: { findFirst: jest.fn() },
      enrollment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EnrollmentsService);
  });

  function mockParentsInSchool() {
    prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
    prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearA.id });
    prisma.academicClass.findFirst.mockResolvedValue({ id: classP7A.id });
    prisma.stream.findFirst.mockResolvedValue({ id: streamEast.id });
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
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('rejects a student of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: { id: studentA1.id, schoolId: schoolA },
        select: { id: true },
      });
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('rejects an academic year of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('rejects an academic class of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearA.id });
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('rejects a stream that does not belong to the specified class', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearA.id });
      prisma.academicClass.findFirst.mockResolvedValue({ id: classP7A.id });
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, studentA1.id, {
          ...createDto,
          streamId: streamB1.id,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.stream.findFirst).toHaveBeenCalledWith({
        where: { id: streamB1.id, classId: classP7A.id },
        select: { id: true },
      });
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate enrollment for the same student and academic year', async () => {
      mockParentsInSchool();
      prisma.enrollment.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a conflict', async () => {
      mockParentsInSchool();
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2003 foreign key violation to a conflict', async () => {
      mockParentsInSchool();
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockRejectedValue(prismaError('P2003'));

      await expect(
        service.create(schoolA, studentA1.id, createDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the enrollment for the active school student', async () => {
      mockParentsInSchool();
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue(enrollmentA1);

      const dto = { ...createDto, schoolId: schoolB } as never;

      const result = await service.create(schoolA, studentA1.id, dto);

      expect(result.id).toBe('enrollment-a1');
      const createData = prisma.enrollment.create.mock.calls[0][0].data;
      expect(createData).toMatchObject({
        studentId: studentA1.id,
        academicYearId: academicYearA.id,
        academicClassId: classP7A.id,
        streamId: streamEast.id,
        status: EnrollmentStatus.PENDING,
        admissionType: AdmissionType.NEW,
      });
      expect(createData).not.toHaveProperty('schoolId');
    });

    it('writes null for absent optional fields', async () => {
      mockParentsInSchool();
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue(enrollmentA1);

      await service.create(schoolA, studentA1.id, {
        academicYearId: academicYearA.id,
        academicClassId: classP7A.id,
        enrollmentDate: '2026-01-15',
      });

      const createData = prisma.enrollment.create.mock.calls[0][0].data;
      expect(createData).toMatchObject({
        streamId: null,
        previousSchool: null,
        previousClass: null,
        boardingStatus: null,
        house: null,
        remarks: null,
      });
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null, studentA1.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
    });

    it('rejects a student of another school as not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.list(schoolA, studentA1.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
    });

    it('lists enrollments of the student', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentA1.id });
      prisma.enrollment.findMany.mockResolvedValue([enrollmentA1]);

      const result = await service.list(schoolA, studentA1.id);

      expect(result).toEqual([enrollmentA1]);
      expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
        where: { studentId: studentA1.id },
        select: expect.any(Object),
        orderBy: { enrollmentDate: 'desc' },
      });
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, enrollmentA1.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.enrollment.findFirst).not.toHaveBeenCalled();
    });

    it('returns an enrollment under a student of the active school', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(enrollmentA1);

      const result = await service.get(schoolA, enrollmentA1.id);

      expect(result).toEqual(enrollmentA1);
      expect(prisma.enrollment.findFirst).toHaveBeenCalledWith({
        where: { id: enrollmentA1.id, student: { schoolId: schoolA } },
        select: expect.any(Object),
      });
    });

    it('reports an enrollment of another school as not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.get(schoolA, 'enrollment-other'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, enrollmentA1.id, {
          status: EnrollmentStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.enrollment.update).not.toHaveBeenCalled();
    });

    it('rejects an enrollment of another school as not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, 'enrollment-other', {
          status: EnrollmentStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.enrollment.update).not.toHaveBeenCalled();
    });

    it('rejects a stream that does not belong to the enrollment class', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentA1.id,
        academicClassId: classP7A.id,
      });
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, enrollmentA1.id, {
          streamId: streamB1.id,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.enrollment.update).not.toHaveBeenCalled();
    });

    it('validates a new stream against the new class when the class changes', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentA1.id,
        academicClassId: classP7A.id,
      });
      prisma.academicClass.findFirst.mockResolvedValue({ id: classS4B.id });
      prisma.stream.findFirst.mockResolvedValue({ id: streamB1.id });
      prisma.enrollment.update.mockResolvedValue({
        ...enrollmentA1,
        academicClassId: classS4B.id,
        streamId: streamB1.id,
      });

      await service.update(schoolA, enrollmentA1.id, {
        academicClassId: classS4B.id,
        streamId: streamB1.id,
      });

      expect(prisma.stream.findFirst).toHaveBeenCalledWith({
        where: { id: streamB1.id, classId: classS4B.id },
        select: { id: true },
      });
      expect(prisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { academicClassId: classS4B.id, streamId: streamB1.id },
        }),
      );
    });

    it('clears the stream with an explicit null', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentA1.id,
        academicClassId: classP7A.id,
      });
      prisma.enrollment.update.mockResolvedValue({
        ...enrollmentA1,
        streamId: null,
      });

      await service.update(schoolA, enrollmentA1.id, { streamId: null });

      expect(prisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { streamId: null } }),
      );
    });

    it('maps a P2003 to a conflict', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentA1.id,
        academicClassId: classP7A.id,
      });
      prisma.enrollment.update.mockRejectedValue(prismaError('P2003'));

      await expect(
        service.update(schoolA, enrollmentA1.id, {
          status: EnrollmentStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a P2025 to not found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentA1.id,
        academicClassId: classP7A.id,
      });
      prisma.enrollment.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, enrollmentA1.id, {
          status: EnrollmentStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates only provided editable fields', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentA1.id,
        academicClassId: classP7A.id,
      });
      prisma.enrollment.update.mockResolvedValue({
        ...enrollmentA1,
        status: EnrollmentStatus.ACTIVE,
        house: 'Red House',
      });

      await service.update(schoolA, enrollmentA1.id, {
        status: EnrollmentStatus.ACTIVE,
        house: ' Red House ',
        studentId: 'forged-student',
        schoolId: schoolB,
      } as never);

      expect(prisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: EnrollmentStatus.ACTIVE, house: 'Red House' },
        }),
      );
      const updateData = prisma.enrollment.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('studentId');
      expect(updateData).not.toHaveProperty('schoolId');
    });
  });
});
