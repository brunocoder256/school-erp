export type Gender = "MALE" | "FEMALE";

export type StudentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "WITHDRAWN"
  | "TRANSFERRED"
  | "COMPLETED";

export type EnrollmentStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "TRANSFERRED"
  | "WITHDRAWN"
  | "COMPLETED"
  | "PROMOTED"
  | "REPEATING";

export type AdmissionType = "NEW" | "TRANSFER" | "RETURNING" | "RE_ENTRY";

export type BoardingStatus = "DAY" | "BOARDING";

export type StaffStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LEFT";

export type ProgressionDecision =
  | "PROMOTE"
  | "REPEAT"
  | "TRANSFER"
  | "COMPLETE"
  | "HOLD";

export interface AcademicYearResponse {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TermResponse {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  academicYearId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LevelResponse {
  id: string;
  name: string;
  code: string;
  levelNumber: number;
  description: string | null;
  displayOrder: number;
  canEnroll: boolean;
  isTerminal: boolean;
  isActive: boolean;
  schoolId: string;
  sectionId: string;
  academicOrganizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  academicLevelId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StreamResponse {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  isActive: boolean;
  classId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressionResponse {
  id: string;
  fromLevelId: string;
  toLevelId: string;
  displayOrder: number;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectCategoryResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectResponse {
  id: string;
  name: string;
  code: string;
  shortName: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  schoolId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectOfferingResponse {
  id: string;
  isActive: boolean;
  schoolId: string;
  subjectId: string;
  academicLevelId: string;
  academicYearId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CombinationSubjectItem {
  subjectId: string;
  isRequired: boolean;
  displayOrder: number;
}

export interface SubjectCombinationResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  minSubjects: number | null;
  maxSubjects: number | null;
  isActive: boolean;
  schoolId: string;
  academicLevelId: string;
  createdAt: string;
  updatedAt: string;
  subjects: CombinationSubjectItem[];
}

export interface SubjectAllocationResponse {
  id: string;
  isActive: boolean;
  schoolId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  subjectOfferingId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingGroupResponse {
  id: string;
  name: string | null;
  isActive: boolean;
  schoolId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingGroupStudentResponse {
  enrollmentId: string;
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    preferredName: string | null;
    gender: Gender;
  };
}

export interface StudentSubjectResponse {
  id: string;
  isActive: boolean;
  enrollmentId: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingAssignmentResponse {
  id: string;
  staffId: string;
  academicYearId: string;
  subjectId: string;
  academicClassId: string;
  streamId: string | null;
  teachingGroupId: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSummaryResponse {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  employmentStatus: StaffStatus;
  employmentType: string | null;
  staffCategoryId: string | null;
  departmentId: string | null;
  positionId: string | null;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffDetailResponse {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  alternativePhone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  nationalId: string | null;
  address: string | null;
  employmentStatus: StaffStatus;
  employmentType: string | null;
  joiningDate: string | null;
  leavingDate: string | null;
  notes: string | null;
  staffCategoryId: string | null;
  departmentId: string | null;
  positionId: string | null;
  userId: string | null;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfileResponse {
  id: string;
  staffId: string;
  specialization: string | null;
  yearsOfExperience: number | null;
  professionalQualification: string | null;
  registrationNumber: string | null;
  registrationBody: string | null;
  registrationDate: string | null;
  registrationExpiryDate: string | null;
  registrationStatus: string | null;
  highestAcademicQualification: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentResponse {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  gender: Gender;
  dateOfBirth: string;
  placeOfBirth: string | null;
  nationality: string | null;
  religion: string | null;
  profilePhotoUrl: string | null;
  nationalId: string | null;
  birthCertificateNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  municipality: string | null;
  village: string | null;
  status: StudentStatus;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentResponse {
  id: string;
  studentId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  status: EnrollmentStatus;
  enrollmentDate: string;
  admissionType: AdmissionType;
  previousSchool: string | null;
  previousClass: string | null;
  boardingStatus: BoardingStatus | null;
  house: string | null;
  remarks: string | null;
  withdrawalDate: string | null;
  withdrawalReason: string | null;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicYearDto {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateAcademicYearDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface CreateTermDto {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateTermDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface CreateSubjectCategoryDto {
  name: string;
  code: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateSubjectCategoryDto {
  name?: string;
  code?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateSubjectDto {
  name: string;
  code: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  categoryId: string;
}

export interface UpdateSubjectDto {
  name?: string;
  code?: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  categoryId?: string;
}

export interface CreateSubjectOfferingDto {
  subjectId: string;
  academicLevelId: string;
  academicYearId: string;
  isActive?: boolean;
}

export interface UpdateSubjectOfferingDto {
  subjectId?: string;
  academicLevelId?: string;
  academicYearId?: string;
  isActive?: boolean;
}

export interface CreateSubjectAllocationDto {
  academicYearId: string;
  academicClassId: string;
  streamId?: string;
  subjectOfferingId: string;
  isActive?: boolean;
}

export interface UpdateSubjectAllocationDto {
  streamId?: string | null;
  subjectOfferingId?: string;
  isActive?: boolean;
}

export interface CreateTeachingGroupDto {
  name?: string | null;
  academicYearId: string;
  academicClassId: string;
  streamId?: string;
  subjectId: string;
  isActive?: boolean;
}

export interface UpdateTeachingGroupDto {
  name?: string | null;
  isActive?: boolean;
}

export interface CreateStudentSubjectDto {
  subjectId: string;
  isActive?: boolean;
}

export interface UpdateStudentSubjectDto {
  isActive?: boolean;
}

export interface CreateTeachingAssignmentDto {
  staffId: string;
  academicYearId: string;
  subjectId: string;
  academicClassId: string;
  streamId?: string;
  teachingGroupId?: string;
  isActive?: boolean;
}

export interface UpdateTeachingAssignmentDto {
  academicClassId?: string;
  streamId?: string | null;
  teachingGroupId?: string | null;
  isActive?: boolean;
}

export interface ListStaffQueryDto {
  status?: string;
  departmentId?: string;
  staffCategoryId?: string;
  search?: string;
  isActive?: boolean;
}

export interface ListSubjectAllocationsQueryDto {
  academicYearId?: string;
  academicClassId?: string;
  streamId?: string;
  subjectOfferingId?: string;
  subjectId?: string;
  isActive?: boolean;
}

export interface ListTeachingGroupsQueryDto {
  academicYearId?: string;
  academicClassId?: string;
  streamId?: string;
  subjectId?: string;
  isActive?: boolean;
}

export interface ListStudentSubjectsQueryDto {
  enrollmentId?: string;
  subjectId?: string;
  academicYearId?: string;
  academicClassId?: string;
  streamId?: string;
  isActive?: boolean;
}

// --- Academic structure management DTOs ---

export interface CreateSectionDto {
  name: string;
  code: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateSectionDto {
  name?: string;
  code?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateOrganizationDto {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateOrganizationDto {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateLevelDto {
  name: string;
  code: string;
  levelNumber: number;
  description?: string;
  displayOrder?: number;
  canEnroll?: boolean;
  isTerminal?: boolean;
  isActive?: boolean;
  academicOrganizationId: string;
}

export interface UpdateLevelDto {
  name?: string;
  code?: string;
  levelNumber?: number;
  description?: string;
  displayOrder?: number;
  canEnroll?: boolean;
  isTerminal?: boolean;
  isActive?: boolean;
  academicOrganizationId?: string;
}

export interface CreateClassDto {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateClassDto {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateStreamDto {
  name: string;
  code: string;
  capacity?: number;
  isActive?: boolean;
}

export interface UpdateStreamDto {
  name?: string;
  code?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface CreateProgressionDto {
  fromLevelId: string;
  toLevelId: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateProgressionDto {
  fromLevelId?: string;
  toLevelId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// --- Subject combinations ---

export interface CombinationSubjectInput {
  subjectId: string;
  isRequired?: boolean;
  displayOrder?: number;
}

export interface CreateSubjectCombinationDto {
  code: string;
  name: string;
  description?: string;
  academicLevelId: string;
  minSubjects?: number;
  maxSubjects?: number;
  isActive?: boolean;
  subjects?: CombinationSubjectInput[];
}

export interface UpdateSubjectCombinationDto {
  code?: string;
  name?: string;
  description?: string;
  academicLevelId?: string;
  minSubjects?: number | null;
  maxSubjects?: number | null;
  isActive?: boolean;
  subjects?: CombinationSubjectInput[];
}

// --- Student subjects / combination assignment ---

export interface EnrollmentCombinationResponse {
  enrollmentId: string;
  subjectCombinationId: string | null;
  code: string | null;
  name: string | null;
  subjects: string[];
  enrolledSubjectIds: string[];
}

export interface SetEnrollmentCombinationDto {
  subjectCombinationId: string;
  enrollSubjects?: boolean;
}

// --- Student management DTOs ---

export interface CreateStudentDto {
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  gender: Gender;
  dateOfBirth: string;
  placeOfBirth?: string;
  nationality?: string;
  religion?: string;
  profilePhotoUrl?: string;
  nationalId?: string;
  birthCertificateNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  district?: string;
  municipality?: string;
  village?: string;
  status?: StudentStatus;
}

export interface UpdateStudentDto {
  admissionNumber?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  preferredName?: string | null;
  gender?: Gender;
  dateOfBirth?: string;
  placeOfBirth?: string | null;
  nationality?: string | null;
  religion?: string | null;
  profilePhotoUrl?: string | null;
  nationalId?: string | null;
  birthCertificateNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  district?: string | null;
  municipality?: string | null;
  village?: string | null;
  status?: StudentStatus;
}

// --- Enrollment DTOs ---

export interface CreateEnrollmentDto {
  academicYearId: string;
  academicClassId: string;
  streamId?: string;
  status?: EnrollmentStatus;
  enrollmentDate: string;
  admissionType?: AdmissionType;
  previousSchool?: string;
  previousClass?: string;
  boardingStatus?: BoardingStatus;
  house?: string;
  remarks?: string;
}

export interface UpdateEnrollmentDto {
  academicYearId?: string;
  academicClassId?: string;
  streamId?: string | null;
  status?: EnrollmentStatus;
  enrollmentDate?: string;
  admissionType?: AdmissionType;
  previousSchool?: string | null;
  previousClass?: string | null;
  boardingStatus?: BoardingStatus | null;
  house?: string | null;
  remarks?: string | null;
}
