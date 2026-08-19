import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { requireActiveSchoolId } from '../../assessments/services/assessment-context.util';
import { CreateReportTemplateDto } from '../dto/report-templates.dto';
import {
  CreateReportTemplateVersionDto,
  UpdateReportTemplateDto,
} from '../dto/report-templates.dto';
import type {
  ReportTemplateResponse,
  ReportTemplateSectionResponse,
  ReportTemplateVersionResponse,
} from '../dto/academic-records-response.dto';

/**
 * Report-card template configuration. Templates are school-scoped and versioned:
 * an immutable version carries the section layout so issued report cards keep
 * the structure that produced them (M13 §11, §9).
 */
@Injectable()
export class ReportTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateReportTemplateDto,
  ): Promise<ReportTemplateResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.reportTemplate.findFirst({
      where: { schoolId, code: dto.code },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'A report template with this code already exists in this school.',
      );
    }

    const template = await this.prisma.reportTemplate.create({
      data: {
        schoolId,
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
      },
    });

    return this.buildTemplateResponse(template, []);
  }

  async list(
    activeSchoolId: string | null,
  ): Promise<ReportTemplateResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const templates = await this.prisma.reportTemplate.findMany({
      where: { schoolId },
      include: {
        versions: {
          include: { sections: { orderBy: { displayOrder: 'asc' } } },
          orderBy: { versionNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return templates.map((template) => this.buildTemplateResponse(template, template.versions));
  }

  async findOne(
    activeSchoolId: string | null,
    templateId: string,
  ): Promise<ReportTemplateResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const template = await this.prisma.reportTemplate.findFirst({
      where: { id: templateId, schoolId },
      include: {
        versions: {
          include: { sections: { orderBy: { displayOrder: 'asc' } } },
          orderBy: { versionNumber: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Report template not found.');
    }

    return this.buildTemplateResponse(template, template.versions);
  }

  async update(
    activeSchoolId: string | null,
    templateId: string,
    dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplateResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const template = await this.prisma.reportTemplate.findFirst({
      where: { id: templateId, schoolId },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('Report template not found.');
    }

    const updated = await this.prisma.reportTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });

    const versions = await this.prisma.reportTemplateVersion.findMany({
      where: { templateId },
      include: { sections: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { versionNumber: 'asc' },
    });

    return this.buildTemplateResponse(updated, versions);
  }

  async createVersion(
    activeSchoolId: string | null,
    templateId: string,
    dto: CreateReportTemplateVersionDto,
  ): Promise<ReportTemplateVersionResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const template = await this.prisma.reportTemplate.findFirst({
      where: { id: templateId, schoolId },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('Report template not found.');
    }

    let versionNumber = dto.versionNumber;

    if (versionNumber === undefined) {
      const latest = await this.prisma.reportTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      versionNumber = (latest?.versionNumber ?? 0) + 1;
    } else {
      const clash = await this.prisma.reportTemplateVersion.findFirst({
        where: { templateId, versionNumber },
        select: { id: true },
      });

      if (clash) {
        throw new BadRequestException(
          'A version with this number already exists for this template.',
        );
      }
    }

    const sectionCodes = (dto.sections ?? []).map((section) => section.code);
    if (new Set(sectionCodes).size !== sectionCodes.length) {
      throw new BadRequestException(
        'Section codes must be unique within a template version.',
      );
    }

    const version = await this.prisma.reportTemplateVersion.create({
      data: {
        templateId,
        versionNumber,
        name: dto.name ?? null,
        sections: dto.sections
          ? {
              create: dto.sections.map((section) => ({
                name: section.name,
                code: section.code,
                displayOrder: section.displayOrder ?? 0,
                isRequired: section.isRequired ?? false,
              })),
            }
          : undefined,
      },
      include: { sections: { orderBy: { displayOrder: 'asc' } } },
    });

    return this.buildVersionResponse(version, version.sections);
  }

  // -------------------------------------------------------------------------

  private buildTemplateResponse(
    template: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      isActive: boolean;
      schoolId: string;
      createdAt: Date;
      updatedAt: Date;
    },
    versions: Array<{
      id: string;
      versionNumber: number;
      name: string | null;
      status: string;
      templateId: string;
      sections?: Array<{
        id: string;
        name: string;
        code: string;
        displayOrder: number;
        isRequired: boolean;
        templateVersionId: string;
      }>;
    }>,
  ): ReportTemplateResponse {
    return {
      id: template.id,
      name: template.name,
      code: template.code,
      description: template.description,
      isActive: template.isActive,
      schoolId: template.schoolId,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      versions: (versions ?? []).map((version) =>
        this.buildVersionResponse(version, version.sections ?? []),
      ),
    };
  }

  private buildVersionResponse(
    version: {
      id: string;
      versionNumber: number;
      name: string | null;
      status: string;
      templateId: string;
    },
    sections: Array<{
      id: string;
      name: string;
      code: string;
      displayOrder: number;
      isRequired: boolean;
      templateVersionId: string;
    }>,
  ): ReportTemplateVersionResponse {
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      name: version.name,
      status: version.status as ReportTemplateVersionResponse['status'],
      templateId: version.templateId,
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name,
        code: section.code,
        displayOrder: section.displayOrder,
        isRequired: section.isRequired,
        templateVersionId: section.templateVersionId,
      })) satisfies ReportTemplateSectionResponse[],
    };
  }
}
