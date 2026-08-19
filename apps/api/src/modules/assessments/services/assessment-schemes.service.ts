import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAssessmentSchemeDto } from '../dto/create-assessment-scheme.dto';
import { CreateSchemeVersionDto } from '../dto/create-scheme-version.dto';
import type {
  AssessmentSchemeResponse,
  AssessmentSchemeVersionResponse,
  SchemeComponentDefinitionResponse,
} from '../dto/assessments-response.dto';
import { UpdateAssessmentSchemeDto } from '../dto/update-assessment-scheme.dto';
import { requireActiveSchoolId } from './assessment-context.util';

/**
 * Assessment scheme administration. A scheme is a school-scoped,
 * configurable definition of how an assessment is scored. Rules live in
 * immutable versions so finalized results keep the configuration that
 * produced them. A new scheme always ships with its first (active) version.
 */
@Injectable()
export class AssessmentSchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateAssessmentSchemeDto,
  ): Promise<AssessmentSchemeResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const components = dto.components?.map((component) => ({
      name: component.name,
      code: component.code ?? component.name.toUpperCase(),
      displayOrder: component.displayOrder ?? 0,
      weight: component.weight,
      maxScore: component.maxScore,
    })) ?? [
      { name: 'Total', code: 'TOTAL', displayOrder: 0, weight: 100, maxScore: 100 },
    ];

    this.requireWeightsSumTo100(components);

    if (dto.gradingSchemeVersionId) {
      await this.requireGradingVersionInSchool(schoolId, dto.gradingSchemeVersionId);
    }

    if (dto.rankingPolicyId) {
      await this.requireRankingPolicyInSchool(schoolId, dto.rankingPolicyId);
    }

    try {
      const scheme = await this.prisma.assessmentScheme.create({
        data: {
          schoolId,
          name: dto.name,
          code: dto.code,
          description: dto.description ?? null,
          isActive: true,
        },
      });

      const version = await this.prisma.assessmentSchemeVersion.create({
        data: {
          assessmentSchemeId: scheme.id,
          versionNumber: 1,
          name: 'v1',
          status: 'ACTIVE',
          gradingSchemeVersionId: dto.gradingSchemeVersionId ?? null,
          rankingPolicyId: dto.rankingPolicyId ?? null,
        },
      });

      for (const component of components) {
        await this.prisma.schemeComponentDefinition.create({
          data: { schemeVersionId: version.id, ...component },
        });
      }

      return {
        id: scheme.id,
        name: scheme.name,
        code: scheme.code,
        description: scheme.description,
        isActive: scheme.isActive,
        schoolId: scheme.schoolId,
        createdAt: scheme.createdAt,
        updatedAt: scheme.updatedAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An assessment scheme with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<AssessmentSchemeResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const schemes = await this.prisma.assessmentScheme.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });

    return schemes.map((scheme) => ({
      id: scheme.id,
      name: scheme.name,
      code: scheme.code,
      description: scheme.description,
      isActive: scheme.isActive,
      schoolId: scheme.schoolId,
      createdAt: scheme.createdAt,
      updatedAt: scheme.updatedAt,
    }));
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<AssessmentSchemeResponse & { versions: AssessmentSchemeVersionResponse[] }> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const scheme = await this.prisma.assessmentScheme.findFirst({
      where: { id, schoolId },
    });

    if (!scheme) {
      throw new NotFoundException('Assessment scheme not found.');
    }

    const versions = await this.listVersions(activeSchoolId, id);

    return {
      id: scheme.id,
      name: scheme.name,
      code: scheme.code,
      description: scheme.description,
      isActive: scheme.isActive,
      schoolId: scheme.schoolId,
      createdAt: scheme.createdAt,
      updatedAt: scheme.updatedAt,
      versions,
    };
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateAssessmentSchemeDto,
  ): Promise<AssessmentSchemeResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireSchemeInSchool(schoolId, id);

    const data: { name?: string; description?: string | null; isActive?: boolean } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      const scheme = await this.prisma.assessmentScheme.update({
        where: { id },
        data,
      });

      return {
        id: scheme.id,
        name: scheme.name,
        code: scheme.code,
        description: scheme.description,
        isActive: scheme.isActive,
        schoolId: scheme.schoolId,
        createdAt: scheme.createdAt,
        updatedAt: scheme.updatedAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Assessment scheme not found.');
      }

      throw error;
    }
  }

  async createVersion(
    activeSchoolId: string | null,
    schemeId: string,
    dto: CreateSchemeVersionDto,
  ): Promise<AssessmentSchemeVersionResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireSchemeInSchool(schoolId, schemeId);

    this.requireWeightsSumTo100(
      dto.components.map((component) => ({
        name: component.name,
        code: component.code ?? component.name.toUpperCase(),
        weight: component.weight,
        maxScore: component.maxScore,
      })),
    );

    if (dto.gradingSchemeVersionId) {
      await this.requireGradingVersionInSchool(schoolId, dto.gradingSchemeVersionId);
    }

    if (dto.rankingPolicyId) {
      await this.requireRankingPolicyInSchool(schoolId, dto.rankingPolicyId);
    }

    const latest = await this.prisma.assessmentSchemeVersion.findFirst({
      where: { assessmentSchemeId: schemeId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const version = await this.prisma.assessmentSchemeVersion.create({
      data: {
        assessmentSchemeId: schemeId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        name: dto.name ?? null,
        status: 'DRAFT',
        gradingSchemeVersionId: dto.gradingSchemeVersionId ?? null,
        rankingPolicyId: dto.rankingPolicyId ?? null,
      },
    });

    for (const component of dto.components) {
      await this.prisma.schemeComponentDefinition.create({
        data: {
          schemeVersionId: version.id,
          name: component.name,
          code: component.code ?? component.name.toUpperCase(),
          displayOrder: component.displayOrder ?? 0,
          weight: component.weight,
          maxScore: component.maxScore,
        },
      });
    }

    const components = await this.prisma.schemeComponentDefinition.findMany({
      where: { schemeVersionId: version.id },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      name: version.name,
      status: version.status,
      gradingSchemeVersionId: version.gradingSchemeVersionId,
      rankingPolicyId: version.rankingPolicyId,
      assessmentSchemeId: schemeId,
      components: this.mapComponents(components),
    };
  }

  async activateVersion(
    activeSchoolId: string | null,
    schemeId: string,
    versionId: string,
  ): Promise<AssessmentSchemeVersionResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireSchemeInSchool(schoolId, schemeId);

    const version = await this.prisma.assessmentSchemeVersion.findFirst({
      where: { id: versionId, assessmentSchemeId: schemeId },
    });

    if (!version) {
      throw new NotFoundException('Assessment scheme version not found.');
    }

    await this.prisma.assessmentSchemeVersion.updateMany({
      where: { assessmentSchemeId: schemeId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });

    await this.prisma.assessmentSchemeVersion.update({
      where: { id: versionId },
      data: { status: 'ACTIVE' },
    });

    return this.buildVersion(schemeId, versionId);
  }

  async listVersions(
    activeSchoolId: string | null,
    schemeId: string,
  ): Promise<AssessmentSchemeVersionResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireSchemeInSchool(schoolId, schemeId);

    const versions = await this.prisma.assessmentSchemeVersion.findMany({
      where: { assessmentSchemeId: schemeId },
      orderBy: { versionNumber: 'asc' },
    });

    const versionIds = versions.map((version) => version.id);

    const components =
      versionIds.length > 0
        ? await this.prisma.schemeComponentDefinition.findMany({
            where: { schemeVersionId: { in: versionIds } },
            orderBy: { displayOrder: 'asc' },
          })
        : [];

    const componentsByVersion = new Map<string, SchemeComponentDefinitionResponse[]>();
    for (const component of this.mapComponents(components)) {
      const list = componentsByVersion.get(component.schemeVersionId) ?? [];
      list.push(component);
      componentsByVersion.set(component.schemeVersionId, list);
    }

    return versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      name: version.name,
      status: version.status,
      gradingSchemeVersionId: version.gradingSchemeVersionId,
      rankingPolicyId: version.rankingPolicyId,
      assessmentSchemeId: schemeId,
      components: componentsByVersion.get(version.id) ?? [],
    }));
  }

  private async buildVersion(
    schemeId: string,
    versionId: string,
  ): Promise<AssessmentSchemeVersionResponse> {
    const version = await this.prisma.assessmentSchemeVersion.findFirst({
      where: { id: versionId, assessmentSchemeId: schemeId },
    });

    if (!version) {
      throw new NotFoundException('Assessment scheme version not found.');
    }

    const components = await this.prisma.schemeComponentDefinition.findMany({
      where: { schemeVersionId: versionId },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      name: version.name,
      status: version.status,
      gradingSchemeVersionId: version.gradingSchemeVersionId,
      rankingPolicyId: version.rankingPolicyId,
      assessmentSchemeId: schemeId,
      components: this.mapComponents(components),
    };
  }

  private mapComponents(
    rows: Array<{
      id: string;
      name: string;
      code: string | null;
      displayOrder: number;
      weight: number;
      maxScore: Prisma.Decimal | number;
      schemeVersionId: string;
    }>,
  ): SchemeComponentDefinitionResponse[] {
    return rows.map((component) => ({
      id: component.id,
      name: component.name,
      code: component.code,
      displayOrder: component.displayOrder,
      weight: component.weight,
      maxScore: Number(component.maxScore),
      schemeVersionId: component.schemeVersionId,
    }));
  }

  private requireWeightsSumTo100(
    components: Array<{ weight: number }>,
  ): void {
    const sum = components.reduce((total, component) => total + component.weight, 0);

    if (sum !== 100) {
      throw new BadRequestException(
        'Assessment scheme component weights must sum to 100.',
      );
    }
  }

  private async requireSchemeInSchool(
    schoolId: string,
    schemeId: string,
  ): Promise<void> {
    const scheme = await this.prisma.assessmentScheme.findFirst({
      where: { id: schemeId, schoolId },
      select: { id: true },
    });

    if (!scheme) {
      throw new NotFoundException('Assessment scheme not found.');
    }
  }

  private async requireGradingVersionInSchool(
    schoolId: string,
    versionId: string,
  ): Promise<void> {
    const version = await this.prisma.gradingSchemeVersion.findFirst({
      where: { id: versionId },
      select: { gradingSchemeId: true },
    });

    if (!version) {
      throw new NotFoundException('Grading scheme version not found.');
    }

    const scheme = await this.prisma.gradingScheme.findFirst({
      where: { id: version.gradingSchemeId, schoolId },
      select: { id: true },
    });

    if (!scheme) {
      throw new BadRequestException(
        'The grading scheme version must belong to the active school.',
      );
    }
  }

  private async requireRankingPolicyInSchool(
    schoolId: string,
    policyId: string,
  ): Promise<void> {
    const policy = await this.prisma.rankingPolicy.findFirst({
      where: { id: policyId, schoolId },
      select: { id: true },
    });

    if (!policy) {
      throw new BadRequestException(
        'The ranking policy must belong to the active school.',
      );
    }
  }
}