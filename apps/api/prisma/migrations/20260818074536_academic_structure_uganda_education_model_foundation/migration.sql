/*
  Warnings:

  - You are about to drop the column `level` on the `AcademicClass` table. All the data in the column will be lost.
  - Added the required column `academicLevelId` to the `AcademicClass` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AcademicClass" DROP COLUMN "level",
ADD COLUMN     "academicLevelId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EducationSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "EducationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "AcademicOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "canEnroll" BOOLEAN NOT NULL DEFAULT true,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "academicOrganizationId" TEXT NOT NULL,

    CONSTRAINT "AcademicLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicLevelProgression" (
    "id" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fromLevelId" TEXT NOT NULL,
    "toLevelId" TEXT NOT NULL,

    CONSTRAINT "AcademicLevelProgression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "SubjectCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectOffering" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,

    CONSTRAINT "SubjectOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectCombination" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minSubjects" INTEGER,
    "maxSubjects" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,

    CONSTRAINT "SubjectCombination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectCombinationSubject" (
    "id" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "combinationId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "SubjectCombinationSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationSection_schoolId_idx" ON "EducationSection"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "EducationSection_schoolId_code_key" ON "EducationSection"("schoolId", "code");

-- CreateIndex
CREATE INDEX "AcademicOrganization_schoolId_idx" ON "AcademicOrganization"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicOrganization_schoolId_code_key" ON "AcademicOrganization"("schoolId", "code");

-- CreateIndex
CREATE INDEX "AcademicLevel_schoolId_idx" ON "AcademicLevel"("schoolId");

-- CreateIndex
CREATE INDEX "AcademicLevel_sectionId_idx" ON "AcademicLevel"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicLevel_schoolId_code_key" ON "AcademicLevel"("schoolId", "code");

-- CreateIndex
CREATE INDEX "AcademicLevelProgression_schoolId_idx" ON "AcademicLevelProgression"("schoolId");

-- CreateIndex
CREATE INDEX "AcademicLevelProgression_fromLevelId_idx" ON "AcademicLevelProgression"("fromLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicLevelProgression_schoolId_fromLevelId_toLevelId_key" ON "AcademicLevelProgression"("schoolId", "fromLevelId", "toLevelId");

-- CreateIndex
CREATE INDEX "SubjectCategory_schoolId_idx" ON "SubjectCategory"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectCategory_schoolId_code_key" ON "SubjectCategory"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");

-- CreateIndex
CREATE INDEX "Subject_categoryId_idx" ON "Subject"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON "Subject"("schoolId", "code");

-- CreateIndex
CREATE INDEX "SubjectOffering_schoolId_idx" ON "SubjectOffering"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectOffering_academicLevelId_idx" ON "SubjectOffering"("academicLevelId");

-- CreateIndex
CREATE INDEX "SubjectOffering_academicYearId_idx" ON "SubjectOffering"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectOffering_schoolId_subjectId_academicLevelId_academic_key" ON "SubjectOffering"("schoolId", "subjectId", "academicLevelId", "academicYearId");

-- CreateIndex
CREATE INDEX "SubjectCombination_schoolId_idx" ON "SubjectCombination"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectCombination_academicLevelId_idx" ON "SubjectCombination"("academicLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectCombination_schoolId_code_key" ON "SubjectCombination"("schoolId", "code");

-- CreateIndex
CREATE INDEX "SubjectCombinationSubject_subjectId_idx" ON "SubjectCombinationSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectCombinationSubject_combinationId_subjectId_key" ON "SubjectCombinationSubject"("combinationId", "subjectId");

-- CreateIndex
CREATE INDEX "AcademicClass_academicLevelId_idx" ON "AcademicClass"("academicLevelId");

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationSection" ADD CONSTRAINT "EducationSection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicOrganization" ADD CONSTRAINT "AcademicOrganization_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicLevel" ADD CONSTRAINT "AcademicLevel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicLevel" ADD CONSTRAINT "AcademicLevel_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "EducationSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicLevel" ADD CONSTRAINT "AcademicLevel_academicOrganizationId_fkey" FOREIGN KEY ("academicOrganizationId") REFERENCES "AcademicOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicLevelProgression" ADD CONSTRAINT "AcademicLevelProgression_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicLevelProgression" ADD CONSTRAINT "AcademicLevelProgression_fromLevelId_fkey" FOREIGN KEY ("fromLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicLevelProgression" ADD CONSTRAINT "AcademicLevelProgression_toLevelId_fkey" FOREIGN KEY ("toLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCategory" ADD CONSTRAINT "SubjectCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SubjectCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectOffering" ADD CONSTRAINT "SubjectOffering_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectOffering" ADD CONSTRAINT "SubjectOffering_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectOffering" ADD CONSTRAINT "SubjectOffering_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectOffering" ADD CONSTRAINT "SubjectOffering_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCombination" ADD CONSTRAINT "SubjectCombination_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCombination" ADD CONSTRAINT "SubjectCombination_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCombinationSubject" ADD CONSTRAINT "SubjectCombinationSubject_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "SubjectCombination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCombinationSubject" ADD CONSTRAINT "SubjectCombinationSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
