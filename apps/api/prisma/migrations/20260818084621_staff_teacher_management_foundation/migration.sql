-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEFT');

-- CreateTable
CREATE TABLE "StaffCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "StaffCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPosition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "StaffPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "staffNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "alternativePhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "nationalId" TEXT,
    "address" TEXT,
    "employmentStatus" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "employmentType" TEXT,
    "joiningDate" TIMESTAMP(3),
    "leavingDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffCategoryId" TEXT,
    "departmentId" TEXT,
    "positionId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "specialization" TEXT,
    "yearsOfExperience" INTEGER,
    "professionalQualification" TEXT,
    "registrationNumber" TEXT,
    "registrationBody" TEXT,
    "registrationDate" TIMESTAMP(3),
    "registrationExpiryDate" TIMESTAMP(3),
    "registrationStatus" TEXT,
    "highestAcademicQualification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffQualification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "qualificationType" TEXT,
    "fieldOfStudy" TEXT,
    "awardDate" TIMESTAMP(3),
    "grade" TEXT,
    "certificateNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "StaffQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSubjectCapability" (
    "id" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "TeacherSubjectCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffResponsibility" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT,
    "streamId" TEXT,
    "departmentId" TEXT,

    CONSTRAINT "StaffResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingAssignment" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicClassId" TEXT NOT NULL,
    "streamId" TEXT,

    CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffCategory_schoolId_idx" ON "StaffCategory"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCategory_schoolId_code_key" ON "StaffCategory"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Department_schoolId_idx" ON "Department"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_schoolId_code_key" ON "Department"("schoolId", "code");

-- CreateIndex
CREATE INDEX "StaffPosition_schoolId_idx" ON "StaffPosition"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPosition_schoolId_code_key" ON "StaffPosition"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Staff_schoolId_idx" ON "Staff"("schoolId");

-- CreateIndex
CREATE INDEX "Staff_schoolId_employmentStatus_idx" ON "Staff"("schoolId", "employmentStatus");

-- CreateIndex
CREATE INDEX "Staff_departmentId_idx" ON "Staff"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_schoolId_staffNumber_key" ON "Staff"("schoolId", "staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_staffId_key" ON "TeacherProfile"("staffId");

-- CreateIndex
CREATE INDEX "TeacherProfile_staffId_idx" ON "TeacherProfile"("staffId");

-- CreateIndex
CREATE INDEX "StaffQualification_staffId_idx" ON "StaffQualification"("staffId");

-- CreateIndex
CREATE INDEX "TeacherSubjectCapability_staffId_idx" ON "TeacherSubjectCapability"("staffId");

-- CreateIndex
CREATE INDEX "TeacherSubjectCapability_subjectId_idx" ON "TeacherSubjectCapability"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubjectCapability_staffId_subjectId_key" ON "TeacherSubjectCapability"("staffId", "subjectId");

-- CreateIndex
CREATE INDEX "StaffResponsibility_staffId_idx" ON "StaffResponsibility"("staffId");

-- CreateIndex
CREATE INDEX "StaffResponsibility_academicYearId_idx" ON "StaffResponsibility"("academicYearId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_schoolId_idx" ON "TeachingAssignment"("schoolId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_staffId_idx" ON "TeachingAssignment"("staffId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_academicYearId_idx" ON "TeachingAssignment"("academicYearId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_academicClassId_idx" ON "TeachingAssignment"("academicClassId");

-- AddForeignKey
ALTER TABLE "StaffCategory" ADD CONSTRAINT "StaffCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPosition" ADD CONSTRAINT "StaffPosition_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_staffCategoryId_fkey" FOREIGN KEY ("staffCategoryId") REFERENCES "StaffCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "StaffPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQualification" ADD CONSTRAINT "StaffQualification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubjectCapability" ADD CONSTRAINT "TeacherSubjectCapability_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubjectCapability" ADD CONSTRAINT "TeacherSubjectCapability_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffResponsibility" ADD CONSTRAINT "StaffResponsibility_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffResponsibility" ADD CONSTRAINT "StaffResponsibility_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffResponsibility" ADD CONSTRAINT "StaffResponsibility_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffResponsibility" ADD CONSTRAINT "StaffResponsibility_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffResponsibility" ADD CONSTRAINT "StaffResponsibility_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_academicClassId_fkey" FOREIGN KEY ("academicClassId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
