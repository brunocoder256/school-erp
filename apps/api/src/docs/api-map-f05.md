# School ERP Backend API Map

**Global prefix:** `/api/v1` (set in `main.ts:10` via `app.setGlobalPrefix('api/v1')`)
**List response shape:** Bare array (e.g. `AcademicYearResponse[]`, `StaffSummaryResponse[]`) — no `{ data, meta }` wrapper
**No per-controller path prefixes beyond global** — each controller's `@Controller()` string is appended directly to the global prefix

---

## Identity & Auth Context

All data routes are guarded by `AuthGuard` + `PermissionGuard`. The tenant context is resolved exclusively from the JWT (`activeSchoolId` in the token). Client-supplied school IDs are never honored.

**`AuthenticatedUser`** (from `AuthenticatedRequest`):
```
id: string
email: string
fullName: string
activeSchoolId: string | null
roleNames: string[]
permissionKeys: string[]
```

**`/api/v1/auth/login`** — `POST` — no permission guard (ThrottlerGuard for brute-force protection)
- Body: `{ email: string, password: string }`
- Response: `AuthLoginResult` — `{ accessToken, tokenType: "Bearer", requiresSchoolSelection: boolean, user: AuthUserSummary, schools: AuthSchoolSummary[] }`

**`/api/v1/auth/me`** — `GET` — requires `AuthGuard`
- No `@Permissions()` guard
- Response: `AuthMeResult` — `{ id, email, fullName, activeSchoolId, roleNames: string[], permissionKeys: string[] }`

**`/api/v1/auth/select-school`** — `POST` — requires `AuthGuard`
- Body: `{ schoolId: string }`
- Response: `AuthLoginResult` (re-issued token)

### Permission model
- Permission keys are declared via `@Permissions('key.string')` and enforced by `PermissionGuard` via `PermissionService.canUserAccess()`.
- Resolution path (database-authoritative): `user.id` → `user.activeSchoolId` → `SchoolMembership` (must be ACTIVE) → `UserRole` (SYSTEM scope OR SCHOOL scope with matching school) → `Role` → `RolePermission` → `Permission`.
- Multiple keys on one route use AND semantics (user must hold every key).
- Routes without `@Permissions()` are not blocked by `PermissionGuard`.
- Route params are validated with `ParseUUIDPipe` throughout.

---

## 1. Academic Years (`academic-years`)

### `AcademicYearResponse`
```
{ id, name, startDate, endDate, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/academic-years` | `academic_years.create` | — | — | `CreateAcademicYearDto` | `AcademicYearResponse` |
| GET | `/api/v1/academic-years` | `academic_years.read` | — | — | — | `AcademicYearResponse[]` |
| GET | `/api/v1/academic-years/:id` | `academic_years.read` | `id: UUID` | — | — | `AcademicYearResponse` |
| PATCH | `/api/v1/academic-years/:id` | `academic_years.update` | `id: UUID` | — | `UpdateAcademicYearDto` | `AcademicYearResponse` |
| DELETE | `/api/v1/academic-years/:id` | `academic_years.delete` | `id: UUID` | — | — | void |

`CreateAcademicYearDto`: `name (string, req)`, `startDate (date, req)`, `endDate (date, req)`, `isActive? (boolean)`
`UpdateAcademicYearDto`: all above optional

### `TermResponse`
```
{ id, name, startDate, endDate, isActive, academicYearId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/academic-years/:academicYearId/terms` | `terms.create` | `academicYearId: UUID` | — | `CreateTermDto` | `TermResponse` |
| GET | `/api/v1/academic-years/:academicYearId/terms` | `terms.read` | `academicYearId: UUID` | — | — | `TermResponse[]` |
| GET | `/api/v1/academic-years/:academicYearId/terms/:termId` | `terms.read` | `academicYearId: UUID, termId: UUID` | — | — | `TermResponse` |
| PATCH | `/api/v1/academic-years/:academicYearId/terms/:termId` | `terms.update` | `academicYearId: UUID, termId: UUID` | — | `UpdateTermDto` | `TermResponse` |
| DELETE | `/api/v1/academic-years/:academicYearId/terms/:termId` | `terms.delete` | `academicYearId: UUID, termId: UUID` | — | — | void |

`CreateTermDto` / `UpdateTermDto`: `name (string, req)`, `startDate (date, req)`, `endDate (date, req)`, `isActive? (boolean)`

---

## 2. Academic Structure

### Sections vs Organizations — both exist and are related but distinct

- **Sections** (`SectionsController` `@Controller('sections')`): Top-level education sections (e.g. "Nursery", "Lower Secondary"). A school owns multiple sections; each section owns levels. Routes: `/api/v1/sections`.
- **Organizations** (`OrganizationsController` @Controller('academic-organizations`): Academic organization *models* (e.g. "Thematic", "Competency-based", "Subject-based"). A school defines these; each level references one organization model via `academicOrganizationId`. Routes: `/api/v1/academic-organizations`.

Sections are a structural container (school → sections → levels → classes → streams). Organizations are a classification model (which curriculum framework a level uses).

### `SectionResponse`
```
{ id, name, code, description, displayOrder, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/sections` | `academic_structure.create` | — | — | `CreateSectionDto` | `SectionResponse` |
| GET | `/api/v1/sections` | `academic_structure.read` | — | — | — | `SectionResponse[]` |
| GET | `/api/v1/sections/:id` | `academic_structure.read` | `id: UUID` | — | — | `SectionResponse` |
| PATCH | `/api/v1/sections/:id` | `academic_structure.update` | `id: UUID` | — | `UpdateSectionDto` | `SectionResponse` |
| DELETE | `/api/v1/sections/:id` | `academic_structure.delete` | `id: UUID` | — | — | void |

`CreateSectionDto` / `UpdateSectionDto`: `name (string, req)`, `code (string, req)`, `description?`, `displayOrder? (int)`, `isActive? (boolean)`

### `OrganizationResponse`
```
{ id, name, code, description, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/academic-organizations` | `academic_structure.create` | — | — | `CreateOrganizationDto` | `OrganizationResponse` |
| GET | `/api/v1/academic-organizations` | `academic_structure.read` | — | — | — | `OrganizationResponse[]` |
| GET | `/api/v1/academic-organizations/:id` | `academic_structure.read` | `id: UUID` | — | — | `OrganizationResponse` |
| PATCH | `/api/v1/academic-organizations/:id` | `academic_structure.update` | `id: UUID` | — | `UpdateOrganizationDto` | `OrganizationResponse` |
| DELETE | `/api/v1/academic-organizations/:id` | `academic_structure.delete` | `id: UUID` | — | — | void |

`CreateOrganizationDto` / `UpdateOrganizationDto`: `name (string, req)`, `code (string, req)`, `description?`, `isActive? (boolean)`

### `LevelResponse`
```
{ id, name, code, levelNumber, description, displayOrder, canEnroll, isTerminal, isActive, schoolId, sectionId, academicOrganizationId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/sections/:sectionId/levels` | `academic_structure.create` | `sectionId: UUID` | — | `CreateLevelDto` | `LevelResponse` |
| GET | `/api/v1/sections/:sectionId/levels` | `academic_structure.read` | `sectionId: UUID` | — | — | `LevelResponse[]` |
| GET | `/api/v1/sections/:sectionId/levels/:levelId` | `academic_structure.read` | `sectionId: UUID, levelId: UUID` | — | — | `LevelResponse` |
| PATCH | `/api/v1/sections/:sectionId/levels/:levelId` | `academic_structure.update` | `sectionId: UUID, levelId: UUID` | — | `UpdateLevelDto` | `LevelResponse` |
| DELETE | `/api/v1/sections/:sectionId/levels/:levelId` | `academic_structure.delete` | `sectionId: UUID, levelId: UUID` | — | — | void |

`CreateLevelDto`: `name (string, req)`, `code (string, req)`, `levelNumber (int, req)`, `description?`, `displayOrder? (int)`, `canEnroll? (boolean)`, `isTerminal? (boolean)`, `isActive? (boolean)`, `academicOrganizationId (UUID, req)`
`UpdateLevelDto`: all above optional

### `ClassResponse`
```
{ id, name, code, description, isActive, schoolId, academicLevelId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/levels/:levelId/classes` | `academic_structure.create` | `levelId: UUID` | — | `CreateClassDto` | `ClassResponse` |
| GET | `/api/v1/levels/:levelId/classes` | `academic_structure.read` | `levelId: UUID` | — | — | `ClassResponse[]` |
| GET | `/api/v1/levels/:levelId/classes/:classId` | `academic_structure.read` | `levelId: UUID, classId: UUID` | — | — | `ClassResponse` |
| PATCH | `/api/v1/levels/:levelId/classes/:classId` | `academic_structure.update` | `levelId: UUID, classId: UUID` | — | `UpdateClassDto` | `ClassResponse` |
| DELETE | `/api/v1/levels/:levelId/classes/:classId` | `academic_structure.delete` | `levelId: UUID, classId: UUID` | — | — | void |

`CreateClassDto` / `UpdateClassDto`: `name (string, req)`, `code (string, req)`, `description?`, `isActive? (boolean)`

### `StreamResponse`
```
{ id, name, code, capacity, isActive, classId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/classes/:classId/streams` | `academic_structure.create` | `classId: UUID` | — | `CreateStreamDto` | `StreamResponse` |
| GET | `/api/v1/classes/:classId/streams` | `academic_structure.read` | `classId: UUID` | — | — | `StreamResponse[]` |
| GET | `/api/v1/classes/:classId/streams/:streamId` | `academic_structure.read` | `classId: UUID, streamId: UUID` | — | — | `StreamResponse` |
| PATCH | `/api/v1/classes/:classId/streams/:streamId` | `academic_structure.update` | `classId: UUID, streamId: UUID` | — | `UpdateStreamDto` | `StreamResponse` |
| DELETE | `/api/v1/classes/:classId/streams/:streamId` | `academic_structure.delete` | `classId: UUID, streamId: UUID` | — | — | void |

`CreateStreamDto` / `UpdateStreamDto`: `name (string, req)`, `code (string, req)`, `capacity? (int)`, `isActive? (boolean)`

### `ProgressionResponse`
```
{ id, fromLevelId, toLevelId, displayOrder, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/progressions` | `academic_structure.create` | — | — | `CreateProgressionDto` | `ProgressionResponse` |
| GET | `/api/v1/progressions` | `academic_structure.read` | — | — | — | `ProgressionResponse[]` |
| GET | `/api/v1/progressions/:id` | `academic_structure.read` | `id: UUID` | — | — | `ProgressionResponse` |
| PATCH | `/api/v1/progressions/:id` | `academic_structure.update` | `id: UUID` | — | `UpdateProgressionDto` | `ProgressionResponse` |
| DELETE | `/api/v1/progressions/:id` | `academic_structure.delete` | `id: UUID` | — | — | void |

`CreateProgressionDto`: `fromLevelId (UUID, req)`, `toLevelId (UUID, req)`, `displayOrder?`, `isActive?`
`UpdateProgressionDto`: all above optional

---

## 3. Subjects (`subjects`)

### `SubjectResponse`
```
{ id, name, code, shortName, description, displayOrder, isActive, schoolId, categoryId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/subjects` | `subjects.create` | — | — | `CreateSubjectDto` | `SubjectResponse` |
| GET | `/api/v1/subjects` | `subjects.read` | — | — | — | `SubjectResponse[]` |
| GET | `/api/v1/subjects/:id` | `subjects.read` | `id: UUID` | — | — | `SubjectResponse` |
| PATCH | `/api/v1/subjects/:id` | `subjects.update` | `id: UUID` | — | `UpdateSubjectDto` | `SubjectResponse` |
| DELETE | `/api/v1/subjects/:id` | `subjects.delete` | `id: UUID` | — | — | void |

`CreateSubjectDto`: `name (string, req)`, `code (string, req)`, `shortName?`, `description?`, `displayOrder?`, `isActive?`, `categoryId (UUID, req)`
`UpdateSubjectDto`: all above optional

### `SubjectCategoryResponse`
```
{ id, name, code, description, displayOrder, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/subject-categories` | `subjects.create` | — | — | `CreateSubjectCategoryDto` | `SubjectCategoryResponse` |
| GET | `/api/v1/subject-categories` | `subjects.read` | — | — | — | `SubjectCategoryResponse[]` |
| GET | `/api/v1/subject-categories/:id` | `subjects.read` | `id: UUID` | — | — | `SubjectCategoryResponse` |
| PATCH | `/api/v1/subject-categories/:id` | `subjects.update` | `id: UUID` | — | `UpdateSubjectCategoryDto` | `SubjectCategoryResponse` |
| DELETE | `/api/v1/subject-categories/:id` | `subjects.delete` | `id: UUID` | — | — | void |

`CreateSubjectCategoryDto` / `UpdateSubjectCategoryDto`: `name (string, req)`, `code (string, req)`, `description?`, `displayOrder?`, `isActive?`

### `SubjectOfferingResponse`
```
{ id, isActive, schoolId, subjectId, academicLevelId, academicYearId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/subject-offerings` | `subject_offerings.create` | — | — | `CreateSubjectOfferingDto` | `SubjectOfferingResponse` |
| GET | `/api/v1/subject-offerings` | `subject_offerings.read` | — | — | — | `SubjectOfferingResponse[]` |
| GET | `/api/v1/subject-offerings/:id` | `subject_offerings.read` | `id: UUID` | — | — | `SubjectOfferingResponse` |
| PATCH | `/api/v1/subject-offerings/:id` | `subject_offerings.update` | `id: UUID` | — | `UpdateSubjectOfferingDto` | `SubjectOfferingResponse` |
| DELETE | `/api/v1/subject-offerings/:id` | `subject_offerings.delete` | `id: UUID` | — | — | void |

`CreateSubjectOfferingDto`: `subjectId (UUID, req)`, `academicLevelId (UUID, req)`, `academicYearId (UUID, req)`, `isActive?`
`UpdateSubjectOfferingDto`: all above optional

### `SubjectCombinationResponse`
```
{ id, code, name, description, minSubjects, maxSubjects, isActive, schoolId, academicLevelId, createdAt, updatedAt, subjects: CombinationSubjectItem[] }
```
`CombinationSubjectItem`: `{ subjectId, isRequired, displayOrder }`

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/subject-combinations` | `combinations.create` | — | — | `CreateSubjectCombinationDto` | `SubjectCombinationResponse` |
| GET | `/api/v1/subject-combinations` | `combinations.read` | — | — | — | `SubjectCombinationResponse[]` |
| GET | `/api/v1/subject-combinations/:id` | `combinations.read` | `id: UUID` | — | — | `SubjectCombinationResponse` |
| PATCH | `/api/v1/subject-combinations/:id` | `combinations.update` | `id: UUID` | — | `UpdateSubjectCombinationDto` | `SubjectCombinationResponse` |
| DELETE | `/api/v1/subject-combinations/:id` | `combinations.delete` | `id: UUID` | — | — | void |

`CreateSubjectCombinationDto`: `code (string, req)`, `name (string, req)`, `description?`, `academicLevelId (UUID, req)`, `minSubjects?`, `maxSubjects?`, `isActive?`, `subjects?: CombinationSubjectInput[]`
`CombinationSubjectInput`: `{ subjectId (UUID, req), isRequired?`, `displayOrder?` }`
`UpdateSubjectCombinationDto`: same as create but all optional; `subjects` replaces the set

---

## 4. Staff (`staff`)

### `StaffSummaryResponse` (list)
```
{ id, staffNumber, firstName, middleName, lastName, preferredName, employmentStatus, employmentType, staffCategoryId, departmentId, positionId, schoolId, createdAt, updatedAt }
```
Note: list deliberately omits sensitive peronal fields.

### `StaffDetailResponse` (single get / create / update)
Extends summary with: `email`, `phone`, `alternativePhone`, `dateOfBirth (Date|null)`, `gender (Gender|null)`, `nationalId`, `address`, `joiningDate`, `leavingDate`, `notes`, `userId`

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/staff` | `staff.create` | — | — | `CreateStaffDto` | `StaffDetailResponse` |
| GET | `/api/v1/staff` | `staff.read` | — | `ListStaffQueryDto` | — | `StaffSummaryResponse[]` |
| GET | `/api/v1/staff/:staffId` | `staff.read` | `staffId: UUID` | — | — | `StaffDetailResponse` |
| PATCH | `/api/v1/staff/:staffId` | `staff.update` | `staffId: UUID` | — | `UpdateStaffDto` | `StaffDetailResponse` |

No DELETE endpoint — lifecycle is driven through `employmentStatus`.

`CreateStaffDto`: `staffNumber (string, req)`, `firstName (string, req)`, `middleName?`, `lastName (string, req)`, `preferredName?`, `email?`, `phone?`, `alternativePhone?`, `dateOfBirth?`, `gender (Gender enum)?`, `nationalId?`, `address?`, `employmentStatus (StaffStatus enum)?`, `employmentType?`, `joiningDate?`, `leavingDate?`, `notes?`, `staffCategoryId (UUID)?`, `departmentId (UUID)?`, `positionId (UUID)?`, `userId (UUID)?`

`ListStaffQueryDto`: `status (StaffStatus enum)?`, `staffCategoryId (UUID)?`, `departmentId (UUID)?`, `search (string)?`

`UpdateStaffDto`: all above optional (nullable fields can be cleared with explicit `null`)

### `TeacherProfileResponse`
```
{ id, staffId, specialization, yearsOfExperience, professionalQualification, registrationNumber, registrationBody, registrationDate, registrationExpiryDate, registrationStatus, highestAcademicQualification, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| GET | `/api/v1/staff/:staffId/teacher-profile` | `staff.read` | `staffId: UUID` | — | — | `TeacherProfileResponse` |
| PUT | `/api/v1/staff/:staffId/teacher-profile` | `staff.update` | `staffId: UUID` | — | `UpsertTeacherProfileDto` | `TeacherProfileResponse` |

`UpsertTeacherProfileDto`: `specialization?`, `yearsOfExperience?`, `professionalQualification?`, `registrationNumber?`, `registrationBody?`, `registrationDate?`, `registrationExpiryDate?`, `highestAcademicQualification?` — all optional, nullable with explicit `null`

### `TeachingAssignmentResponse`
```
{ id, staffId, academicYearId, subjectId, academicClassId, streamId (null), teachingGroupId (null), isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/teaching-assignments` | `teacher_assignments.create` | — | — | `CreateTeachingAssignmentDto` | `TeachingAssignmentResponse` |
| GET | `/api/v1/teaching-assignments` | `teacher_assignments.read` | — | — | — | `TeachingAssignmentResponse[]` |
| GET | `/api/v1/teaching-assignments/:assignmentId` | `teacher_assignments.read` | `assignmentId: UUID` | — | — | `TeachingAssignmentResponse` |
| PATCH | `/api/v1/teaching-assignments/:assignmentId` | `teacher_assignments.update` | `assignmentId: UUID` | — | `UpdateTeachingAssignmentDto` | `TeachingAssignmentResponse` |

No DELETE — deactivation via `isActive`.

`CreateTeachingAssignmentDto`: `staffId (UUID, req)`, `academicYearId (UUID, req)`, `subjectId (UUID, req)`, `academicClassId (UUID, req)`, `streamId?`, `teachingGroupId?`, `isActive?`
`UpdateTeachingAssignmentDto`: `academicClassId?`, `streamId (nullable)?`, `teachingGroupId (nullable)?`, `isActive?`

### `StaffPositionResponse`
```
{ id, name, code, description, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/staff-positions` | `staff.create` | — | — | `CreateStaffPositionDto` | `StaffPositionResponse` |
| GET | `/api/v1/staff-positions` | `staff.read` | — | — | — | `StaffPositionResponse[]` |
| GET | `/api/v1/staff-positions/:positionId` | `staff.read` | `positionId: UUID` | — | — | `StaffPositionResponse` |
| PATCH | `/api/v1/staff-positions/:positionId` | `staff.update` | `positionId: UUID` | — | `UpdateStaffPositionDto` | `StaffPositionResponse` |
| DELETE | `/api/v1/staff-positions/:positionId` | `staff.delete` | `positionId: UUID` | — | — | void |

`CreateStaffPositionDto` / `UpdateStaffPositionDto`: `name (string, req)`, `code (string, req)`, `description?`, `isActive?`

### `StaffCategoryResponse`
```
{ id, name, code, description, displayOrder, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/staff-categories` | `staff.create` | — | — | `CreateStaffCategoryDto` | `StaffCategoryResponse` |
| GET | `/api/v1/staff-categories` | `staff.read` | — | — | — | `StaffCategoryResponse[]` |
| GET | `/api/v1/staff-categories/:staffCategoryId` | `staff.read` | `staffCategoryId: UUID` | — | — | `StaffCategoryResponse` |
| PATCH | `/api/v1/staff-categories/:staffCategoryId` | `staff.update` | `staffCategoryId: UUID` | — | `UpdateStaffCategoryDto` | `StaffCategoryResponse` |
| DELETE | `/api/v1/staff-categories/:staffCategoryId` | `staff.delete` | `staffCategoryId: UUID` | — | — | void |

`CreateStaffCategoryDto` / `UpdateStaffCategoryDto`: `name (string, req)`, `code (string, req)`, `description?`, `displayOrder?`, `isActive?`

### `DepartmentResponse`
```
{ id, name, code, description, isActive, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/departments` | `staff.create` | — | — | `CreateDepartmentDto` | `DepartmentResponse` |
| GET | `/api/v1/departments` | `staff.read` | — | — | — | `DepartmentResponse[]` |
| GET | `/api/v1/departments/:departmentId` | `staff.read` | `departmentId: UUID` | — | — | `DepartmentResponse` |
| PATCH | `/api/v1/departments/:departmentId` | `staff.update` | `departmentId: UUID` | — | `UpdateDepartmentDto` | `DepartmentResponse` |
| DELETE | `/api/v1/departments/:departmentId` | `staff.delete` | `departmentId: UUID` | — | — | void |

`CreateDepartmentDto` / `UpdateDepartmentDto`: `name (string, req)`, `code (string, req)`, `description?`, `isActive?`

### `ResponsibilityResponse`
```
{ id, staffId, type, isActive, academicYearId, classId (null), streamId (null), departmentId (null), createdAt, updatedAt }
```
No DELETE — deactivation via `isActive`.

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/staff/:staffId/responsibilities` | `staff.create` | `staffId: UUID` | — | `CreateResponsibilityDto` | `ResponsibilityResponse` |
| GET | `/api/v1/staff/:staffId/responsibilities` | `staff.read` | `staffId: UUID` | — | — | `ResponsibilityResponse[]` |
| PATCH | `/api/v1/staff/:staffId/responsibilities/:responsibilityId` | `staff.update` | `staffId: UUID, responsibilityId: UUID` | — | `UpdateResponsibilityDto` | `ResponsibilityResponse` |

`CreateResponsibilityDto`: `type (string, req)`, `academicYearId (UUID, req)`, `classId?`, `streamId?`, `departmentId?`, `isActive?`
`UpdateResponsibilityDto`: all above optional (nullable with explicit `null`)

### `QualificationResponse`
```
{ id, staffId, name, institution, qualificationType, fieldOfStudy, awardDate, grade, certificateNumber, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/staff/:staffId/qualifications` | `staff.create` | `staffId: UUID` | — | `CreateQualificationDto` | `QualificationResponse` |
| GET | `/api/v1/staff/:staffId/qualifications` | `staff.read` | `staffId: UUID` | — | — | `QualificationResponse[]` |
| PATCH | `/api/v1/staff/:staffId/qualifications/:qualificationId` | `staff.update` | `staffId: UUID, qualificationId: UUID` | — | `UpdateQualificationDto` | `QualificationResponse` |
| DELETE | `/api/v1/staff/:staffId/qualifications/:qualificationId` | `staff.delete` | `staffId: UUID, qualificationId: UUID` | — | — | void |

`CreateQualificationDto`: `name (string, req)`, `institution?`, `qualificationType?`, `fieldOfStudy?`, `awardDate?`, `grade?`, `certificateNumber?`
`UpdateQualificationDto`: all above optional (nullable with explicit `null`)

### `SubjectCapabilityResponse`
```
{ id, staffId, subjectId, isPrimary, createdAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/staff/:staffId/subject-capabilities` | `staff.create` | `staffId: UUID` | — | `CreateSubjectCapabilityDto` | `SubjectCapabilityResponse` |
| GET | `/api/v1/staff/:staffId/subject-capabilities` | `staff.read` | `staffId: UUID` | — | — | `SubjectCapabilityResponse[]` |
| DELETE | `/api/v1/staff/:staffId/subject-capabilities/:capabilityId` | `staff.delete` | `staffId: UUID, capabilityId: UUID` | — | — | void |

`CreateSubjectCapabilityDto`: `subjectId (UUID, req)`, `isPrimary?`

---

## 5. Students (`students`)

### `StudentResponse`
```
{ id, admissionNumber, firstName, middleName, lastName, preferredName, gender, dateOfBirth, placeOfBirth, nationality, religion, profilePhotoUrl, nationalId, birthCertificateNumber, phone, email, address, district, municipality, village, status, schoolId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/students` | `students.create` | — | — | `CreateStudentDto` | `StudentResponse` |
| GET | `/api/v1/students` | `students.read` | — | — | — | `StudentResponse[]` |
| GET | `/api/v1/students/:studentId` | `students.read` | `studentId: UUID` | — | — | `StudentResponse` |
| PATCH | `/api/v1/students/:studentId` | `students.update` | `studentId: UUID` | — | `UpdateStudentDto` | `StudentResponse` |

`CreateStudentDto`: `admissionNumber (string, req)`, `firstName (string, req)`, `middleName?`, `lastName (string, req)`, `preferredName?`, `gender (Gender enum, req)`, `dateOfBirth (date, req)`, `placeOfBirth?`, `nationality?`, `religion?`, `profilePhotoUrl?`, `nationalId?`, `birthCertificateNumber?`, `phone?`, `email?`, `address?`, `district?`, `municipality?`, `village?`, `status (StudentStatus enum)?`
`UpdateStudentDto`: all above optional (nullable with explicit `null`, except `gender`/`dateOfBirth`/`status`)

### `EnrollmentResponse`
```
{ id, studentId, academicYearId, academicClassId, streamId (null), status, enrollmentDate, admissionType, previousSchool, previousClass, boardingStatus, house, remarks, withdrawalDate, withdrawalReason, completedDate, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/students/:studentId/enrollments` | `students.create` | `studentId: UUID` | — | `CreateEnrollmentDto` | `EnrollmentResponse` |
| GET | `/api/v1/students/:studentId/enrollments` | `students.read` | `studentId: UUID` | — | — | `EnrollmentResponse[]` |
| GET | `/api/v1/enrollments/:enrollmentId` | `students.read` | `enrollmentId: UUID` | — | — | `EnrollmentResponse` |
| PATCH | `/api/v1/enrollments/:enrollmentId` | `students.update` | `enrollmentId: UUID` | — | `UpdateEnrollmentDto` | `EnrollmentResponse` |

`CreateEnrollmentDto`: `academicYearId (UUID, req)`, `academicClassId (UUID, req)`, `streamId?`, `status (EnrollmentStatus enum)?`, `enrollmentDate (date, req)`, `admissionType?`, `previousSchool?`, `previousClass?`, `boardingStatus?`, `house?`, `remarks?`
`UpdateEnrollmentDto`: all above optional (nullable with explicit `null`)

### `GuardianResponse`
```
{ id, fullName, phone, alternatePhone, email, address, occupation, preferredContactMethod, relationshipType, isPrimary, isEmergencyContact, isAuthorizedPickup, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/students/:studentId/guardians` | `students.create` | `studentId: UUID` | — | `CreateGuardianDto` | `GuardianResponse` |
| GET | `/api/v1/students/:studentId/guardians` | `students.read` | `studentId: UUID` | — | — | `GuardianResponse[]` |
| PATCH | `/api/v1/students/:studentId/guardians/:guardianId` | `students.update` | `studentId: UUID, guardianId: UUID` | — | `UpdateGuardianDto` | `GuardianResponse` |
| DELETE | `/api/v1/students/:studentId/guardians/:guardianId` | `students.update` | `studentId: UUID, guardianId: UUID` | — | — | void |

`CreateGuardianDto`: `relationshipType (GuardianRelationshipType enum, req)`, `fullName (string, req)`, `phone?`, `alternatePhone?`, `email?`, `address?`, `occupation?`, `preferredContactMethod?`, `isPrimary?`, `isEmergencyContact?`, `isAuthorizedPickup?`
`UpdateGuardianDto`: all above optional (nullable with explicit `null`, except `relationshipType`/`fullName`)

---

## 6. Academic Operations (`academic-operations`)

### `SubjectAllocationResponse`
```
{ id, isActive, schoolId, academicYearId, academicClassId, streamId (null), subjectOfferingId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/subject-allocations` | `subject_allocations.create` | — | — | `CreateSubjectAllocationDto` | `SubjectAllocationResponse` |
| GET | `/api/v1/subject-allocations` | `subject_allocations.read` | — | `ListSubjectAllocationsQueryDto` | — | `SubjectAllocationResponse[]` |
| GET | `/api/v1/subject-allocations/:id` | `subject_allocations.read` | `id: UUID` | — | — | `SubjectAllocationResponse` |
| PATCH | `/api/v1/subject-allocations/:id` | `subject_allocations.update` | `id: UUID` | — | `UpdateSubjectAllocationDto` | `SubjectAllocationResponse` |

No DELETE — deactivation via `isActive`.

`CreateSubjectAllocationDto`: `academicYearId (UUID, req)`, `academicClassId (UUID, req)`, `streamId?`, `subjectOfferingId (UUID, req)`, `isActive?`
`UpdateSubjectAllocationDto`: `streamId (nullable)?`, `subjectOfferingId?`, `isActive?`
`ListSubjectAllocationsQueryDto`: `academicYearId?`, `academicClassId?`, `streamId?`, `subjectOfferingId?`, `subjectId?`, `isActive?` (all optional, all UUID except `isActive` which is boolean)

### `TeachingGroupResponse`
```
{ id, name (null), isActive, schoolId, academicYearId, academicClassId, streamId (null), subjectId, createdAt, updatedAt }
```
`TeachingGroupStudentResponse`: `{ enrollmentId, student: { id, admissionNumber, firstName, middleName, lastName, preferredName, gender } }`

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/teaching-groups` | `teaching_groups.create` | — | — | `CreateTeachingGroupDto` | `TeachingGroupResponse` |
| GET | `/api/v1/teaching-groups` | `teaching_groups.read` | — | `ListTeachingGroupsQueryDto` | — | `TeachingGroupResponse[]` |
| GET | `/api/v1/teaching-groups/:id` | `teaching_groups.read` | `id: UUID` | — | — | `TeachingGroupResponse` |
| GET | `/api/v1/teaching-groups/:id/students` | `teaching_groups.read` | `id: UUID` | — | — | `TeachingGroupStudentResponse[]` |
| PATCH | `/api/v1/teaching-groups/:id` | `teaching_groups.update` | `id: UUID` | — | `UpdateTeachingGroupDto` | `TeachingGroupResponse` |

No DELETE — deactivation via `isActive`.

`CreateTeachingGroupDto`: `name?`, `academicYearId (UUID, req)`, `academicClassId (UUID, req)`, `streamId?`, `subjectId (UUID, req)`, `isActive?`
`UpdateTeachingGroupDto`: `name (nullable)?`, `isActive?`
`ListTeachingGroupsQueryDto`: `academicYearId?`, `academicClassId?`, `streamId?`, `subjectId?`, `isActive?` (all optional)

### `StudentSubjectResponse`
```
{ id, isActive, enrollmentId, subjectId, createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/enrollments/:enrollmentId/subjects` | `student_subjects.create` | `enrollmentId: UUID` | — | `CreateStudentSubjectDto` | `StudentSubjectResponse` |
| GET | `/api/v1/enrollments/:enrollmentId/subjects` | `student_subjects.read` | `enrollmentId: UUID` | — | — | `StudentSubjectResponse[]` |
| PATCH | `/api/v1/enrollments/:enrollmentId/subjects/:id` | `student_subjects.update` | `enrollmentId: UUID, id: UUID` | — | `UpdateStudentSubjectDto` | `StudentSubjectResponse` |
| GET | `/api/v1/subject-enrollments` | `student_subjects.read` | — | `ListStudentSubjectsQueryDto` | — | `StudentSubjectResponse[]` |

No DELETE — deactivation via `isActive`.

`CreateStudentSubjectDto`: `subjectId (UUID, req)`
`UpdateStudentSubjectDto`: `isActive (boolean, req)`
`ListStudentSubjectsQueryDto`: `enrollmentId?`, `subjectId?`, `academicYearId?`, `academicClassId?`, `streamId?`, `isActive?` (all optional)

### `EnrollmentCombinationResponse`
```
{ enrollmentId, subjectCombinationId (null), code (null), name (null), subjects: string[], enrolledSubjectIds: string[] }
```

Note: this endpoint returns an object, not an array.

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/enrollments/:enrollmentId/combination` | `student_subjects.create` | `enrollmentId: UUID` | — | `SetEnrollmentCombinationDto` | `EnrollmentCombinationResponse` |
| GET | `/api/v1/enrollments/:enrollmentId/combination` | `student_subjects.read` | `enrollmentId: UUID` | — | — | `EnrollmentCombinationResponse` |

`SetEnrollmentCombinationDto`: `subjectCombinationId (UUID, req)`, `enrollSubjects? (boolean)`

### `StudentProgressionResponse`
```
{ id, schoolId, studentId, enrollmentId, academicYearId, reportCardId (null), decision (ProgressionDecision enum), recommendation, effectiveDate, fromAcademicLevelId (null), toAcademicLevelId (null), createdAt, updatedAt }
```

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/student-progressions` | `student_progressions.create` | — | — | `CreateStudentProgressionDto` | `StudentProgressionResponse` |
| GET | `/api/v1/student-progressions` | `student_progressions.read` | — | `studentId?`, `academicYearId?` | — | `StudentProgressionResponse[]` |
| GET | `/api/v1/student-progressions/:id` | `student_progressions.read` | `id: UUID` | — | — | `StudentProgressionResponse` |
| PATCH | `/api/v1/student-progressions/:id` | `student_progressions.update` | `id: UUID` | — | `UpdateStudentProgressionDto` | `StudentProgressionResponse` |

`CreateStudentProgressionDto`: `reportCardId (UUID, req)`, `decision (ProgressionDecision enum)?`, `toAcademicLevelId?`, `recommendation?`, `effectiveDate?`
`UpdateStudentProgressionDto`: all above optional

### `ReportCardResponse`
```
{ id, schoolId, studentId, enrollmentId, academicYearId, academicClassId (null), streamId (null), averageScore, overallGrade, status (ReportCardStatus enum), remarks, generatedAt, submittedAt, approvedAt, createdAt, updatedAt, lines: ReportCardLineResponse[] }
```
`ReportCardLineResponse`: `{ id, reportCardId, subjectId, score (null), grade (null), isPassed, teacherComment, createdAt, updatedAt }`

| Method | Path | Permission | Route Params | Query | Body | Response |
|--------|------|------------|--------------|-------|------|----------|
| POST | `/api/v1/report-cards` | `report_cards.create` | — | — | `CreateReportCardDto` | `ReportCardResponse` |
| GET | `/api/v1/report-cards` | `report_cards.read` | — | `ListReportCardsQueryDto` | — | `ReportCardResponse[]` |
| GET | `/api/v1/report-cards/:id` | `report_cards.read` | `id: UUID` | — | — | `ReportCardResponse` |
| GET | `/api/v1/report-cards/transcript/:studentId` | `transcripts.read` | `studentId: UUID` | — | — | *(transcript summary)* |
| PATCH | `/api/v1/report-cards/:id` | `report_cards.update` | `id: UUID` | — | `UpdateReportCardDto` | `ReportCardResponse` |
| PATCH | `/api/v1/report-cards/:id/approve` | `report_cards.approve` | `id: UUID` | — | — | `ReportCardResponse` |

`CreateReportCardDto`: `enrollmentId (UUID, req)`, `status?`, `remarks?`, `lines: ReportCardLineDto[] (req)`
`ReportCardLineDto`: `subjectId (UUID, req)`, `score (number, req, 0-100)`, `grade?`, `isPassed?`, `teacherComment?`
`UpdateReportCardDto`: `status?`, `remarks?`, `lines?`
`ListReportCardsQueryDto`: `studentId?`, `enrollmentId?`, `academicYearId?`, `academicClassId?`, `streamId?`, `isApproved?` (all optional)

---

## Full Permission Key Vocabulary (in-scope modules)

Alphabetical list of all distinct `@Permissions('...')` strings observed in the modules above:

| Key | Used By |
|-----|---------|
| `academic_structure.create` | sections, organizations, levels, classes, streams, progressions (POST) |
| `academic_structure.read` | same (GET list/get) |
| `academic_structure.update` | same (PATCH) |
| `academic_structure.delete` | sections, organizations, levels, classes, streams, progressions (DELETE) |
| `academic_years.create` | academic-years POST |
| `academic_years.read` | academic-years GET |
| `academic_years.update` | academic-years PATCH |
| `academic_years.delete` | academic-years DELETE |
| `terms.create` | terms POST |
| `terms.read` | terms GET |
| `terms.update` | terms PATCH |
| `terms.delete` | terms DELETE |
| `subjects.create` | subjects POST, subject-categories POST |
| `subjects.read` | subjects GET, subject-categories GET |
| `subjects.update` | subjects PATCH, subject-categories PATCH |
| `subjects.delete` | subjects DELETE, subject-categories DELETE |
| `subject_offerings.create` | subject-offerings POST |
| `subject_offerings.read` | subject-offerings GET |
| `subject_offerings.update` | subject-offerings PATCH |
| `subject_offerings.delete` | subject-offerings DELETE |
| `combinations.create` | subject-combinations POST |
| `combinations.read` | subject-combinations GET |
| `combinations.update` | subject-combinations PATCH |
| `combinations.delete` | subject-combinations DELETE |
| `staff.create` | staff POST, staff-positions POST, staff-categories POST, departments POST, qualifications POST, responsibilities POST, subject-capabilities POST |
| `staff.read` | staff GET, staff-positions GET, staff-categories GET, departments GET, teacher-profiles GET, qualifications GET, responsibilities GET, subject-capabilities GET |
| `staff.update` | staff PATCH, staff-positions PATCH, staff-categories PATCH, departments PATCH, teacher-profiles PUT, qualifications PATCH, responsibilities PATCH |
| `staff.delete` | staff-positions DELETE, staff-categories DELETE, departments DELETE, qualifications DELETE, subject-capabilities DELETE |
| `teacher_assignments.create` | teaching-assignments POST |
| `teacher_assignments.read` | teaching-assignments GET |
| `teacher_assignments.update` | teaching-assignments PATCH |
| `students.create` | students POST, enrollments POST (nested), guardians POST (nested) |
| `students.read` | students GET, enrollments GET, guardians GET |
| `students.update` | students PATCH, enrollments PATCH, guardians PATCH/DELETE |
| `subject_allocations.create` | subject-allocations POST |
| `subject_allocations.read` | subject-allocations GET |
| `subject_allocations.update` | subject-allocations PATCH |
| `teaching_groups.create` | teaching-groups POST |
| `teaching_groups.read` | teaching-groups GET, teaching-groups/:id/students GET |
| `teaching_groups.update` | teaching-groups PATCH |
| `student_subjects.create` | student-subjects POST, enrollment-combinations POST |
| `student_subjects.read` | student-subjects GET, subject-enrollments GET, enrollment-combinations GET |
| `student_subjects.update` | student-subjects PATCH |
| `student_progressions.create` | student-progressions POST |
| `student_progressions.read` | student-progressions GET |
| `student_progressions.update` | student-progressions PATCH |
| `report_cards.create` | report-cards POST |
| `report_cards.read` | report-cards GET, report-cards/:id GET |
| `report_cards.update` | report-cards PATCH |
| `report_cards.approve` | report-cards/:id/approve PATCH |
| `transcripts.read` | report-cards/transcript/:studentId GET |

---

## Key Observations

1. **Global prefix is `/api/v1`** — confirmed in `main.ts:10`. No per-controller `@Controller('api/v1/...')` prefixes; each controller uses a bare path segment.
2. **All list endpoints return bare arrays** — confirmed from `AcademicYearsService.list()` returning `Promise<AcademicYearResponse[]>` and `StaffService.list()` returning `Promise<StaffSummaryResponse[]>`. No `{ data, meta }` wrapping anywhere.
3. **academic-structure has BOTH `sections` and `organizations` controllers** — they are related but distinct:
   - `SectionsController` (`@Controller('sections')`) → `/api/v1/sections` — education sections (Nursery, Primary, Lower Secondary, etc.)
   - `OrganizationsController` (`@Controller('academic-organizations')`) → `/api/v1/academic-organizations` — academic organization *models* (Thematic, Subject-based, Competency-based, etc.) assigned to levels
   - Relationship: a School owns Sections; each Section owns Levels; each Level references one Organization.
4. **No DELETE endpoints for**: students, enrollments (standalone), staff, teaching-assignments, subject-allocations, subject-capabilities, teaching-groups, student-subjects, student-progressions, report-cards. These use `isActive` toggling or status fields (`employmentStatus` for staff, `status` for students/enrollments, `decision` for progressions, `status` for report cards).
5. **All route params use `ParseUUIDPipe`** — UUIDs are enforced at the framework level for `{ id }` style params.
6. **Student-related endpoints are namespaced under `/students/:studentId/`** for nested guards, with a second `EnrollmentsController` at top-level `/enrollments/:enrollmentId` for standalone enrollment updates.
7. **Teacher profile uses `PUT`** (upsert) rather than POST+PATCH — single idempotent endpoint at `/staff/:staffId/teacher-profile`.
8. **Report cards have a sub-action route** `/report-cards/:id/approve` using PATCH with a distinct permission `report_cards.approve`.
9. **Transcript endpoint** at `/report-cards/transcript/:studentId` — GET, permission `transcripts.read`, returns a transcript summary object.