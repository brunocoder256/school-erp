-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "subjectCombinationId" TEXT;

-- AlterTable
ALTER TABLE "TeachingAssignment" ADD COLUMN     "teachingGroupId" TEXT;

-- CreateTable
CREATE TABLE "SubjectAllocation" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "academicClassId" TEXT NOT NULL,
    "streamId" TEXT,
    "subjectOfferingId" TEXT NOT NULL,

    CONSTRAINT "SubjectAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "academicClassId" TEXT NOT NULL,
    "streamId" TEXT,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "TeachingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubjectEnrollment" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "StudentSubjectEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectAllocation_schoolId_idx" ON "SubjectAllocation"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectAllocation_academicYearId_idx" ON "SubjectAllocation"("academicYearId");

-- CreateIndex
CREATE INDEX "SubjectAllocation_academicClassId_idx" ON "SubjectAllocation"("academicClassId");

-- CreateIndex
CREATE INDEX "SubjectAllocation_subjectOfferingId_idx" ON "SubjectAllocation"("subjectOfferingId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectAllocation_schoolId_academicYearId_academicClassId_s_key" ON "SubjectAllocation"("schoolId", "academicYearId", "academicClassId", "streamId", "subjectOfferingId");

-- CreateIndex
CREATE INDEX "TeachingGroup_schoolId_idx" ON "TeachingGroup"("schoolId");

-- CreateIndex
CREATE INDEX "TeachingGroup_academicYearId_idx" ON "TeachingGroup"("academicYearId");

-- CreateIndex
CREATE INDEX "TeachingGroup_academicClassId_idx" ON "TeachingGroup"("academicClassId");

-- CreateIndex
CREATE INDEX "TeachingGroup_subjectId_idx" ON "TeachingGroup"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingGroup_schoolId_academicYearId_academicClassId_strea_key" ON "TeachingGroup"("schoolId", "academicYearId", "academicClassId", "streamId", "subjectId");

-- CreateIndex
CREATE INDEX "StudentSubjectEnrollment_subjectId_idx" ON "StudentSubjectEnrollment"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubjectEnrollment_enrollmentId_subjectId_key" ON "StudentSubjectEnrollment"("enrollmentId", "subjectId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_teachingGroupId_idx" ON "TeachingAssignment"("teachingGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_schoolId_staffId_academicYearId_subjectI_key" ON "TeachingAssignment"("schoolId", "staffId", "academicYearId", "subjectId", "academicClassId", "streamId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_subjectCombinationId_fkey" FOREIGN KEY ("subjectCombinationId") REFERENCES "SubjectCombination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_teachingGroupId_fkey" FOREIGN KEY ("teachingGroupId") REFERENCES "TeachingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAllocation" ADD CONSTRAINT "SubjectAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAllocation" ADD CONSTRAINT "SubjectAllocation_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAllocation" ADD CONSTRAINT "SubjectAllocation_academicClassId_fkey" FOREIGN KEY ("academicClassId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAllocation" ADD CONSTRAINT "SubjectAllocation_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectAllocation" ADD CONSTRAINT "SubjectAllocation_subjectOfferingId_fkey" FOREIGN KEY ("subjectOfferingId") REFERENCES "SubjectOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingGroup" ADD CONSTRAINT "TeachingGroup_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingGroup" ADD CONSTRAINT "TeachingGroup_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingGroup" ADD CONSTRAINT "TeachingGroup_academicClassId_fkey" FOREIGN KEY ("academicClassId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingGroup" ADD CONSTRAINT "TeachingGroup_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingGroup" ADD CONSTRAINT "TeachingGroup_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectEnrollment" ADD CONSTRAINT "StudentSubjectEnrollment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectEnrollment" ADD CONSTRAINT "StudentSubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;