import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type {
  ExaminationPaperResponse,
  ExaminationResponse,
} from '../dto/assessments-response.dto';
import { CreateExaminationDto } from '../dto/create-examination.dto';
import { UpdateExaminationDto } from '../dto/update-examination.dto';
import { requireActiveSchoolId } from './assessment-context.util';

/**
 * Examination administration. An examination groups papers; each paper scores
 * through a linked assessment (the shared score/result path), so a paper
 * carries its subject and academic context via the assessment.
 */
@Injectable()
export class ExaminationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateExaminationDto,
  ): Promise<ExaminationResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    await this.requireYearInSchool(schoolId, dto.academicYearId);

    if (dto.termId) {
      await this.requireTermInYear(dto.academicYearId, dto.termId);
    }

    const papers = dto.papers ?? [];

    if (papers.length > 0) {
      for (const paper of papers) {
        await this.requireAssessmentForYear(
          schoolId,
          dto.academicYearId,
          paper.assessmentId,
        );
      }
    }

    try {
      const examination = await this.prisma.examination.create({
        data: {
          schoolId,
          name: dto.name,
          code: dto.code ?? null,
          date: dto.date ? new Date(dto.date) : null,
          status: 'DRAFT',
          academicYearId: dto.academicYearId,
          termId: dto.termId ?? null,
        },
      });

      for (const paper of papers) {
        await this.prisma.examinationPaper.create({
          data: {
            examinationId: examination.id,
            name: paper.name,
            code: paper.code ?? null,
            displayOrder: paper.displayOrder ?? 0,
            status: 'DRAFT',
            assessmentId: paper.assessmentId,
          },
        });
      }

      const papersCreated = await this.prisma.examinationPaper.findMany({
        where: { examinationId: examination.id },
        orderBy: { displayOrder: 'asc' },
      });

      return this.buildResponse(examination, papersCreated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An examination with this code already exists in this school, or an assessment is already linked to a paper.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'A paper assessment does not exist or does not belong to the active school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<ExaminationResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const examinations = await this.prisma.examination.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });

    const examinationIds = examinations.map((examination) => examination.id);

    const papers =
      examinationIds.length > 0
        ? await this.prisma.examinationPaper.findMany({
            where: { examinationId: { in: examinationIds } },
            orderBy: { displayOrder: 'asc' },
          })
        : [];

    const papersByExamination = new Map<string, ExaminationPaperResponse[]>();
    for (const paper of papers) {
      const list = papersByExamination.get(paper.examinationId) ?? [];
      list.push(this.mapPaper(paper));
      papersByExamination.set(paper.examinationId, list);
    }

    return examinations.map((examination) =>
      this.buildResponse(examination, papersByExamination.get(examination.id) ?? []),
    );
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<ExaminationResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const examination = await this.prisma.examination.findFirst({
      where: { id, schoolId },
    });

    if (!examination) {
      throw new NotFoundException('Examination not found.');
    }

    const papers = await this.prisma.examinationPaper.findMany({
      where: { examinationId: id },
      orderBy: { displayOrder: 'asc' },
    });

    return this.buildResponse(examination, papers.map((paper) => this.mapPaper(paper)));
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateExaminationDto,
  ): Promise<ExaminationResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.examination.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Examination not found.');
    }

    const data: {
      name?: string;
      code?: string | null;
      date?: Date | null;
      status?: ExaminationResponse['status'];
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.code !== undefined) {
      data.code = dto.code;
    }

    if (dto.date !== undefined) {
      data.date = dto.date ? new Date(dto.date) : null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const examination = await this.prisma.examination.update({
      where: { id },
      data,
    });

    const papers = await this.prisma.examinationPaper.findMany({
      where: { examinationId: id },
      orderBy: { displayOrder: 'asc' },
    });

    return this.buildResponse(examination, papers.map((paper) => this.mapPaper(paper)));
  }

  private mapPaper(paper: {
    id: string;
    name: string;
    code: string | null;
    displayOrder: number;
    status: string;
    examinationId: string;
    assessmentId: string;
  }): ExaminationPaperResponse {
    return {
      id: paper.id,
      name: paper.name,
      code: paper.code,
      displayOrder: paper.displayOrder,
      status: paper.status as ExaminationPaperResponse['status'],
      examinationId: paper.examinationId,
      assessmentId: paper.assessmentId,
    };
  }

  private buildResponse(
    examination: {
      id: string;
      name: string;
      code: string | null;
      date: Date | null;
      status: string;
      schoolId: string;
      academicYearId: string;
      termId: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    papers: ExaminationPaperResponse[],
  ): ExaminationResponse {
    return {
      id: examination.id,
      name: examination.name,
      code: examination.code,
      date: examination.date,
      status: examination.status as ExaminationResponse['status'],
      schoolId: examination.schoolId,
      academicYearId: examination.academicYearId,
      termId: examination.termId,
      createdAt: examination.createdAt,
      updatedAt: examination.updatedAt,
      papers,
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

  private async requireAssessmentForYear(
    schoolId: string,
    yearId: string,
    assessmentId: string,
  ): Promise<void> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId, academicYearId: yearId },
      select: { id: true },
    });

    if (!assessment) {
      throw new BadRequestException(
        'Each paper assessment must belong to the active school and the examination academic year.',
      );
    }
  }
}