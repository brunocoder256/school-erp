import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { MembershipStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { ListStaffQueryDto } from '../dto/list-staff-query.dto';
import type { StaffDetailResponse } from '../dto/staff-detail-response.dto';
import type { StaffSummaryResponse } from '../dto/staff-summary-response.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';

const STAFF_SUMMARY_SELECT = {
  id: true,
  staffNumber: true,
  firstName: true,
  middleName: true,
  lastName: true,
  preferredName: true,
  employmentStatus: true,
  employmentType: true,
  staffCategoryId: true,
  departmentId: true,
  positionId: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
};

const STAFF_DETAIL_SELECT = {
  ...STAFF_SUMMARY_SELECT,
  email: true,
  phone: true,
  alternativePhone: true,
  dateOfBirth: true,
  gender: true,
  nationalId: true,
  address: true,
  joiningDate: true,
  leavingDate: true,
  notes: true,
  userId: true,
};

/**
 * Staff administration within the active school context.
 *
 * A Staff record is a person's institutional employment/profile record — it is
 * deliberately distinct from a User (application identity). Tenant context
 * always comes from activeSchoolId; the staff number is unique per school;
 * optional school-specific data stays optional. There is no hard delete — the
 * lifecycle is driven through employmentStatus so history is preserved.
 */
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateStaffDto,
  ): Promise<StaffDetailResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    if (dto.staffCategoryId) {
      await this.requireStaffCategoryInSchool(schoolId, dto.staffCategoryId);
    }

    if (dto.departmentId) {
      await this.requireDepartmentInSchool(schoolId, dto.departmentId);
    }

    if (dto.positionId) {
      await this.requireStaffPositionInSchool(schoolId, dto.positionId);
    }

    if (dto.userId) {
      await this.requireUserMembership(schoolId, dto.userId);
    }

    const staffNumber = dto.staffNumber.trim();

    const existing = await this.prisma.staff.findFirst({
      where: { schoolId, staffNumber },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A staff member with this staff number already exists in this school.',
      );
    }

    try {
      return await this.prisma.staff.create({
        data: {
          schoolId,
          staffNumber,
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim() || null,
          lastName: dto.lastName.trim(),
          preferredName: dto.preferredName?.trim() || null,
          email: dto.email?.trim() || null,
          phone: dto.phone?.trim() || null,
          alternativePhone: dto.alternativePhone?.trim() || null,
          dateOfBirth: dto.dateOfBirth ?? null,
          gender: dto.gender ?? null,
          nationalId: dto.nationalId?.trim() || null,
          address: dto.address?.trim() || null,
          employmentStatus: dto.employmentStatus ?? undefined,
          employmentType: dto.employmentType?.trim() || null,
          joiningDate: dto.joiningDate ?? null,
          leavingDate: dto.leavingDate ?? null,
          notes: dto.notes?.trim() || null,
          staffCategoryId: dto.staffCategoryId ?? null,
          departmentId: dto.departmentId ?? null,
          positionId: dto.positionId ?? null,
          userId: dto.userId ?? null,
        },
        select: STAFF_DETAIL_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A staff member with this staff number already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Referenced staff configuration or user not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    query: ListStaffQueryDto,
  ): Promise<StaffSummaryResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const where: Prisma.StaffWhereInput = { schoolId };

    if (query.status) {
      where.employmentStatus = query.status;
    }

    if (query.staffCategoryId) {
      where.staffCategoryId = query.staffCategoryId;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { middleName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { preferredName: { contains: term, mode: 'insensitive' } },
        { staffNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.staff.findMany({
      where,
      select: STAFF_SUMMARY_SELECT,
      orderBy: { firstName: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    staffId: string,
  ): Promise<StaffDetailResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      select: STAFF_DETAIL_SELECT,
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found.');
    }

    return staff;
  }

  async update(
    activeSchoolId: string | null,
    staffId: string,
    dto: UpdateStaffDto,
  ): Promise<StaffDetailResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true, staffNumber: true },
    });

    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }

    if (dto.staffCategoryId !== undefined && dto.staffCategoryId !== null) {
      await this.requireStaffCategoryInSchool(schoolId, dto.staffCategoryId);
    }

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      await this.requireDepartmentInSchool(schoolId, dto.departmentId);
    }

    if (dto.positionId !== undefined && dto.positionId !== null) {
      await this.requireStaffPositionInSchool(schoolId, dto.positionId);
    }

    if (dto.userId !== undefined && dto.userId !== null) {
      await this.requireUserMembership(schoolId, dto.userId);
    }

    const staffNumber = dto.staffNumber?.trim() ?? existing.staffNumber;

    if (dto.staffNumber !== undefined) {
      const duplicate = await this.prisma.staff.findFirst({
        where: { schoolId, staffNumber },
        select: { id: true },
      });

      if (duplicate && duplicate.id !== staffId) {
        throw new ConflictException(
          'A staff member with this staff number already exists in this school.',
        );
      }
    }

    const data: Prisma.StaffUpdateInput = {};

    if (dto.staffNumber !== undefined) {
      data.staffNumber = staffNumber;
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

    if (dto.email !== undefined) {
      data.email = dto.email?.trim() || null;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone?.trim() || null;
    }

    if (dto.alternativePhone !== undefined) {
      data.alternativePhone = dto.alternativePhone?.trim() || null;
    }

    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth;
    }

    if (dto.gender !== undefined) {
      data.gender = dto.gender;
    }

    if (dto.nationalId !== undefined) {
      data.nationalId = dto.nationalId?.trim() || null;
    }

    if (dto.address !== undefined) {
      data.address = dto.address?.trim() || null;
    }

    if (dto.employmentStatus !== undefined) {
      data.employmentStatus = dto.employmentStatus;
    }

    if (dto.employmentType !== undefined) {
      data.employmentType = dto.employmentType?.trim() || null;
    }

    if (dto.joiningDate !== undefined) {
      data.joiningDate = dto.joiningDate;
    }

    if (dto.leavingDate !== undefined) {
      data.leavingDate = dto.leavingDate;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    if (dto.staffCategoryId !== undefined) {
      data.staffCategory = dto.staffCategoryId
        ? { connect: { id: dto.staffCategoryId } }
        : { disconnect: true };
    }

    if (dto.departmentId !== undefined) {
      data.department = dto.departmentId
        ? { connect: { id: dto.departmentId } }
        : { disconnect: true };
    }

    if (dto.positionId !== undefined) {
      data.position = dto.positionId
        ? { connect: { id: dto.positionId } }
        : { disconnect: true };
    }

    if (dto.userId !== undefined) {
      data.user = dto.userId
        ? { connect: { id: dto.userId } }
        : { disconnect: true };
    }

    try {
      return await this.prisma.staff.update({
        where: { id: staffId },
        data,
        select: STAFF_DETAIL_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A staff member with this staff number already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Staff member not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Referenced staff configuration or user not found or no longer available.',
        );
      }

      throw error;
    }
  }

  /**
   * Verifies the linked User exists and holds an active membership in the
   * active school. Staff and User remain distinct concepts: this only links
   * an existing application identity to the staff record.
   */
  private async requireUserMembership(
    schoolId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.schoolMembership.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException(
        'The linked user is not an active member of this school.',
      );
    }
  }

  private async requireStaffCategoryInSchool(
    schoolId: string,
    staffCategoryId: string,
  ): Promise<void> {
    const category = await this.prisma.staffCategory.findFirst({
      where: { id: staffCategoryId, schoolId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Staff category not found.');
    }
  }

  private async requireDepartmentInSchool(
    schoolId: string,
    departmentId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, schoolId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }
  }

  private async requireStaffPositionInSchool(
    schoolId: string,
    positionId: string,
  ): Promise<void> {
    const position = await this.prisma.staffPosition.findFirst({
      where: { id: positionId, schoolId },
      select: { id: true },
    });

    if (!position) {
      throw new NotFoundException('Staff position not found.');
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
