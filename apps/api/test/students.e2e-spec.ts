import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Prisma } from '../generated/prisma/client';
import {
  AdmissionType,
  BoardingStatus,
  EnrollmentStatus,
  Gender,
  GuardianRelationshipType,
  MembershipStatus,
  RoleScope,
  StudentStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/identity/services/password.service';

type Scope = (typeof RoleScope)[keyof typeof RoleScope];
type MembershipStatusValue =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];
type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];
type GenderValue = (typeof Gender)[keyof typeof Gender];
type StudentStatusValue = (typeof StudentStatus)[keyof typeof StudentStatus];
type EnrollmentStatusValue =
  (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];
type AdmissionTypeValue = (typeof AdmissionType)[keyof typeof AdmissionType];
type BoardingStatusValue = (typeof BoardingStatus)[keyof typeof BoardingStatus];
type RelationshipTypeValue =
  (typeof GuardianRelationshipType)[keyof typeof GuardianRelationshipType];

type SchoolFixture = {
  id: string;
  name: string;
  code: string;
};

type AcademicYearFixture = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};

type AcademicClassFixture = {
  id: string;
  name: string;
  code: string;
  level: number;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};

type StreamFixture = {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  isActive: boolean;
  classId: string;
  createdAt: Date;
  updatedAt: Date;
};

type StudentFixture = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  gender: GenderValue;
  dateOfBirth: Date;
  placeOfBirth: string | null;
  nationality: string | null;
  religion: string | null;
  profilePhotoUrl: string | null;
  nationalId: string | null;
  birthCertificateNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  municipality: string | null;
  village: string | null;
  status: StudentStatusValue;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};

type EnrollmentFixture = {
  id: string;
  studentId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  status: EnrollmentStatusValue;
  enrollmentDate: Date;
  admissionType: AdmissionTypeValue;
  previousSchool: string | null;
  previousClass: string | null;
  boardingStatus: BoardingStatusValue | null;
  house: string | null;
  remarks: string | null;
  withdrawalDate: Date | null;
  withdrawalReason: string | null;
  completedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type GuardianFixture = {
  id: string;
  fullName: string;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  occupation: string | null;
  preferredContactMethod: string | null;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};

type StudentGuardianFixture = {
  id: string;
  relationshipType: RelationshipTypeValue;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  isAuthorizedPickup: boolean;
  createdAt: Date;
  studentId: string;
  guardianId: string;
};

type UserRoleFixture = {
  schoolId: string | null;
  roleName: string;
  roleScope: Scope;
  permissionKeys: string[];
};

type MembershipFixture = {
  schoolId: string;
  status: MembershipStatusValue;
  joinedAt: Date;
  school: SchoolFixture;
};

type UserFixture = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: UserStatusValue;
  memberships: MembershipFixture[];
  userRoles: UserRoleFixture[];
};

type Select = Record<string, true>;

function pick(select: Select | undefined, source: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (!select) {
    return out;
  }

  for (const key of Object.keys(select)) {
    if (key in source) {
      out[key] = source[key];
    }
  }

  return out;
}

function resolveGuardianLink(
  link: StudentGuardianFixture,
  guardians: GuardianFixture[],
) {
  const guardian = guardians.find((item) => item.id === link.guardianId);
  return {
    relationshipType: link.relationshipType,
    isPrimary: link.isPrimary,
    isEmergencyContact: link.isEmergencyContact,
    isAuthorizedPickup: link.isAuthorizedPickup,
    guardian: guardian ?? null,
  };
}

function createPrismaMock(
  getUsers: () => UserFixture[],
  getSchools: () => SchoolFixture[],
  getAcademicYears: () => AcademicYearFixture[],
  getStudents: () => StudentFixture[],
  getClasses: () => AcademicClassFixture[],
  getStreams: () => StreamFixture[],
  getEnrollments: () => EnrollmentFixture[],
  getGuardians: () => GuardianFixture[],
  getLinks: () => StudentGuardianFixture[],
) {
  const prisma = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prisma),
    ),
    user: {
      findUnique: jest.fn(
        async (args: {
          where: { email?: string; id?: string };
          include?: unknown;
          select?: Select;
        }) => {
          const users = getUsers();
          const user = args.where.email
            ? users.find((item) => item.email === args.where.email)
            : users.find((item) => item.id === args.where.id);

          if (!user) {
            return null;
          }

          if (args.select) {
            return pick(args.select, {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              status: user.status,
            });
          }

          return {
            ...user,
            memberships: user.memberships
              .filter(
                (membership) => membership.status === MembershipStatus.ACTIVE,
              )
              .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
              .map((membership) => ({
                schoolId: membership.schoolId,
                status: membership.status,
                school: membership.school,
              })),
          };
        },
      ),
    },
    schoolMembership: {
      findUnique: jest.fn(
        async (args: {
          where: { userId_schoolId: { userId: string; schoolId: string } };
          select?: Select;
        }) => {
          const users = getUsers();
          const { userId, schoolId } = args.where.userId_schoolId;
          const user = users.find((item) => item.id === userId);
          const membership = user?.memberships.find(
            (item) => item.schoolId === schoolId,
          );

          if (!membership) {
            return null;
          }

          return pick(args.select, {
            id: membership.schoolId,
            status: membership.status,
            joinedAt: membership.joinedAt,
          });
        },
      ),
    },
    userRole: {
      findMany: jest.fn(
        async (args: {
          where: {
            userId: string;
            OR?: Array<{
              schoolId: string | null;
              role: { scope: Scope };
            }>;
          };
          select?: Select;
        }) => {
          const users = getUsers();
          const user = users.find((item) => item.id === args.where.userId);

          if (!user) {
            return [];
          }

          const clauses = args.where.OR ?? [];

          return user.userRoles
            .filter((role) =>
              clauses.some(
                (clause) =>
                  clause.schoolId === role.schoolId &&
                  clause.role.scope === role.roleScope,
              ),
            )
            .map((role) => ({
              role: {
                name: role.roleName,
                rolePermissions: role.permissionKeys.map((key) => ({
                  permission: { key },
                })),
              },
            }));
        },
      ),
    },
    school: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => null),
      update: jest.fn(async () => null),
    },
    academicYear: {
      findFirst: jest.fn(
        async (args: {
          where: { id?: string; schoolId?: string; name?: string };
          select?: Select;
        }) => {
          const years = getAcademicYears();
          const year =
            years.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.schoolId
                  ? item.schoolId === args.where.schoolId
                  : true) &&
                (args.where.name ? item.name === args.where.name : true),
            ) ?? null;

          if (!year) {
            return null;
          }

          return pick(args.select, {
            id: year.id,
            name: year.name,
            startDate: year.startDate,
            endDate: year.endDate,
            isActive: year.isActive,
            schoolId: year.schoolId,
            createdAt: year.createdAt,
            updatedAt: year.updatedAt,
            _count: {
              terms: 0,
              enrollments: getEnrollments().filter(
                (e) => e.academicYearId === year.id,
              ).length,
            },
          });
        },
      ),
    },
    academicClass: {
      findFirst: jest.fn(
        async (args: {
          where: { id?: string; schoolId?: string };
          select?: Select;
        }) => {
          const classes = getClasses();
          const cls =
            classes.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.schoolId
                  ? item.schoolId === args.where.schoolId
                  : true),
            ) ?? null;

          if (!cls) {
            return null;
          }

          return pick(args.select, { id: cls.id });
        },
      ),
    },
    stream: {
      findFirst: jest.fn(
        async (args: {
          where: { id?: string; classId?: string };
          select?: Select;
        }) => {
          const streams = getStreams();
          const stream =
            streams.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.classId
                  ? item.classId === args.where.classId
                  : true),
            ) ?? null;

          if (!stream) {
            return null;
          }

          return pick(args.select, { id: stream.id });
        },
      ),
    },
    student: {
      findFirst: jest.fn(
        async (args: {
          where: {
            id?: string;
            schoolId?: string;
            admissionNumber?: string;
          };
          select?: Select;
        }) => {
          const students = getStudents();
          const student =
            students.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.schoolId
                  ? item.schoolId === args.where.schoolId
                  : true) &&
                (args.where.admissionNumber
                  ? item.admissionNumber === args.where.admissionNumber
                  : true),
            ) ?? null;

          if (!student) {
            return null;
          }

          return pick(args.select, {
            id: student.id,
            admissionNumber: student.admissionNumber,
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            preferredName: student.preferredName,
            gender: student.gender,
            dateOfBirth: student.dateOfBirth,
            placeOfBirth: student.placeOfBirth,
            nationality: student.nationality,
            religion: student.religion,
            profilePhotoUrl: student.profilePhotoUrl,
            nationalId: student.nationalId,
            birthCertificateNumber: student.birthCertificateNumber,
            phone: student.phone,
            email: student.email,
            address: student.address,
            district: student.district,
            municipality: student.municipality,
            village: student.village,
            status: student.status,
            schoolId: student.schoolId,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
          });
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { schoolId: string };
          select?: Select;
          orderBy?: unknown;
        }) => {
          return getStudents()
            .filter((item) => item.schoolId === args.where.schoolId)
            .map((item) =>
              pick(args.select, {
                id: item.id,
                admissionNumber: item.admissionNumber,
                firstName: item.firstName,
                middleName: item.middleName,
                lastName: item.lastName,
                preferredName: item.preferredName,
                gender: item.gender,
                dateOfBirth: item.dateOfBirth,
                placeOfBirth: item.placeOfBirth,
                nationality: item.nationality,
                religion: item.religion,
                profilePhotoUrl: item.profilePhotoUrl,
                nationalId: item.nationalId,
                birthCertificateNumber: item.birthCertificateNumber,
                phone: item.phone,
                email: item.email,
                address: item.address,
                district: item.district,
                municipality: item.municipality,
                village: item.village,
                status: item.status,
                schoolId: item.schoolId,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              }),
            );
        },
      ),
      create: jest.fn(
        async (args: {
          data: {
            schoolId: string;
            admissionNumber: string;
            firstName: string;
            lastName: string;
            gender: GenderValue;
            dateOfBirth: string;
            status: StudentStatusValue;
          };
          select?: Select;
        }) => {
          const students = getStudents();
          const duplicate = students.some(
            (item) =>
              item.schoolId === args.data.schoolId &&
              item.admissionNumber === args.data.admissionNumber,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          const student: StudentFixture = {
            id: '30000000-0000-4000-8000-000000000099',
            admissionNumber: args.data.admissionNumber,
            firstName: args.data.firstName,
            middleName: null,
            lastName: args.data.lastName,
            preferredName: null,
            gender: args.data.gender,
            dateOfBirth: new Date(args.data.dateOfBirth),
            placeOfBirth: null,
            nationality: null,
            religion: null,
            profilePhotoUrl: null,
            nationalId: null,
            birthCertificateNumber: null,
            phone: null,
            email: null,
            address: null,
            district: null,
            municipality: null,
            village: null,
            status: args.data.status,
            schoolId: args.data.schoolId,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          };

          students.push(student);

          return pick(args.select, {
            id: student.id,
            admissionNumber: student.admissionNumber,
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            preferredName: student.preferredName,
            gender: student.gender,
            dateOfBirth: student.dateOfBirth,
            placeOfBirth: student.placeOfBirth,
            nationality: student.nationality,
            religion: student.religion,
            profilePhotoUrl: student.profilePhotoUrl,
            nationalId: student.nationalId,
            birthCertificateNumber: student.birthCertificateNumber,
            phone: student.phone,
            email: student.email,
            address: student.address,
            district: student.district,
            municipality: student.municipality,
            village: student.village,
            status: student.status,
            schoolId: student.schoolId,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
          });
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<StudentFixture>;
          select?: Select;
        }) => {
          const students = getStudents();
          const student = students.find((item) => item.id === args.where.id);

          if (!student) {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: 'test',
            });
          }

          const admissionNumber =
            args.data.admissionNumber ?? student.admissionNumber;
          const duplicate = students.some(
            (item) =>
              item.id !== student.id &&
              item.schoolId === student.schoolId &&
              item.admissionNumber === admissionNumber,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          Object.assign(student, args.data);

          return pick(args.select, {
            id: student.id,
            admissionNumber: student.admissionNumber,
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            preferredName: student.preferredName,
            gender: student.gender,
            dateOfBirth: student.dateOfBirth,
            placeOfBirth: student.placeOfBirth,
            nationality: student.nationality,
            religion: student.religion,
            profilePhotoUrl: student.profilePhotoUrl,
            nationalId: student.nationalId,
            birthCertificateNumber: student.birthCertificateNumber,
            phone: student.phone,
            email: student.email,
            address: student.address,
            district: student.district,
            municipality: student.municipality,
            village: student.village,
            status: student.status,
            schoolId: student.schoolId,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
          });
        },
      ),
    },
    enrollment: {
      findFirst: jest.fn(
        async (args: {
          where: {
            id?: string;
            studentId?: string;
            academicYearId?: string;
            student?: { schoolId?: string };
          };
          select?: Select;
        }) => {
          const enrollments = getEnrollments();
          const enrollment =
            enrollments.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.studentId
                  ? item.studentId === args.where.studentId
                  : true) &&
                (args.where.academicYearId
                  ? item.academicYearId === args.where.academicYearId
                  : true) &&
                (args.where.student?.schoolId
                  ? getStudents().find((s) => s.id === item.studentId)
                      ?.schoolId === args.where.student.schoolId
                  : true),
            ) ?? null;

          if (!enrollment) {
            return null;
          }

          return pick(args.select, {
            id: enrollment.id,
            studentId: enrollment.studentId,
            academicYearId: enrollment.academicYearId,
            academicClassId: enrollment.academicClassId,
            streamId: enrollment.streamId,
            status: enrollment.status,
            enrollmentDate: enrollment.enrollmentDate,
            admissionType: enrollment.admissionType,
            previousSchool: enrollment.previousSchool,
            previousClass: enrollment.previousClass,
            boardingStatus: enrollment.boardingStatus,
            house: enrollment.house,
            remarks: enrollment.remarks,
            withdrawalDate: enrollment.withdrawalDate,
            withdrawalReason: enrollment.withdrawalReason,
            completedDate: enrollment.completedDate,
            createdAt: enrollment.createdAt,
            updatedAt: enrollment.updatedAt,
          });
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { studentId: string };
          select?: Select;
          orderBy?: unknown;
        }) => {
          return getEnrollments()
            .filter((item) => item.studentId === args.where.studentId)
            .map((item) =>
              pick(args.select, {
                id: item.id,
                studentId: item.studentId,
                academicYearId: item.academicYearId,
                academicClassId: item.academicClassId,
                streamId: item.streamId,
                status: item.status,
                enrollmentDate: item.enrollmentDate,
                admissionType: item.admissionType,
                previousSchool: item.previousSchool,
                previousClass: item.previousClass,
                boardingStatus: item.boardingStatus,
                house: item.house,
                remarks: item.remarks,
                withdrawalDate: item.withdrawalDate,
                withdrawalReason: item.withdrawalReason,
                completedDate: item.completedDate,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              }),
            );
        },
      ),
      create: jest.fn(
        async (args: {
          data: {
            studentId: string;
            academicYearId: string;
            academicClassId: string;
            streamId: string | null;
            status: EnrollmentStatusValue;
            enrollmentDate: string;
            admissionType: AdmissionTypeValue;
          };
          select?: Select;
        }) => {
          const enrollments = getEnrollments();
          const duplicate = enrollments.some(
            (item) =>
              item.studentId === args.data.studentId &&
              item.academicYearId === args.data.academicYearId,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          const enrollment: EnrollmentFixture = {
            id: '50000000-0000-4000-8000-000000000099',
            studentId: args.data.studentId,
            academicYearId: args.data.academicYearId,
            academicClassId: args.data.academicClassId,
            streamId: args.data.streamId,
            status: args.data.status,
            enrollmentDate: new Date(args.data.enrollmentDate),
            admissionType: args.data.admissionType,
            previousSchool: null,
            previousClass: null,
            boardingStatus: null,
            house: null,
            remarks: null,
            withdrawalDate: null,
            withdrawalReason: null,
            completedDate: null,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          };

          enrollments.push(enrollment);

          return pick(args.select, {
            id: enrollment.id,
            studentId: enrollment.studentId,
            academicYearId: enrollment.academicYearId,
            academicClassId: enrollment.academicClassId,
            streamId: enrollment.streamId,
            status: enrollment.status,
            enrollmentDate: enrollment.enrollmentDate,
            admissionType: enrollment.admissionType,
            previousSchool: enrollment.previousSchool,
            previousClass: enrollment.previousClass,
            boardingStatus: enrollment.boardingStatus,
            house: enrollment.house,
            remarks: enrollment.remarks,
            withdrawalDate: enrollment.withdrawalDate,
            withdrawalReason: enrollment.withdrawalReason,
            completedDate: enrollment.completedDate,
            createdAt: enrollment.createdAt,
            updatedAt: enrollment.updatedAt,
          });
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<EnrollmentFixture>;
          select?: Select;
        }) => {
          const enrollments = getEnrollments();
          const enrollment = enrollments.find(
            (item) => item.id === args.where.id,
          );

          if (!enrollment) {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: 'test',
            });
          }

          Object.assign(enrollment, args.data);

          return pick(args.select, {
            id: enrollment.id,
            studentId: enrollment.studentId,
            academicYearId: enrollment.academicYearId,
            academicClassId: enrollment.academicClassId,
            streamId: enrollment.streamId,
            status: enrollment.status,
            enrollmentDate: enrollment.enrollmentDate,
            admissionType: enrollment.admissionType,
            previousSchool: enrollment.previousSchool,
            previousClass: enrollment.previousClass,
            boardingStatus: enrollment.boardingStatus,
            house: enrollment.house,
            remarks: enrollment.remarks,
            withdrawalDate: enrollment.withdrawalDate,
            withdrawalReason: enrollment.withdrawalReason,
            completedDate: enrollment.completedDate,
            createdAt: enrollment.createdAt,
            updatedAt: enrollment.updatedAt,
          });
        },
      ),
    },
    guardian: {
      findFirst: jest.fn(
        async (args: {
          where: {
            id?: string;
            schoolId?: string;
            fullName?: string;
            phone?: string;
          };
          select?: Select;
        }) => {
          const guardians = getGuardians();
          const guardian =
            guardians.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.schoolId
                  ? item.schoolId === args.where.schoolId
                  : true) &&
                (args.where.fullName
                  ? item.fullName === args.where.fullName
                  : true) &&
                (args.where.phone ? item.phone === args.where.phone : true),
            ) ?? null;

          if (!guardian) {
            return null;
          }

          return pick(args.select, {
            id: guardian.id,
            fullName: guardian.fullName,
            phone: guardian.phone,
            alternatePhone: guardian.alternatePhone,
            email: guardian.email,
            address: guardian.address,
            occupation: guardian.occupation,
            preferredContactMethod: guardian.preferredContactMethod,
            schoolId: guardian.schoolId,
            createdAt: guardian.createdAt,
            updatedAt: guardian.updatedAt,
          });
        },
      ),
      create: jest.fn(
        async (args: {
          data: {
            schoolId: string;
            fullName: string;
            phone: string | null;
          };
          select?: Select;
        }) => {
          const guardian: GuardianFixture = {
            id: '60000000-0000-4000-8000-000000000099',
            fullName: args.data.fullName,
            phone: args.data.phone,
            alternatePhone: null,
            email: null,
            address: null,
            occupation: null,
            preferredContactMethod: null,
            schoolId: args.data.schoolId,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          };

          getGuardians().push(guardian);

          return pick(args.select, {
            id: guardian.id,
            fullName: guardian.fullName,
            phone: guardian.phone,
            alternatePhone: guardian.alternatePhone,
            email: guardian.email,
            address: guardian.address,
            occupation: guardian.occupation,
            preferredContactMethod: guardian.preferredContactMethod,
            schoolId: guardian.schoolId,
            createdAt: guardian.createdAt,
            updatedAt: guardian.updatedAt,
          });
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<GuardianFixture>;
        }) => {
          const guardians = getGuardians();
          const guardian = guardians.find((item) => item.id === args.where.id);

          if (!guardian) {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: 'test',
            });
          }

          Object.assign(guardian, args.data);

          return {};
        },
      ),
      delete: jest.fn(async (args: { where: { id: string } }) => {
        const guardians = getGuardians();
        const index = guardians.findIndex((item) => item.id === args.where.id);

        if (index === -1) {
          throw new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: 'test',
          });
        }

        guardians.splice(index, 1);

        return {};
      }),
    },
    studentGuardian: {
      findFirst: jest.fn(
        async (args: {
          where: {
            id?: string;
            studentId?: string;
            guardianId?: string;
            guardian?: { schoolId?: string };
          };
          select?: Select;
        }) => {
          const links = getLinks();
          const link =
            links.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.studentId
                  ? item.studentId === args.where.studentId
                  : true) &&
                (args.where.guardianId
                  ? item.guardianId === args.where.guardianId
                  : true) &&
                (args.where.guardian?.schoolId
                  ? getGuardians().find((g) => g.id === item.guardianId)
                      ?.schoolId === args.where.guardian.schoolId
                  : true),
            ) ?? null;

          if (!link) {
            return null;
          }

          if (args.select && 'guardian' in args.select) {
            return resolveGuardianLink(link, getGuardians());
          }

          return pick(args.select, { id: link.id });
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { studentId: string };
          select?: Select;
          orderBy?: unknown;
        }) => {
          return getLinks()
            .filter((item) => item.studentId === args.where.studentId)
            .map((item) => resolveGuardianLink(item, getGuardians()));
        },
      ),
      create: jest.fn(
        async (args: {
          data: {
            studentId: string;
            guardianId: string;
            relationshipType: RelationshipTypeValue;
            isPrimary: boolean;
            isEmergencyContact: boolean;
            isAuthorizedPickup: boolean;
          };
          select?: Select;
        }) => {
          const links = getLinks();
          const duplicate = links.some(
            (item) =>
              item.studentId === args.data.studentId &&
              item.guardianId === args.data.guardianId,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          const link: StudentGuardianFixture = {
            id: '61000000-0000-4000-8000-000000000099',
            relationshipType: args.data.relationshipType,
            isPrimary: args.data.isPrimary,
            isEmergencyContact: args.data.isEmergencyContact,
            isAuthorizedPickup: args.data.isAuthorizedPickup,
            createdAt: new Date('2026-01-01'),
            studentId: args.data.studentId,
            guardianId: args.data.guardianId,
          };

          links.push(link);

          return resolveGuardianLink(link, getGuardians());
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<StudentGuardianFixture>;
        }) => {
          const links = getLinks();
          const link = links.find((item) => item.id === args.where.id);

          if (!link) {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: 'test',
            });
          }

          Object.assign(link, args.data);

          return {};
        },
      ),
      updateMany: jest.fn(
        async (args: {
          where: {
            studentId: string;
            guardianId?: { not?: string };
          };
          data: Partial<StudentGuardianFixture>;
        }) => {
          const links = getLinks();
          let count = 0;

          for (const link of links) {
            if (link.studentId !== args.where.studentId) {
              continue;
            }

            if (
              args.where.guardianId?.not &&
              link.guardianId === args.where.guardianId.not
            ) {
              continue;
            }

            Object.assign(link, args.data);
            count += 1;
          }

          return { count };
        },
      ),
      delete: jest.fn(async (args: { where: { id: string } }) => {
        const links = getLinks();
        const index = links.findIndex((item) => item.id === args.where.id);

        if (index === -1) {
          throw new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: 'test',
          });
        }

        links.splice(index, 1);

        return {};
      }),
      count: jest.fn(async (args: { where: { guardianId: string } }) => {
        return getLinks().filter(
          (item) => item.guardianId === args.where.guardianId,
        ).length;
      }),
    },
  };

  return prisma;
}

describe('Students, Enrollments and Guardians (e2e)', () => {
  let app: INestApplication<App>;
  let users: UserFixture[];
  let schools: SchoolFixture[];
  let academicYears: AcademicYearFixture[];
  let students: StudentFixture[];
  let classes: AcademicClassFixture[];
  let streams: StreamFixture[];
  let enrollments: EnrollmentFixture[];
  let guardians: GuardianFixture[];
  let links: StudentGuardianFixture[];
  let passwordHash: string;

  const schoolA: SchoolFixture = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Kampala Primary',
    code: 'KLA-P',
  };
  const schoolB: SchoolFixture = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Entebbe Secondary',
    code: 'EBB-S',
  };

  const ayA1: AcademicYearFixture = {
    id: '10000000-0000-4000-8000-000000000001',
    name: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: false,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const ayA2: AcademicYearFixture = {
    id: '10000000-0000-4000-8000-000000000002',
    name: '2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    isActive: false,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const ayB1: AcademicYearFixture = {
    id: '10000000-0000-4000-8000-000000000003',
    name: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: false,
    schoolId: schoolB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const classP7A: AcademicClassFixture = {
    id: '40000000-0000-4000-8000-000000000001',
    name: 'Primary 7',
    code: 'P7',
    level: 7,
    description: null,
    isActive: true,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const classS4B: AcademicClassFixture = {
    id: '40000000-0000-4000-8000-000000000002',
    name: 'Senior 4',
    code: 'S4',
    level: 4,
    description: null,
    isActive: true,
    schoolId: schoolB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const streamEast: StreamFixture = {
    id: '41000000-0000-4000-8000-000000000001',
    name: 'East',
    code: 'EAST',
    capacity: null,
    isActive: true,
    classId: classP7A.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const streamWest: StreamFixture = {
    id: '41000000-0000-4000-8000-000000000002',
    name: 'West',
    code: 'WEST',
    capacity: null,
    isActive: true,
    classId: classP7A.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const streamB1: StreamFixture = {
    id: '41000000-0000-4000-8000-000000000003',
    name: 'Stream 1',
    code: 'S1',
    capacity: null,
    isActive: true,
    classId: classS4B.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const studentA1: StudentFixture = {
    id: '30000000-0000-4000-8000-000000000001',
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
    birthCertificateNumber: null,
    phone: '+256712345678',
    email: 'grace.nakato@example.com',
    address: null,
    district: 'Kampala',
    municipality: null,
    village: null,
    status: StudentStatus.ACTIVE,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const studentA2: StudentFixture = {
    id: '30000000-0000-4000-8000-000000000002',
    admissionNumber: 'S-2026-002',
    firstName: 'John',
    middleName: null,
    lastName: 'Okello',
    preferredName: null,
    gender: Gender.MALE,
    dateOfBirth: new Date('2013-07-01'),
    placeOfBirth: null,
    nationality: 'Ugandan',
    religion: null,
    profilePhotoUrl: null,
    nationalId: null,
    birthCertificateNumber: null,
    phone: null,
    email: null,
    address: null,
    district: null,
    municipality: null,
    village: null,
    status: StudentStatus.ACTIVE,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const studentB1: StudentFixture = {
    id: '30000000-0000-4000-8000-000000000003',
    admissionNumber: 'S-2026-101',
    firstName: 'Sarah',
    middleName: null,
    lastName: 'Achieng',
    preferredName: null,
    gender: Gender.FEMALE,
    dateOfBirth: new Date('2009-02-20'),
    placeOfBirth: null,
    nationality: 'Ugandan',
    religion: null,
    profilePhotoUrl: null,
    nationalId: null,
    birthCertificateNumber: null,
    phone: null,
    email: null,
    address: null,
    district: null,
    municipality: null,
    village: null,
    status: StudentStatus.ACTIVE,
    schoolId: schoolB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const enrollmentA1: EnrollmentFixture = {
    id: '50000000-0000-4000-8000-000000000001',
    studentId: studentA1.id,
    academicYearId: ayA1.id,
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

  const guardianA1: GuardianFixture = {
    id: '60000000-0000-4000-8000-000000000001',
    fullName: 'John Mukasa',
    phone: '+256712345678',
    alternatePhone: null,
    email: 'john.mukasa@example.com',
    address: null,
    occupation: 'Teacher',
    preferredContactMethod: null,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const guardianA2: GuardianFixture = {
    id: '60000000-0000-4000-8000-000000000002',
    fullName: 'Sarah Mukasa',
    phone: '+256700000001',
    alternatePhone: null,
    email: null,
    address: null,
    occupation: null,
    preferredContactMethod: null,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const guardianB1: GuardianFixture = {
    id: '60000000-0000-4000-8000-000000000003',
    fullName: 'Peter Bwogi',
    phone: '+256777000001',
    alternatePhone: null,
    email: null,
    address: null,
    occupation: null,
    preferredContactMethod: null,
    schoolId: schoolB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const linkA1: StudentGuardianFixture = {
    id: '61000000-0000-4000-8000-000000000001',
    relationshipType: GuardianRelationshipType.FATHER,
    isPrimary: true,
    isEmergencyContact: false,
    isAuthorizedPickup: false,
    createdAt: new Date('2026-01-01'),
    studentId: studentA1.id,
    guardianId: guardianA1.id,
  };
  const linkA2: StudentGuardianFixture = {
    id: '61000000-0000-4000-8000-000000000002',
    relationshipType: GuardianRelationshipType.MOTHER,
    isPrimary: false,
    isEmergencyContact: true,
    isAuthorizedPickup: false,
    createdAt: new Date('2026-01-01'),
    studentId: studentA1.id,
    guardianId: guardianA2.id,
  };

  const password = 'SecurePass123!';

  const studentAdminKeys = [
    'students.read',
    'students.create',
    'students.update',
    'students.delete',
  ];

  function member(
    school: SchoolFixture,
    status: MembershipStatusValue,
    joinedAt: Date,
  ): MembershipFixture {
    return {
      schoolId: school.id,
      status,
      joinedAt,
      school,
    };
  }

  beforeAll(async () => {
    passwordHash = await new PasswordService().hash(password);
  });

  beforeEach(async () => {
    schools = [schoolA, schoolB];
    academicYears = [{ ...ayA1 }, { ...ayA2 }, { ...ayB1 }];
    classes = [{ ...classP7A }, { ...classS4B }];
    streams = [{ ...streamEast }, { ...streamWest }, { ...streamB1 }];
    students = [{ ...studentA1 }, { ...studentA2 }, { ...studentB1 }];
    enrollments = [{ ...enrollmentA1 }];
    guardians = [{ ...guardianA1 }, { ...guardianA2 }, { ...guardianB1 }];
    links = [{ ...linkA1 }, { ...linkA2 }];

    users = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'admin-a@school.example',
        fullName: 'Admin A',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'SCHOOL_ADMIN',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: studentAdminKeys,
          },
        ],
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        email: 'admin-ab@school.example',
        fullName: 'Admin A and B',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
          member(schoolB, MembershipStatus.ACTIVE, new Date('2024-02-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'SCHOOL_ADMIN',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: studentAdminKeys,
          },
          {
            schoolId: schoolB.id,
            roleName: 'SCHOOL_ADMIN',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: studentAdminKeys,
          },
        ],
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        email: 'teacher-a@school.example',
        fullName: 'Teacher A',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'TEACHER',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: ['students.read'],
          },
        ],
      },
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        email: 'no-perms@school.example',
        fullName: 'No Permissions User',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'STUDENT',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: [],
          },
        ],
      },
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        email: 'super@platform.example',
        fullName: 'Platform Super Admin',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [],
        userRoles: [
          {
            schoolId: null,
            roleName: 'SUPER_ADMIN',
            roleScope: RoleScope.SYSTEM,
            permissionKeys: studentAdminKeys,
          },
        ],
      },
    ];

    const prismaMock = createPrismaMock(
      () => users,
      () => schools,
      () => academicYears,
      () => students,
      () => classes,
      () => streams,
      () => enrollments,
      () => guardians,
      () => links,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function loginAs(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.accessToken as string;
  }

  async function selectSchool(token: string, schoolId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/select-school')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolId })
      .expect(201);

    return response.body.accessToken as string;
  }

  const studentPayload = {
    admissionNumber: 'S-2026-050',
    firstName: 'Peter',
    lastName: 'Wasswa',
    gender: Gender.MALE,
    dateOfBirth: '2013-06-15',
  };

  describe('authentication', () => {
    it('rejects GET /students without a JWT', async () => {
      await request(app.getHttpServer()).get('/api/v1/students').expect(401);
    });

    it('rejects POST /students without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .send(studentPayload)
        .expect(401);
    });

    it('rejects POST enrollments without a JWT', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .send({
          academicYearId: ayA1.id,
          academicClassId: classP7A.id,
          enrollmentDate: '2026-01-15',
        })
        .expect(401);
    });

    it('rejects POST guardians without a JWT', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/guardians`)
        .send({
          relationshipType: GuardianRelationshipType.FATHER,
          fullName: 'John Mukasa',
        })
        .expect(401);
    });
  });

  describe('authorization', () => {
    it('allows GET /students with students.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects GET /students without students.read', async () => {
      const token = await loginAs('no-perms@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects POST /students without students.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentPayload)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects PATCH /students/:id without students.update', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/students/${studentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });

    it('allows GET enrollments with students.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects POST enrollments without students.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: ayA1.id,
          academicClassId: classP7A.id,
          enrollmentDate: '2026-01-15',
        })
        .expect(403);
    });

    it('allows GET guardians with students.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects POST guardians without students.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          relationshipType: GuardianRelationshipType.FATHER,
          fullName: 'New Person',
        })
        .expect(403);
    });

    it('rejects PATCH guardians without students.update', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/students/${studentA1.id}/guardians/${guardianA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isPrimary: false })
        .expect(403);
    });

    it('rejects DELETE guardians without students.update', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/students/${studentA1.id}/guardians/${guardianA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('allows GET /enrollments/:id with students.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(enrollmentA1.id);
    });

    it('rejects PATCH /enrollments/:id without students.update', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: EnrollmentStatus.ACTIVE })
        .expect(403);
    });
  });

  describe('no active school context', () => {
    it('rejects school-scoped operations without an active school context', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('student CRUD', () => {
    it('creates a student scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentPayload)
        .expect(201);

      expect(response.body.admissionNumber).toBe('S-2026-050');
      expect(response.body.firstName).toBe('Peter');
      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body.schoolId).not.toBe(schoolB.id);
      expect(response.body.status).toBe(StudentStatus.ACTIVE);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate admission number within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...studentPayload,
          admissionNumber: 'S-2026-001',
        })
        .expect(409);

      expect(response.body.message).toBe(
        'A student with this admission number already exists in this school.',
      );
    });

    it('rejects a date of birth in the future', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...studentPayload, dateOfBirth: '2999-01-01' })
        .expect(400);
    });

    it('rejects a client-supplied school id (forbidden field)', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...studentPayload, schoolId: schoolB.id })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('lists only students of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([studentA1.id, studentA2.id]));
      expect(ids).not.toContain(studentB1.id);
    });

    it('lists only students of the selected school for a multi-school user', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenB = await selectSchool(loginToken, schoolB.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(studentB1.id);
      expect(ids).not.toContain(studentA1.id);
    });

    it('gets a student of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(studentA1.id);
      expect(response.body.firstName).toBe('Grace');
    });

    it('reports a student of another school as not found', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenB = await selectSchool(loginToken, schoolB.id);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      expect(response.body.message).toBe('Student not found.');
    });

    it('rejects a malformed student id', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/students/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('updates a student of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/students/${studentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Gracie', middleName: null })
        .expect(200);

      expect(response.body.firstName).toBe('Gracie');
      expect(response.body.middleName).toBeNull();
    });

    it('rejects updating a student of another school as not found', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenB = await selectSchool(loginToken, schoolB.id);

      await request(app.getHttpServer())
        .patch(`/api/v1/students/${studentA1.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ firstName: 'Hacked' })
        .expect(404);
    });
  });

  describe('enrollments', () => {
    it('creates an enrollment for a student of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: ayA2.id,
          academicClassId: classP7A.id,
          streamId: streamWest.id,
          enrollmentDate: '2025-01-15',
        })
        .expect(201);

      expect(response.body.studentId).toBe(studentA1.id);
      expect(response.body.academicYearId).toBe(ayA2.id);
      expect(response.body.streamId).toBe(streamWest.id);
      expect(response.body.status).toBe(EnrollmentStatus.PENDING);
    });

    it('rejects a duplicate enrollment for the same student and academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: ayA1.id,
          academicClassId: classP7A.id,
          enrollmentDate: '2026-01-15',
        })
        .expect(409);

      expect(response.body.message).toBe(
        'This student is already enrolled for the academic year.',
      );
    });

    it('rejects an academic year of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: ayB1.id,
          academicClassId: classP7A.id,
          enrollmentDate: '2026-01-15',
        })
        .expect(404);
    });

    it('rejects an academic class of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: ayA1.id,
          academicClassId: classS4B.id,
          enrollmentDate: '2026-01-15',
        })
        .expect(404);
    });

    it('rejects a stream that does not belong to the specified class', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: ayA2.id,
          academicClassId: classP7A.id,
          streamId: streamB1.id,
          enrollmentDate: '2025-01-15',
        })
        .expect(400);
    });

    it('rejects enrolling a student of another school as not found', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenB = await selectSchool(loginToken, schoolB.id);

      await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          academicYearId: ayB1.id,
          academicClassId: classS4B.id,
          enrollmentDate: '2026-01-15',
        })
        .expect(404);
    });

    it('lists enrollments of a student', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(enrollmentA1.id);
    });

    it('gets an enrollment of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(enrollmentA1.id);
      expect(response.body.studentId).toBe(studentA1.id);
    });

    it('reports an enrollment of another school as not found', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenB = await selectSchool(loginToken, schoolB.id);

      await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentA1.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('updates an enrollment of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: EnrollmentStatus.ACTIVE,
          streamId: streamWest.id,
        })
        .expect(200);

      expect(response.body.status).toBe(EnrollmentStatus.ACTIVE);
      expect(response.body.streamId).toBe(streamWest.id);
    });

    it('rejects a stream that does not belong to the enrollment class on update', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ streamId: streamB1.id })
        .expect(400);
    });

    it('clears the stream with an explicit null', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/enrollments/${enrollmentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ streamId: null })
        .expect(200);

      expect(response.body.streamId).toBeNull();
    });
  });

  describe('guardians', () => {
    it('creates a guardian linked to a student of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA2.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          relationshipType: GuardianRelationshipType.GUARDIAN,
          fullName: 'Rita Namuli',
          phone: '+256700123456',
          isPrimary: true,
        })
        .expect(201);

      expect(response.body.fullName).toBe('Rita Namuli');
      expect(response.body.relationshipType).toBe(
        GuardianRelationshipType.GUARDIAN,
      );
      expect(response.body.isPrimary).toBe(true);
    });

    it('reuses an existing guardian with the same name and phone in the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA2.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          relationshipType: GuardianRelationshipType.FATHER,
          fullName: 'John Mukasa',
          phone: '+256712345678',
        })
        .expect(201);

      expect(response.body.id).toBe(guardianA1.id);
    });

    it('rejects associating the same guardian with the same student twice', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/students/${studentA1.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          relationshipType: GuardianRelationshipType.FATHER,
          fullName: 'John Mukasa',
          phone: '+256712345678',
        })
        .expect(409);

      expect(response.body.message).toBe(
        'This guardian is already associated with this student.',
      );
    });

    it('lists guardians of a student', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(
        expect.arrayContaining([guardianA1.id, guardianA2.id]),
      );
      expect(ids).not.toContain(guardianB1.id);
    });

    it('updates a guardian of a student', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/students/${studentA1.id}/guardians/${guardianA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ occupation: 'Nurse' })
        .expect(200);

      expect(response.body.occupation).toBe('Nurse');
    });

    it('unmarks other primary guardians when setting a new primary', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/students/${studentA1.id}/guardians/${guardianA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isPrimary: true })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const byId = Object.fromEntries(
        response.body.map((item: { id: string; isPrimary: boolean }) => [
          item.id,
          item,
        ]),
      );

      expect(byId[guardianA1.id].isPrimary).toBe(false);
      expect(byId[guardianA2.id].isPrimary).toBe(true);
    });

    it('removes a guardian from a student', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/students/${studentA1.id}/guardians/${guardianA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentA1.id}/guardians`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(guardianA1.id);
      expect(ids).not.toContain(guardianA2.id);
    });

    it('reports a guardian of another school as not found', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenB = await selectSchool(loginToken, schoolB.id);

      await request(app.getHttpServer())
        .patch(`/api/v1/students/${studentB1.id}/guardians/${guardianA1.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ isPrimary: true })
        .expect(404);
    });
  });
});
