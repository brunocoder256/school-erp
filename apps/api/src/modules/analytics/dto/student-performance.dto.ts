import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RankingScope } from '../../../../generated/prisma/enums';

export class StudentPerformanceParamsDto {
  @ApiProperty({
    description: 'The student (learner) ID',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
  })
  @IsUUID()
  @Type(() => String)
  studentId!: string;
}

export class StudentPerformanceQueryDto {
  @ApiProperty({
    description: 'Academic year to scope results',
    required: false,
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
  })
  @IsUUID(undefined, { message: 'academicYearId must be a valid UUID' })
  academicYearId?: string;

  @ApiProperty({
    description: 'Specific term to scope results (optional; omit for all terms)',
    required: false,
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
  })
  @IsUUID(undefined, { message: 'termId must be a valid UUID' })
  termId?: string;
}

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  assessmentCount: number;
  resultCount: number;
  averageScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  grade: string | null;
  descriptor: string | null;
  achievementLevel: string | null;
  finalScore: number | null;
}

export interface StudentPerformanceSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  academicYearId?: string;
  termId?: string;
  overallAverageScore: number | null;
  overallMinScore: number | null;
  overallMaxScore: number | null;
  overallGrade: string | null;
  overallDescriptor: string | null;
  overallAchievementLevel: string | null;
  totalResults: number;
  numericResultCount: number;
  nonNumericResultCount: number;
  subjectPerformance: SubjectPerformance[];
}

export interface StudentTrendPoint {
  academicYearId: string;
  academicYearName: string;
  termId?: string;
  termName?: string;
  averageScore: number | null;
  resultCount: number;
  gradeDistribution: Record<string, number>;
}

export interface StudentTrendAnalysis {
  studentId: string;
  points: StudentTrendPoint[];
}

export interface StudentStrength {
  subjectId: string;
  subjectName: string;
  reason: string;
  averageScore: number | null;
  grade: string | null;
}

export interface StudentWeakness {
  subjectId: string;
  subjectName: string;
  reason: string;
  averageScore: number | null;
  grade: string | null;
}

export interface StudentStrengthsWeaknesses {
  studentId: string;
  strengths: StudentStrength[];
  weaknesses: StudentWeakness[];
}

export interface ResultCompletion {
  subjectId: string;
  subjectName: string;
  assessmentCount: number;
  resultCount: number;
  completionPercentage: number;
  pendingAssessments: number;
}

export interface StudentResultCompletion {
  studentId: string;
  academicYearId?: string;
  completion: ResultCompletion[];
  overallCompletionPercentage: number;
}

export interface GradeDistributionEntry {
  grade: string | null;
  count: number;
  percentage: number;
}

export interface AchievementDistributionEntry {
  achievementLevel: string | null;
  count: number;
  percentage: number;
}

export interface ScoreDistribution {
  minScore: number | null;
  maxScore: number | null;
  averageScore: number | null;
  standardDeviation: number | null;
  quartiles: {
    q1: number | null;
    q2: number | null;
    q3: number | null;
  };
}

export interface StudentDistributionAnalysis {
  studentId: string;
  academicYearId?: string;
  termId?: string;
  scoreDistribution: ScoreDistribution;
  gradeDistribution: GradeDistributionEntry[];
  achievementDistribution: AchievementDistributionEntry[];
}

export interface StudentPerformanceProfile {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  summary: StudentPerformanceSummary;
  trend: StudentTrendAnalysis;
  strengthsWeaknesses: StudentStrengthsWeaknesses;
  resultCompletion: StudentResultCompletion;
  distribution: StudentDistributionAnalysis;
}

/**
 * Ranking display for a single student — derived from M12 ranking policies.
 * Analytics never computes rankings itself; it only surfaces M12 results.
 */
export interface StudentRankingEntry {
  rank: number | null;
  totalInGroup: number;
  isTie: boolean;
  scope: string;
  method: string;
  metric: number | null;
  academicYearId: string;
  academicYearName: string;
  termId?: string;
  termName?: string;
  subjectId?: string;
  subjectName?: string;
  policyId: string;
  policyName: string;
}

export interface StudentRankingDisplay {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rankings: StudentRankingEntry[];
}

export class StudentRankingQueryDto {
  @ApiProperty({
    description: 'Academic year to scope ranking',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
  })
  @IsUUID(undefined, { message: 'academicYearId must be a valid UUID' })
  academicYearId!: string;

  @ApiPropertyOptional({
    description: 'Subject to scope ranking (required for AVERAGE_SCORE / TOTAL_SCORE methods)',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'subjectId must be a valid UUID' })
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Specific ranking policy to use (omit to use all active policies)',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'policyId must be a valid UUID' })
  policyId?: string;

  @ApiPropertyOptional({
    description: 'Override the ranking scope (CLASS, STREAM, ACADEMIC_LEVEL, SCHOOL)',
    enum: RankingScope,
  })
  @IsOptional()
  @IsEnum(RankingScope)
  scope?: RankingScope;

  @ApiPropertyOptional({
    description: 'Academic class ID (required when scope is CLASS or ACADEMIC_LEVEL)',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2e',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'academicClassId must be a valid UUID' })
  academicClassId?: string;

  @ApiPropertyOptional({
    description: 'Stream ID (required when scope is STREAM)',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2f',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'streamId must be a valid UUID' })
  streamId?: string;

  @ApiPropertyOptional({
    description: 'Specific term to scope ranking (omit for all terms in the year)',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f30',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'termId must be a valid UUID' })
  termId?: string;
}
