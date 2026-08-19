-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('FORMATIVE', 'SUMMATIVE', 'CONTINUOUS_ASSESSMENT', 'EXAMINATION', 'PROJECT', 'PRACTICAL', 'PERFORMANCE', 'COURSEWORK', 'OBSERVATION', 'COMPETENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssessmentScoreStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXEMPT', 'NOT_ASSESSED', 'PENDING', 'WITHHELD');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED', 'AMENDED');

-- CreateEnum
CREATE TYPE "SchemeVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GradingSchemeVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RankingScope" AS ENUM ('CLASS', 'STREAM', 'ACADEMIC_LEVEL', 'SCHOOL');

-- CreateEnum
CREATE TYPE "RankingMethod" AS ENUM ('TOTAL_SCORE', 'AVERAGE_SCORE', 'AGGREGATE');

-- CreateEnum
CREATE TYPE "RankingTieHandling" AS ENUM ('COMPETITION', 'DENSE');

-- CreateEnum
CREATE TYPE "ExaminationStatus" AS ENUM ('DRAFT', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ExaminationPaperStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateTable
CREATE TABLE "AssessmentScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "AssessmentScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSchemeVersion" (
    "id" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT,
    "status" "SchemeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assessmentSchemeId" TEXT NOT NULL,
    "gradingSchemeVersionId" TEXT,
    "rankingPolicyId" TEXT,

    CONSTRAINT "AssessmentSchemeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeComponentDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL,
    "maxScore" DECIMAL(6,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schemeVersionId" TEXT NOT NULL,

    CONSTRAINT "SchemeComponentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "GradingScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingSchemeVersion" (
    "id" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT,
    "status" "GradingSchemeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gradingSchemeId" TEXT NOT NULL,

    CONSTRAINT "GradingSchemeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingBand" (
    "id" TEXT NOT NULL,
    "minScore" DECIMAL(6,2) NOT NULL,
    "maxScore" DECIMAL(6,2) NOT NULL,
    "grade" TEXT NOT NULL,
    "descriptor" TEXT,
    "achievementLevel" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "GradingBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scope" "RankingScope" NOT NULL,
    "method" "RankingMethod" NOT NULL DEFAULT 'AVERAGE_SCORE',
    "tieHandling" "RankingTieHandling" NOT NULL DEFAULT 'COMPETITION',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "RankingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "AssessmentType" NOT NULL,
    "date" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT,
    "subjectId" TEXT NOT NULL,
    "academicClassId" TEXT NOT NULL,
    "streamId" TEXT,
    "teachingGroupId" TEXT,
    "schemeVersionId" TEXT,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentComponent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "weight" INTEGER,
    "maxScore" DECIMAL(6,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "schemeComponentDefinitionId" TEXT,
    "sourceAssessmentId" TEXT,

    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentScore" (
    "id" TEXT NOT NULL,
    "score" DECIMAL(6,2),
    "status" "AssessmentScoreStatus" NOT NULL DEFAULT 'PRESENT',
    "comment" TEXT,
    "recordedById" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,

    CONSTRAINT "AssessmentScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerResult" (
    "id" TEXT NOT NULL,
    "finalScore" DECIMAL(6,2),
    "grade" TEXT,
    "descriptor" TEXT,
    "achievementLevel" TEXT,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "calculatedAt" TIMESTAMP(3),
    "amendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT,
    "assessmentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "schemeVersionId" TEXT,
    "gradingSchemeVersionId" TEXT,

    CONSTRAINT "LearnerResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultAmendment" (
    "id" TEXT NOT NULL,
    "previousFinalScore" DECIMAL(6,2),
    "previousGrade" TEXT,
    "previousDescriptor" TEXT,
    "newFinalScore" DECIMAL(6,2),
    "newGrade" TEXT,
    "newDescriptor" TEXT,
    "reason" TEXT NOT NULL,
    "amendedById" UUID,
    "amendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultId" TEXT NOT NULL,

    CONSTRAINT "ResultAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Examination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "date" TIMESTAMP(3),
    "status" "ExaminationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT,

    CONSTRAINT "Examination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExaminationPaper" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ExaminationPaperStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "examinationId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,

    CONSTRAINT "ExaminationPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentScheme_schoolId_idx" ON "AssessmentScheme"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentScheme_schoolId_code_key" ON "AssessmentScheme"("schoolId", "code");

-- CreateIndex
CREATE INDEX "AssessmentSchemeVersion_assessmentSchemeId_idx" ON "AssessmentSchemeVersion"("assessmentSchemeId");

-- CreateIndex
CREATE INDEX "AssessmentSchemeVersion_gradingSchemeVersionId_idx" ON "AssessmentSchemeVersion"("gradingSchemeVersionId");

-- CreateIndex
CREATE INDEX "AssessmentSchemeVersion_rankingPolicyId_idx" ON "AssessmentSchemeVersion"("rankingPolicyId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSchemeVersion_assessmentSchemeId_versionNumber_key" ON "AssessmentSchemeVersion"("assessmentSchemeId", "versionNumber");

-- CreateIndex
CREATE INDEX "SchemeComponentDefinition_schemeVersionId_idx" ON "SchemeComponentDefinition"("schemeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeComponentDefinition_schemeVersionId_code_key" ON "SchemeComponentDefinition"("schemeVersionId", "code");

-- CreateIndex
CREATE INDEX "GradingScheme_schoolId_idx" ON "GradingScheme"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingScheme_schoolId_code_key" ON "GradingScheme"("schoolId", "code");

-- CreateIndex
CREATE INDEX "GradingSchemeVersion_gradingSchemeId_idx" ON "GradingSchemeVersion"("gradingSchemeId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingSchemeVersion_gradingSchemeId_versionNumber_key" ON "GradingSchemeVersion"("gradingSchemeId", "versionNumber");

-- CreateIndex
CREATE INDEX "GradingBand_versionId_idx" ON "GradingBand"("versionId");

-- CreateIndex
CREATE INDEX "RankingPolicy_schoolId_idx" ON "RankingPolicy"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingPolicy_schoolId_code_key" ON "RankingPolicy"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Assessment_schoolId_idx" ON "Assessment"("schoolId");

-- CreateIndex
CREATE INDEX "Assessment_academicYearId_idx" ON "Assessment"("academicYearId");

-- CreateIndex
CREATE INDEX "Assessment_termId_idx" ON "Assessment"("termId");

-- CreateIndex
CREATE INDEX "Assessment_academicClassId_idx" ON "Assessment"("academicClassId");

-- CreateIndex
CREATE INDEX "Assessment_streamId_idx" ON "Assessment"("streamId");

-- CreateIndex
CREATE INDEX "Assessment_teachingGroupId_idx" ON "Assessment"("teachingGroupId");

-- CreateIndex
CREATE INDEX "Assessment_subjectId_idx" ON "Assessment"("subjectId");

-- CreateIndex
CREATE INDEX "Assessment_schemeVersionId_idx" ON "Assessment"("schemeVersionId");

-- CreateIndex
CREATE INDEX "AssessmentComponent_assessmentId_idx" ON "AssessmentComponent"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentComponent_schemeComponentDefinitionId_idx" ON "AssessmentComponent"("schemeComponentDefinitionId");

-- CreateIndex
CREATE INDEX "AssessmentComponent_sourceAssessmentId_idx" ON "AssessmentComponent"("sourceAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentComponent_assessmentId_code_key" ON "AssessmentComponent"("assessmentId", "code");

-- CreateIndex
CREATE INDEX "AssessmentScore_assessmentId_idx" ON "AssessmentScore"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentScore_enrollmentId_idx" ON "AssessmentScore"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentScore_componentId_enrollmentId_key" ON "AssessmentScore"("componentId", "enrollmentId");

-- CreateIndex
CREATE INDEX "LearnerResult_schoolId_idx" ON "LearnerResult"("schoolId");

-- CreateIndex
CREATE INDEX "LearnerResult_academicYearId_idx" ON "LearnerResult"("academicYearId");

-- CreateIndex
CREATE INDEX "LearnerResult_assessmentId_idx" ON "LearnerResult"("assessmentId");

-- CreateIndex
CREATE INDEX "LearnerResult_enrollmentId_idx" ON "LearnerResult"("enrollmentId");

-- CreateIndex
CREATE INDEX "LearnerResult_subjectId_idx" ON "LearnerResult"("subjectId");

-- CreateIndex
CREATE INDEX "LearnerResult_status_idx" ON "LearnerResult"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerResult_assessmentId_enrollmentId_key" ON "LearnerResult"("assessmentId", "enrollmentId");

-- CreateIndex
CREATE INDEX "ResultAmendment_resultId_idx" ON "ResultAmendment"("resultId");

-- CreateIndex
CREATE INDEX "Examination_schoolId_idx" ON "Examination"("schoolId");

-- CreateIndex
CREATE INDEX "Examination_academicYearId_idx" ON "Examination"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Examination_schoolId_code_key" ON "Examination"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ExaminationPaper_assessmentId_key" ON "ExaminationPaper"("assessmentId");

-- CreateIndex
CREATE INDEX "ExaminationPaper_examinationId_idx" ON "ExaminationPaper"("examinationId");

-- AddForeignKey
ALTER TABLE "AssessmentScheme" ADD CONSTRAINT "AssessmentScheme_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSchemeVersion" ADD CONSTRAINT "AssessmentSchemeVersion_assessmentSchemeId_fkey" FOREIGN KEY ("assessmentSchemeId") REFERENCES "AssessmentScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSchemeVersion" ADD CONSTRAINT "AssessmentSchemeVersion_gradingSchemeVersionId_fkey" FOREIGN KEY ("gradingSchemeVersionId") REFERENCES "GradingSchemeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSchemeVersion" ADD CONSTRAINT "AssessmentSchemeVersion_rankingPolicyId_fkey" FOREIGN KEY ("rankingPolicyId") REFERENCES "RankingPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeComponentDefinition" ADD CONSTRAINT "SchemeComponentDefinition_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "AssessmentSchemeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingScheme" ADD CONSTRAINT "GradingScheme_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingSchemeVersion" ADD CONSTRAINT "GradingSchemeVersion_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingBand" ADD CONSTRAINT "GradingBand_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "GradingSchemeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingPolicy" ADD CONSTRAINT "RankingPolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_academicClassId_fkey" FOREIGN KEY ("academicClassId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_teachingGroupId_fkey" FOREIGN KEY ("teachingGroupId") REFERENCES "TeachingGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "AssessmentSchemeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_schemeComponentDefinitionId_fkey" FOREIGN KEY ("schemeComponentDefinitionId") REFERENCES "SchemeComponentDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_sourceAssessmentId_fkey" FOREIGN KEY ("sourceAssessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "AssessmentComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "AssessmentSchemeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerResult" ADD CONSTRAINT "LearnerResult_gradingSchemeVersionId_fkey" FOREIGN KEY ("gradingSchemeVersionId") REFERENCES "GradingSchemeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultAmendment" ADD CONSTRAINT "ResultAmendment_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "LearnerResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examination" ADD CONSTRAINT "Examination_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examination" ADD CONSTRAINT "Examination_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examination" ADD CONSTRAINT "Examination_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExaminationPaper" ADD CONSTRAINT "ExaminationPaper_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "Examination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExaminationPaper" ADD CONSTRAINT "ExaminationPaper_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


