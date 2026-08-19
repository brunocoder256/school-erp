import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { validateBands } from '../engines/grading.engine';
import type {
  GradingBandResponse,
  GradingSchemeResponse,
  GradingSchemeVersionResponse,
} from '../dto/assessments-response.dto';
import { CreateGradingSchemeDto } from '../dto/create-grading-scheme.dto';
import { CreateGradingVersionDto } from '../dto/create-grading-version.dto';
import { UpdateGradingSchemeDto } from '../dto/update-grading-scheme.dto';
import { requireActiveSchoolId } from './assessment-context.util';

interface BandInput {
  minScore: number;
  maxScore: number;
  grade: string;
  descriptor?: string;
  achievementLevel?: string;
  displayOrder?: number;
}

/**
 * Grading scheme administration. A grading scheme maps final scores to
 * grades, descriptors and achievement levels through its versioned bands.
 * Bands are validated with the grading engine (no overlaps, no inverted
 * ranges, no duplicate grades; intentional gaps are allowed).
 */
@Injectable()
export class GradingSchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateGradingSchemeDto,
  ): Promise<GradingSchemeResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    this.validateBandInputs(dto.bands);

    try {
      const scheme = await this.prisma.gradingScheme.create({
        data: {
          schoolId,
          name: dto.name,
          code: dto.code,
          description: dto.description ?? null,
          isActive: true,
        },
      });

      const version = await this.prisma.gradingSchemeVersion.create({
        data: {
          gradingSchemeId: scheme.id,
          versionNumber: 1,
          name: 'v1',
          status: 'ACTIVE',
        },
      });

      for (const band of dto.bands) {
        await this.prisma.gradingBand.create({
          data: {
            versionId: version.id,
            minScore: band.minScore,
            maxScore: band.maxScore,
            grade: band.grade,
            descriptor: band.descriptor ?? null,
            achievementLevel: band.achievementLevel ?? null,
            displayOrder: band.displayOrder ?? 0,
          },
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
          'A grading scheme with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<GradingSchemeResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const schemes = await this.prisma.gradingScheme.findMany({
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
  ): Promise<GradingSchemeResponse & { versions: GradingSchemeVersionResponse[] }> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const scheme = await this.prisma.gradingScheme.findFirst({
      where: { id, schoolId },
    });

    if (!scheme) {
      throw new NotFoundException('Grading scheme not found.');
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
    dto: UpdateGradingSchemeDto,
  ): Promise<GradingSchemeResponse> {
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
      const scheme = await this.prisma.gradingScheme.update({
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
        throw new NotFoundException('Grading scheme not found.');
      }

      throw error;
    }
  }

  async createVersion(
    activeSchoolId: string | null,
    schemeId: string,
    dto: CreateGradingVersionDto,
  ): Promise<GradingSchemeVersionResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireSchemeInSchool(schoolId, schemeId);

    this.validateBandInputs(dto.bands);

    const latest = await this.prisma.gradingSchemeVersion.findFirst({
      where: { gradingSchemeId: schemeId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const version = await this.prisma.gradingSchemeVersion.create({
      data: {
        gradingSchemeId: schemeId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        name: dto.name ?? null,
        status: 'DRAFT',
      },
    });

    for (const band of dto.bands) {
      await this.prisma.gradingBand.create({
        data: {
          versionId: version.id,
          minScore: band.minScore,
          maxScore: band.maxScore,
          grade: band.grade,
          descriptor: band.descriptor ?? null,
          achievementLevel: band.achievementLevel ?? null,
          displayOrder: band.displayOrder ?? 0,
        },
      });
    }

    return this.buildVersion(schemeId, version.id);
  }

  async activateVersion(
    activeSchoolId: string | null,
    schemeId: string,
    versionId: string,
  ): Promise<GradingSchemeVersionResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireSchemeInSchool(schoolId, schemeId);

    const version = await this.prisma.gradingSchemeVersion.findFirst({
      where: { id: versionId, gradingSchemeId: schemeId },
      select: { id: true },
    });

    if (!version) {
      throw new NotFoundException('Grading scheme version not found.');
    }

    await this.prisma.gradingSchemeVersion.updateMany({
      where: { gradingSchemeId: schemeId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });

    await this.prisma.gradingSchemeVersion.update({
      where: { id: versionId },
      data: { status: 'ACTIVE' },
    });

    return this.buildVersion(schemeId, versionId);
  }

  async listVersions(
    activeSchoolId: string | null,
    schemeId: string,
  ): Promise<GradingSchemeVersionResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireSchemeInSchool(schoolId, schemeId);

    const versions = await this.prisma.gradingSchemeVersion.findMany({
      where: { gradingSchemeId: schemeId },
      orderBy: { versionNumber: 'asc' },
    });

    const versionIds = versions.map((version) => version.id);

    const bands =
      versionIds.length > 0
        ? await this.prisma.gradingBand.findMany({
            where: { versionId: { in: versionIds } },
            orderBy: { displayOrder: 'asc' },
          })
        : [];

    const bandsByVersion = new Map<string, GradingBandResponse[]>();
    for (const band of bands) {
      const mapped = this.mapBand(band);
      const list = bandsByVersion.get(band.versionId) ?? [];
      list.push(mapped);
      bandsByVersion.set(band.versionId, list);
    }

    return versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      name: version.name,
      status: version.status,
      gradingSchemeId: schemeId,
      bands: bandsByVersion.get(version.id) ?? [],
    }));
  }

  private async buildVersion(
    schemeId: string,
    versionId: string,
  ): Promise<GradingSchemeVersionResponse> {
    const version = await this.prisma.gradingSchemeVersion.findFirst({
      where: { id: versionId, gradingSchemeId: schemeId },
    });

    if (!version) {
      throw new NotFoundException('Grading scheme version not found.');
    }

    const bands = await this.prisma.gradingBand.findMany({
      where: { versionId },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      name: version.name,
      status: version.status,
      gradingSchemeId: schemeId,
      bands: bands.map((band) => this.mapBand(band)),
    };
  }

  private mapBand(band: {
    id: string;
    minScore: Prisma.Decimal | number;
    maxScore: Prisma.Decimal | number;
    grade: string;
    descriptor: string | null;
    achievementLevel: string | null;
    displayOrder: number;
    versionId: string;
  }): GradingBandResponse {
    return {
      id: band.id,
      minScore: Number(band.minScore),
      maxScore: Number(band.maxScore),
      grade: band.grade,
      descriptor: band.descriptor,
      achievementLevel: band.achievementLevel,
      displayOrder: band.displayOrder,
      versionId: band.versionId,
    };
  }

  private validateBandInputs(bands: BandInput[]): void {
    try {
      validateBands(
        bands.map((band) => ({
          minScore: band.minScore,
          maxScore: band.maxScore,
          grade: band.grade,
          descriptor: band.descriptor ?? null,
          achievementLevel: band.achievementLevel ?? null,
        })),
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private async requireSchemeInSchool(
    schoolId: string,
    schemeId: string,
  ): Promise<void> {
    const scheme = await this.prisma.gradingScheme.findFirst({
      where: { id: schemeId, schoolId },
      select: { id: true },
    });

    if (!scheme) {
      throw new NotFoundException('Grading scheme not found.');
    }
  }
}