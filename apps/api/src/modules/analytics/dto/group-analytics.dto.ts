import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Query parameters for class/stream/subject group analytics.
 * academicYearId and termId scope the finalized results;
 * subjectId narrows to a single subject within the group.
 */
export class GroupPerformanceQueryDto {
  @ApiPropertyOptional({ description: 'Academic year to scope results' })
  @IsOptional()
  @IsUUID(undefined, { message: 'academicYearId must be a valid UUID' })
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Specific term to scope results' })
  @IsOptional()
  @IsUUID(undefined, { message: 'termId must be a valid UUID' })
  termId?: string;

  @ApiPropertyOptional({ description: 'Subject filter (for class/stream endpoints)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'subjectId must be a valid UUID' })
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Class filter (for subject endpoints)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'classId must be a valid UUID' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Stream filter (for subject endpoints)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'streamId must be a valid UUID' })
  streamId?: string;
}

export class GroupPeriodComparisonQueryDto {
  @ApiPropertyOptional({ description: 'Subject filter for class/stream comparison' })
  @IsOptional()
  @IsUUID(undefined, { message: 'subjectId must be a valid UUID' })
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Class filter for subject comparison' })
  @IsOptional()
  @IsUUID(undefined, { message: 'classId must be a valid UUID' })
  classId?: string;
}

export class ComparisonQueryDto {
  @ApiPropertyOptional({ description: 'Term filter' })
  @IsOptional()
  @IsUUID(undefined, { message: 'termId must be a valid UUID' })
  termId?: string;

  @ApiPropertyOptional({ description: 'Subject filter (for class/stream comparisons)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'subjectId must be a valid UUID' })
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Academic level ID (for class comparisons)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'academicLevelId must be a valid UUID' })
  academicLevelId?: string;

  @ApiPropertyOptional({ description: 'Class ID (for stream/subject comparisons)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'classId must be a valid UUID' })
  classId?: string;
}

// --- Response interfaces ---

export interface GroupPerformanceSummary {
  groupId: string;
  groupName: string;
  groupCode: string;
  groupType: 'CLASS' | 'STREAM' | 'SUBJECT';
  academicYearId?: string;
  termId?: string;
  learnerCount: number;
  totalResults: number;
  numericResultCount: number;
  nonNumericResultCount: number;
  averageScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  modeGrade: string | null;
  modeDescriptor: string | null;
  modeAchievementLevel: string | null;
  scoreDistribution: {
    minScore: number | null;
    maxScore: number | null;
    averageScore: number | null;
    standardDeviation: number | null;
    quartiles: { q1: number | null; q2: number | null; q3: number | null };
  };
  gradeDistribution: Array<{ grade: string; count: number; percentage: number }>;
  achievementDistribution: Array<{ achievementLevel: string; count: number; percentage: number }>;
  completion: {
    totalAssessments: number;
    totalResults: number;
    completionPercentage: number;
  };
  subjectBreakdown?: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    resultCount: number;
    averageScore: number | null;
    modeGrade: string | null;
  }>;
  learnerBreakdown?: Array<{
    enrollmentId: string;
    studentName: string;
    admissionNumber: string;
    resultCount: number;
    averageScore: number | null;
    modeGrade: string | null;
  }>;
}

export interface GroupPeriodComparisonPoint {
  academicYearId: string;
  academicYearName: string;
  termId?: string;
  termName?: string;
  averageScore: number | null;
  resultCount: number;
  gradeDistribution: Record<string, number>;
}

export interface GroupPeriodComparison {
  groupId: string;
  groupName: string;
  groupType: 'CLASS' | 'STREAM' | 'SUBJECT';
  academicYearId: string;
  comparisonPoints: GroupPeriodComparisonPoint[];
}

export interface ComparisonEntry {
  groupId: string;
  groupName: string;
  groupCode: string;
  learnerCount: number;
  totalResults: number;
  averageScore: number | null;
  modeGrade: string | null;
}

export interface ComparisonResult {
  comparisonType: 'CLASSES' | 'STREAMS' | 'SUBJECTS';
  academicYearId: string;
  termId?: string;
  entries: ComparisonEntry[];
}
