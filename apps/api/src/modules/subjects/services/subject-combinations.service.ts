import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubjectCombinationDto } from '../dto/create-subject-combination.dto';
import type { SubjectCombinationResponse } from '../dto/subject-combination-response.dto';
import { UpdateSubjectCombinationDto } from '../dto/update-subject-combination.dto';

/**
 * A subject member supplied when creating or updating a combination.
 * Optional fields are normalized server-side.
 */
type CombinationSubjectInput = {
  subjectId: string;
  isRequired?: boolean;
  displayOrder?: number;
};

const SUBJECT_COMBINATION_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  minSubjects: true,
  maxSubjects: true,
  isActive: true,
  schoolId: true,
  academicLevelId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Subject combination / pathway administration within the active school.
 *
 * Combinations (PCM, PCB, ...) are configurable data composed of school
 * catalog subjects. The subject set is replaced atomically whenever subjects
 * is supplied.
 */
@Injectable()
export class SubjectCombinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateSubjectCombinationDto,
  ): Promise<SubjectCombinationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireLevelInSchool(schoolId, dto.academicLevelId);

    this.validateSubjectBounds(dto.minSubjects, dto.maxSubjects);

    const subjects = dto.subjects ?? [];
    await this.validateSubjectSet(schoolId, subjects);

    const code = dto.code.trim();

    const existing = await this.prisma.subjectCombination.findFirst({
      where: { schoolId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A subject combination with this code already exists in this school.',
      );
    }

    let combination: SubjectCombinationResponse;

    try {
      const created = await this.prisma.subjectCombination.create({
        data: {
          schoolId,
          academicLevelId: dto.academicLevelId,
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          minSubjects: dto.minSubjects ?? null,
          maxSubjects: dto.maxSubjects ?? null,
          isActive: dto.isActive ?? true,
        },
        select: SUBJECT_COMBINATION_SELECT,
      });

      await this.replaceCombinationSubjects(created.id, subjects);

      combination = await this.buildResponse(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subject combination with this code already exists in this school.',
        );
      }

      throw error;
    }

    return combination;
  }

  async list(
    activeSchoolId: string | null,
  ): Promise<SubjectCombinationResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const combinations = await this.prisma.subjectCombination.findMany({
      where: { schoolId },
      select: SUBJECT_COMBINATION_SELECT,
      orderBy: { name: 'asc' },
    });

    const responses: SubjectCombinationResponse[] = [];

    for (const combination of combinations) {
      responses.push(await this.buildResponse(combination));
    }

    return responses;
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<SubjectCombinationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const combination = await this.prisma.subjectCombination.findFirst({
      where: { id, schoolId },
      select: SUBJECT_COMBINATION_SELECT,
    });

    if (!combination) {
      throw new NotFoundException('Subject combination not found.');
    }

    return this.buildResponse(combination);
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateSubjectCombinationDto,
  ): Promise<SubjectCombinationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.subjectCombination.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Subject combination not found.');
    }

    this.validateSubjectBounds(dto.minSubjects, dto.maxSubjects);

    if (dto.academicLevelId !== undefined) {
      await this.requireLevelInSchool(schoolId, dto.academicLevelId);
    }

    const subjects = dto.subjects;
    if (subjects) {
      await this.validateSubjectSet(schoolId, subjects);
    }

    const data: {
      code?: string;
      name?: string;
      description?: string | null;
      minSubjects?: number | null;
      maxSubjects?: number | null;
      isActive?: boolean;
      academicLevelId?: string;
    } = {};

    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.minSubjects !== undefined) {
      data.minSubjects = dto.minSubjects;
    }

    if (dto.maxSubjects !== undefined) {
      data.maxSubjects = dto.maxSubjects;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.academicLevelId !== undefined) {
      data.academicLevelId = dto.academicLevelId;
    }

    let combination: SubjectCombinationResponse;

    try {
      const updated = await this.prisma.subjectCombination.update({
        where: { id },
        data,
        select: SUBJECT_COMBINATION_SELECT,
      });

      if (subjects) {
        await this.replaceCombinationSubjects(id, subjects);
      }

      combination = await this.buildResponse(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subject combination with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject combination not found.');
      }

      throw error;
    }

    return combination;
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.subjectCombination.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Subject combination not found.');
    }

    try {
      await this.prisma.subjectCombination.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject combination not found.');
      }

      throw error;
    }
  }

  private validateSubjectBounds(
    minSubjects: number | undefined,
    maxSubjects: number | undefined,
  ): void {
    if (
      minSubjects !== undefined &&
      maxSubjects !== undefined &&
      maxSubjects < minSubjects
    ) {
      throw new BadRequestException(
        'maxSubjects must not be less than minSubjects.',
      );
    }
  }

  private async validateSubjectSet(
    schoolId: string,
    subjects: CombinationSubjectInput[],
  ): Promise<void> {
    const subjectIds = subjects.map((item) => item.subjectId);

    if (new Set(subjectIds).size !== subjectIds.length) {
      throw new BadRequestException(
        'A subject can only appear once in a combination.',
      );
    }

    if (subjectIds.length === 0) {
      return;
    }

    const found = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds }, schoolId },
      select: { id: true },
    });

    if (found.length !== subjectIds.length) {
      throw new BadRequestException(
        'One or more combination subjects do not belong to this school.',
      );
    }
  }

  private async replaceCombinationSubjects(
    combinationId: string,
    subjects: CombinationSubjectInput[],
  ): Promise<void> {
    await this.prisma.subjectCombinationSubject.deleteMany({
      where: { combinationId },
    });

    if (subjects.length === 0) {
      return;
    }

    await this.prisma.subjectCombinationSubject.createMany({
      data: subjects.map((item, index) => ({
        combinationId,
        subjectId: item.subjectId,
        isRequired: item.isRequired ?? false,
        displayOrder: item.displayOrder ?? index + 1,
      })),
    });
  }

  private async buildResponse(
    combination: Omit<SubjectCombinationResponse, 'subjects'>,
  ): Promise<SubjectCombinationResponse> {
    const members = await this.prisma.subjectCombinationSubject.findMany({
      where: { combinationId: combination.id },
      select: { subjectId: true, isRequired: true, displayOrder: true },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      ...combination,
      subjects: members,
    };
  }

  private async requireLevelInSchool(
    schoolId: string,
    academicLevelId: string,
  ): Promise<void> {
    const level = await this.prisma.academicLevel.findFirst({
      where: { id: academicLevelId, schoolId },
      select: { id: true },
    });

    if (!level) {
      throw new NotFoundException('Academic level not found.');
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