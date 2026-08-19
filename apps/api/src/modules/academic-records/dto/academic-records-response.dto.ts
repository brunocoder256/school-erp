import type {
  ReportCommentAuthorType,
  ReportStatus,
  ReportTemplateVersionStatus,
} from '../../../../generated/prisma/enums';

export interface ReportTemplateSectionResponse {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
  isRequired: boolean;
  templateVersionId: string;
}

export interface ReportTemplateVersionResponse {
  id: string;
  versionNumber: number;
  name: string | null;
  status: ReportTemplateVersionStatus;
  templateId: string;
  sections: ReportTemplateSectionResponse[];
}

export interface ReportTemplateResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
  versions: ReportTemplateVersionResponse[];
}

export interface ReportCardSubjectEntryResponse {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  finalScore: number | null;
  grade: string | null;
  descriptor: string | null;
  achievementLevel: string | null;
  resultStatus: string;
  learnerResultId: string | null;
  reportCardId: string;
}

export interface ReportCardCommentResponse {
  id: string;
  authorType: ReportCommentAuthorType;
  subjectId: string | null;
  comment: string;
  authoredById: string | null;
  reportCardId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportCardAmendmentResponse {
  id: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string;
  amendedById: string | null;
  amendedAt: Date;
  reportCardId: string;
}

export interface ReportCardResponse {
  id: string;
  version: number;
  status: ReportStatus;
  generatedAt: Date | null;
  approvedAt: Date | null;
  issuedAt: Date | null;
  amendedAt: Date | null;
  amendmentReason: string | null;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  termId: string | null;
  academicClassId: string | null;
  streamId: string | null;
  academicLevelId: string | null;
  educationSectionId: string | null;
  enrollmentId: string | null;
  templateVersionId: string | null;
  generatedById: string | null;
  approvedById: string | null;
  issuedById: string | null;
  amendedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  subjectEntries: ReportCardSubjectEntryResponse[];
  comments: ReportCardCommentResponse[];
  amendments: ReportCardAmendmentResponse[];
}
