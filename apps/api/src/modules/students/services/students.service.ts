import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { Gender, StudentStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import type { StudentResponse } from '../dto/student-response.dto';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';

const STUDENT_SELECT = {
  id: true,
  admissionNumber: true,
  firstName: true,
  middleName: true,
  lastName: true,
  preferredName: true,
  gender: true,
  dateOfBirth: true,
  placeOfBirth: true,
  nationality: true,
  religion: true,
  profilePhotoUrl: true,
  nationalId: true,
  birthCertificateNumber: true,
  phone: true,
  email: true,
  address: true,
  district: true,
  municipality: true,
  village: true,
  status: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Student administration within the active school context.
 *
 * The school is never supplied by the client — every method receives the
 * authenticated user's activeSchoolId. Every query is scoped through
 * schoolId = activeSchoolId, so a student belonging to another school is
 * indistinguishable from a nonexistent one (safe 404).
 */
@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateStudentDto,
  ): Promise<StudentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    this.validateDateOfBirth(dto.dateOfBirth);

    const admissionNumber = dto.admissionNumber.trim();

    const existing = await this.prisma.student.findFirst({
      where: { schoolId, admissionNumber },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A student with this admission number already exists in this school.',
      );
    }

    try {
      return await this.prisma.student.create({
        data: {
          schoolId,
          admissionNumber,
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim() || null,
          lastName: dto.lastName.trim(),
          preferredName: dto.preferredName?.trim() || null,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth,
          placeOfBirth: dto.placeOfBirth?.trim() || null,
          nationality: dto.nationality?.trim() || null,
          religion: dto.religion?.trim() || null,
          profilePhotoUrl: dto.profilePhotoUrl?.trim() || null,
          nationalId: dto.nationalId?.trim() || null,
          birthCertificateNumber: dto.birthCertificateNumber?.trim() || null,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          address: dto.address?.trim() || null,
          district: dto.district?.trim() || null,
          municipality: dto.municipality?.trim() || null,
          village: dto.village?.trim() || null,
          status: dto.status ?? StudentStatus.ACTIVE,
        },
        select: STUDENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A student with this admission number already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<StudentResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.student.findMany({
      where: { schoolId },
      select: STUDENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    studentId: string,
  ): Promise<StudentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: STUDENT_SELECT,
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    return student;
  }

  async update(
    activeSchoolId: string | null,
    studentId: string,
    dto: UpdateStudentDto,
  ): Promise<StudentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Student not found.');
    }

    if (dto.dateOfBirth !== undefined) {
      this.validateDateOfBirth(dto.dateOfBirth);
    }

    const data: {
      admissionNumber?: string;
      firstName?: string;
      middleName?: string | null;
      lastName?: string;
      preferredName?: string | null;
      gender?: Gender;
      dateOfBirth?: string;
      placeOfBirth?: string | null;
      nationality?: string | null;
      religion?: string | null;
      profilePhotoUrl?: string | null;
      nationalId?: string | null;
      birthCertificateNumber?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      district?: string | null;
      municipality?: string | null;
      village?: string | null;
      status?: StudentStatus;
    } = {};

    if (dto.admissionNumber !== undefined) {
      data.admissionNumber = dto.admissionNumber.trim();
    }

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName.trim();
    }

    if (dto.middleName !== undefined) {
      data.middleName = dto.middleName?.trim() || null;
    }

    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName.trim();
    }

    if (dto.preferredName !== undefined) {
      data.preferredName = dto.preferredName?.trim() || null;
    }

    if (dto.gender !== undefined) {
      data.gender = dto.gender;
    }

    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth;
    }

    if (dto.placeOfBirth !== undefined) {
      data.placeOfBirth = dto.placeOfBirth?.trim() || null;
    }

    if (dto.nationality !== undefined) {
      data.nationality = dto.nationality?.trim() || null;
    }

    if (dto.religion !== undefined) {
      data.religion = dto.religion?.trim() || null;
    }

    if (dto.profilePhotoUrl !== undefined) {
      data.profilePhotoUrl = dto.profilePhotoUrl?.trim() || null;
    }

    if (dto.nationalId !== undefined) {
      data.nationalId = dto.nationalId?.trim() || null;
    }

    if (dto.birthCertificateNumber !== undefined) {
      data.birthCertificateNumber = dto.birthCertificateNumber?.trim() || null;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone?.trim() || null;
    }

    if (dto.email !== undefined) {
      data.email = dto.email?.trim().toLowerCase() || null;
    }

    if (dto.address !== undefined) {
      data.address = dto.address?.trim() || null;
    }

    if (dto.district !== undefined) {
      data.district = dto.district?.trim() || null;
    }

    if (dto.municipality !== undefined) {
      data.municipality = dto.municipality?.trim() || null;
    }

    if (dto.village !== undefined) {
      data.village = dto.village?.trim() || null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    try {
      return await this.prisma.student.update({
        where: { id: studentId },
        data,
        select: STUDENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A student with this admission number already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Student not found.');
      }

      throw error;
    }
  }

  private validateDateOfBirth(dateOfBirth: string): void {
    const dob = new Date(dateOfBirth);

    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestException('dateOfBirth must be a valid date.');
    }

    if (dob.getTime() > Date.now()) {
      throw new BadRequestException('dateOfBirth must not be in the future.');
    }
  }

  private requireActiveSchoolId(activeSchoolId: string | null): string {
    if (!activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return activeSchoolId;
  }
}
