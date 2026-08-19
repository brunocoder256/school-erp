import type {
  AssessmentScoreStatus,
  AssessmentStatus,
  AssessmentType,
  ExaminationPaperStatus,
  ExaminationStatus,
  GradingSchemeVersionStatus,
  RankingMethod,
  RankingScope,
  RankingTieHandling,
  ResultStatus,
  SchemeVersionStatus,
} from '../../../../generated/prisma/enums';

export interface SchemeComponentDefinitionResponse {
  id: string;
  name: string;
  code: string | null;
  displayOrder: number;
  weight: number;
  maxScore: number;
  schemeVersionId: string;
}

export interface AssessmentSchemeVersionResponse {
  id: string;
  versionNumber: number;
  name: string | null;
  status: SchemeVersionStatus;
  gradingSchemeVersionId: string | null;
  rankingPolicyId: string | null;
  assessmentSchemeId: string;
  components: SchemeComponentDefinitionResponse[];
}

export interface AssessmentSchemeResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradingBandResponse {
  id: string;
  minScore: number;
  maxScore: number;
  grade: string;
  descriptor: string | null;
  achievementLevel: string | null;
  displayOrder: number;
  versionId: string;
}

export interface GradingSchemeVersionResponse {
  id: string;
  versionNumber: number;
  name: string | null;
  status: GradingSchemeVersionStatus;
  gradingSchemeId: string;
  bands: GradingBandResponse[];
}

export interface GradingSchemeResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RankingPolicyResponse {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  scope: RankingScope;
  method: RankingMethod;
  tieHandling: RankingTieHandling;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentComponentResponse {
  id: string;
  name: string;
  code: string | null;
  displayOrder: number;
  weight: number | null;
  maxScore: number;
  schemeComponentDefinitionId: string | null;
  sourceAssessmentId: string | null;
  assessmentId: string;
}

export interface AssessmentResponse {
  id: string;
  name: string;
  code: string | null;
  type: AssessmentType;
  date: Date | null;
  status: AssessmentStatus;
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
  components: AssessmentComponentResponse[];
}

export interface AssessmentScoreResponse {
  id: string;
  assessmentId: string;
  componentId: string;
  enrollmentId: string;
  score: number | null;
  status: AssessmentScoreStatus;
  comment: string | null;
  recordedById: string | null;
  recordedAt: Date;
}

export interface ResultAmendmentResponse {
  id: string;
  previousFinalScore: number | null;
  previousGrade: string | null;
  previousDescriptor: string | null;
  newFinalScore: number | null;
  newGrade: string | null;
  newDescriptor: string | null;
  reason: string;
  amendedById: string | null;
  amendedAt: Date;
}

export interface LearnerResultResponse {
  id: string;
  finalScore: number | null;
  grade: string | null;
  descriptor: string | null;
  achievementLevel: string | null;
  status: ResultStatus;
  calculatedAt: Date | null;
  amendedAt: Date | null;
  assessmentId: string;
  enrollmentId: string;
  subjectId: string;
  schoolId: string;
  academicYearId: string;
  termId: string | null;
  schemeVersionId: string | null;
  gradingSchemeVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  amendments: ResultAmendmentResponse[];
}

export interface ExaminationPaperResponse {
  id: string;
  name: string;
  code: string | null;
  displayOrder: number;
  status: ExaminationPaperStatus;
  examinationId: string;
  assessmentId: string;
}

export interface ExaminationResponse {
  id: string;
  name: string;
  code: string | null;
  date: Date | null;
  status: ExaminationStatus;
  schoolId: string;
  academicYearId: string;
  termId: string | null;
  createdAt: Date;
  updatedAt: Date;
  papers: ExaminationPaperResponse[];
}

export interface RankedLearnerResponse {
  rank: number | null;
  tie: boolean;
  enrollmentId: string;
  metric: number | null;
  finalScore: number | null;
  grade: string | null;
}