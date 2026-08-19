import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type {
  AssessmentComponentResponse,
  AssessmentResponse,
} from '../dto/assessments-response.dto';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { ListAssessmentsQueryDto } from '../dto/list-assessments-query.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { requireActiveSchoolId } from './assessment-context.util';

interface ComponentInput {
  name: string;
  code?: string;
  displayOrder?: number;
  weight?: number;
  maxScore: number;
}

/**
 * Assessment administration. An assessment anchors an activity to the M10
 * academic context (school, year, term, subject, class, stream and optional
 * teaching group) and optionally binds a scheme version that governs scoring.
 * Every assessment owns at least one component so scores always have a
 * component to attach to.
 */
@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateAssessmentDto,
  ): Promise<AssessmentResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    await this.requireYearInSchool(schoolId, dto.academicYearId);
    await this.requireClassInSchool(schoolId, dto.academicClassId);
    await this.requireSubjectInSchool(schoolId, dto.subjectId);

    if (dto.termId) {
      await this.requireTermInYear(dto.academicYearId, dto.termId);
    }

    if (dto.streamId) {
      await this.requireStreamInClass(dto.academicClassId, dto.streamId);
    }

    if (dto.teachingGroupId) {
      await this.requireTeachingGroupMatchesContext(
        schoolId,
        dto.academicYearId,
        dto.academicClassId,
        dto.streamId ?? null,
        dto.subjectId,
        dto.teachingGroupId,
      );
    }

    if (dto.schemeVersionId) {
      await this.requireSchemeVersionInSchool(schoolId, dto.schemeVersionId);
    }

    const components = this.resolveComponents(dto.components);

    const assessment = await this.prisma.assessment.create({
      data: {
        schoolId,
        name: dto.name,
        code: dto.code ?? null,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : null,
        status: 'DRAFT',
        academicYearId: dto.academicYearId,
        termId: dto.termId ?? null,
        subjectId: dto.subjectId,
        academicClassId: dto.academicClassId,
        streamId: dto.streamId ?? null,
        teachingGroupId: dto.teachingGroupId ?? null,
        schemeVersionId: dto.schemeVersionId ?? null,
      },
    });

    for (const component of components) {
      await this.prisma.assessmentComponent.create({
        data: {
          assessmentId: assessment.id,
          name: component.name,
          code: component.code ?? component.name.toUpperCase(),
          displayOrder: component.displayOrder ?? 0,
          weight: component.weight ?? null,
          maxScore: component.maxScore,
        },
      });
    }

    const componentsCreated = await this.prisma.assessmentComponent.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { displayOrder: 'asc' },
    });

    return this.buildResponse(assessment, this.mapComponents(componentsCreated));
  }

  async list(
    activeSchoolId: string | null,
    query: ListAssessmentsQueryDto,
  ): Promise<AssessmentResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const where: Record<string, unknown> = { schoolId };

    if (query.academicYearId !== undefined) {
      where.academicYearId = query.academicYearId;
    }

    if (query.termId !== undefined) {
      where.termId = query.termId;
    }

    if (query.subjectId !== undefined) {
      where.subjectId = query.subjectId;
    }

    if (query.academicClassId !== undefined) {
      where.academicClassId = query.academicClassId;
    }

    if (query.streamId !== undefined) {
      where.streamId = query.streamId;
    }

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.type !== undefined) {
      where.type = query.type;
    }

    const assessments = await this.prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const assessmentIds = assessments.map((assessment) => assessment.id);

    const components =
      assessmentIds.length > 0
        ? await this.prisma.assessmentComponent.findMany({
            where: { assessmentId: { in: assessmentIds } },
            orderBy: { displayOrder: 'asc' },
          })
        : [];

    const componentsByAssessment = new Map<string, AssessmentComponentResponse[]>();
    for (const component of this.mapComponents(components)) {
      const list = componentsByAssessment.get(component.assessmentId) ?? [];
      list.push(component);
      componentsByAssessment.set(component.assessmentId, list);
    }

    return assessments.map((assessment) =>
      this.buildResponse(assessment, componentsByAssessment.get(assessment.id) ?? []),
    );
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<AssessmentResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id, schoolId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    const components = await this.prisma.assessmentComponent.findMany({
      where: { assessmentId: id },
      orderBy: { displayOrder: 'asc' },
    });

    return this.buildResponse(assessment, this.mapComponents(components));
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateAssessmentDto,
  ): Promise<AssessmentResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.assessment.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Assessment not found.');
    }

    const data: {
      name?: string;
      code?: string | null;
      type?: AssessmentResponse['type'];
      date?: Date | null;
      status?: AssessmentResponse['status'];
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.code !== undefined) {
      data.code = dto.code;
    }

    if (dto.type !== undefined) {
      data.type = dto.type;
    }

    if (dto.date !== undefined) {
      data.date = dto.date ? new Date(dto.date) : null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const assessment = await this.prisma.assessment.update({
      where: { id },
      data,
    });

    const components = await this.prisma.assessmentComponent.findMany({
      where: { assessmentId: id },
      orderBy: { displayOrder: 'asc' },
    });

    return this.buildResponse(assessment, this.mapComponents(components));
  }

  async complete(
    activeSchoolId: string | null,
    id: string,
  ): Promise<AssessmentResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.assessment.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Assessment not found.');
    }

    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    const components = await this.prisma.assessmentComponent.findMany({
      where: { assessmentId: id },
      orderBy: { displayOrder: 'asc' },
    });

    return this.buildResponse(assessment, this.mapComponents(components));
  }

  private resolveComponents(
    input?: ComponentInput[],
  ): ComponentInput[] {
    if (input && input.length > 0) {
      return input;
    }

    return [{ name: 'Total', code: 'TOTAL', displayOrder: 0, maxScore: 100 }];
  }

  private mapComponents(
    rows: Array<{
      id: string;
      name: string;
      code: string | null;
      displayOrder: number;
      weight: number | null;
      maxScore: Prisma.Decimal | number;
      schemeComponentDefinitionId: string | null;
      sourceAssessmentId: string | null;
      assessmentId: string;
    }>,
  ): AssessmentComponentResponse[] {
    return rows.map((component) => ({
      id: component.id,
      name: component.name,
      code: component.code,
      displayOrder: component.displayOrder,
      weight: component.weight,
      maxScore: Number(component.maxScore),
      schemeComponentDefinitionId: component.schemeComponentDefinitionId,
      sourceAssessmentId: component.sourceAssessmentId,
      assessmentId: component.assessmentId,
    }));
  }

  private buildResponse(
    assessment: {
      id: string;
      name: string;
      code: string | null;
      type: string;
      date: Date | null;
      status: string;
      schoolId: string;
      academicYearId: string;
      termId: string | null;
      subjectId: string;
      academicClassId: string;
      streamId: string | null;
      teachingGroupId: string | null;
      schemeVersionId: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    components: AssessmentComponentResponse[],
  ): AssessmentResponse {
    return {
      id: assessment.id,
      name: assessment.name,
      code: assessment.code,
      type: assessment.type as AssessmentResponse['type'],
      date: assessment.date,
      status: assessment.status as AssessmentResponse['status'],
      schoolId: assessment.schoolId,
      academicYearId: assessment.academicYearId,
      termId: assessment.termId,
      subjectId: assessment.subjectId,
      academicClassId: assessment.academicClassId,
      streamId: assessment.streamId,
      teachingGroupId: assessment.teachingGroupId,
      schemeVersionId: assessment.schemeVersionId,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      components,
    };
  }

  private async requireYearInSchool(
    schoolId: string,
    yearId: string,
  ): Promise<void> {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: yearId, schoolId },
      select: { id: true },
    });

    if (!year) {
      throw new NotFoundException('Academic year not found.');
    }
  }

  private async requireTermInYear(
    yearId: string,
    termId: string,
  ): Promise<void> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, academicYearId: yearId },
      select: { id: true },
    });

    if (!term) {
      throw new BadRequestException(
        'The specified term does not belong to the specified academic year.',
      );
    }
  }

  private async requireClassInSchool(
    schoolId: string,
    classId: string,
  ): Promise<void> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }
  }

  private async requireSubjectInSchool(
    schoolId: string,
    subjectId: string,
  ): Promise<void> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found.');
    }
  }

  private async requireStreamInClass(
    classId: string,
    streamId: string,
  ): Promise<void> {
    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId, classId },
      select: { id: true },
    });

    if (!stream) {
      throw new BadRequestException(
        'The specified stream does not belong to the specified class.',
      );
    }
  }

  private async requireTeachingGroupMatchesContext(
    schoolId: string,
    yearId: string,
    classId: string,
    streamId: string | null,
    subjectId: string,
    teachingGroupId: string,
  ): Promise<void> {
    const group = await this.prisma.teachingGroup.findFirst({
      where: {
        id: teachingGroupId,
        schoolId,
        academicYearId: yearId,
        academicClassId: classId,
        streamId,
        subjectId,
      },
      select: { id: true },
    });

    if (!group) {
      throw new BadRequestException(
        'The teaching group must match the year, class, stream and subject of the assessment.',
      );
    }
  }

  private async requireSchemeVersionInSchool(
    schoolId: string,
    versionId: string,
  ): Promise<void> {
    const version = await this.prisma.assessmentSchemeVersion.findFirst({
      where: { id: versionId },
      select: { assessmentSchemeId: true },
    });

    if (!version) {
      throw new NotFoundException('Assessment scheme version not found.');
    }

    const scheme = await this.prisma.assessmentScheme.findFirst({
      where: { id: version.assessmentSchemeId, schoolId },
      select: { id: true },
    });

    if (!scheme) {
      throw new BadRequestException(
        'The assessment scheme version must belong to the active school.',
      );
    }
  }
}