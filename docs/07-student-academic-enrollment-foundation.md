# School ERP — Milestone 07: Student & Academic Enrollment Foundation

## Objective

Implement the production-grade foundation for student management and academic enrollment in the Ugandan school context.

This is NOT a simple student CRUD milestone.

The system must establish the foundation for the complete student lifecycle:

Applicant
→ Student
→ Enrollment
→ Academic Year
→ Class
→ Stream
→ Subject Enrollment
→ Parent/Guardian
→ Academic Progression
→ Transfer/Withdrawal
→ Graduation/Completion
→ Alumni

The implementation must be designed for a serious production School ERP and must support Ugandan primary, secondary, and other configurable school structures without hard-coding assumptions that make future expansion difficult.

---

# 1. IMPORTANT: INSPECT FIRST

Before changing anything:

1. Inspect the entire repository structure.
2. Read:
   - `apps/api/prisma/schema.prisma`
   - `apps/api/prisma/seed.ts`
   - `apps/api/src/modules/identity/`
   - `apps/api/src/modules/schools/`
   - `apps/api/src/modules/users/`
   - `apps/api/src/modules/academic-years/`
   - existing tests
   - existing documentation
3. Inspect the current Git status.
4. Inspect existing migrations.
5. Understand the existing permission architecture.
6. Understand the existing tenant-isolation pattern.
7. Do not redesign working authentication/authorization.
8. Do not modify unrelated modules.

The repository is the source of truth.

Preserve the existing architecture:

- pnpm monorepo
- NestJS 11
- Prisma 7
- PostgreSQL
- PWA frontend later
- modular monolith
- database-authoritative authorization
- JWT containing only identity/school context
- `activeSchoolId` as the tenant boundary

---

# 2. EXISTING AUTHORIZATION MODEL

Continue using:

```text
AuthGuard
→ AuthenticatedUser
→ activeSchoolId
→ PermissionGuard
→ PermissionService
→ tenant-scoped service
→ Prisma
Never trust:

schoolId from request body
schoolId from query parameters
schoolId from route parameters
role IDs supplied by clients
permission IDs supplied by clients

Tenant context must come from:

AuthenticatedUser.activeSchoolId

Every tenant-scoped student/enrollment query must enforce the active school.

Cross-school data leakage is unacceptable.

3. DOMAIN SCOPE

This milestone establishes the following domains.

Student

A student is a person enrolled or previously enrolled in a school.

The student record should support, where appropriate:

Identity
unique student ID
admission number
first name
middle name
last name
preferred/display name
gender
date of birth
place of birth
nationality
religion only if the existing product requirements justify collecting it
profile photo reference
national/student identification fields where applicable
birth certificate/reference information where applicable

Do NOT hard-code a single national ID format.

Use configurable/general-purpose identification fields where appropriate.

Contact
phone
email
address
district
municipality/city/town
village/locality
emergency contact

Do not assume every student has a phone or email.

4. UGANDAN SCHOOL CONTEXT

The model must accommodate common Ugandan school structures.

Examples include:

Primary
P1
P2
P3
P4
P5
P6
P7
Secondary
S1
S2
S3
S4
S5
S6

But DO NOT hard-code these as database enums if doing so would prevent:

international schools
vocational institutions
nurseries
tertiary institutions
custom school structures

Use configurable academic structures.

The system should eventually allow a school to define:

Academic Level
→ Class/Grade
→ Stream

Examples:

P7
 ├── East
 ├── West
 └── North


S4
 ├── A
 ├── B
 └── C
5. ACADEMIC YEAR ENROLLMENT

A student may have multiple enrollments across different academic years.

Do NOT put the current class directly on the Student record as the source of truth.

Instead:

Student
  ↓
Enrollment
  ↓
AcademicYear
  ↓
Class/Grade
  ↓
Stream

Enrollment should capture the student's academic placement for that academic year.

At minimum consider:

student
school
academic year
class/grade
stream
enrollment status
enrollment date
admission type
entry level
previous school
previous class
boarding/day status if applicable
house where applicable
remarks
withdrawal/completion information

Prevent invalid duplicate enrollment for the same student and academic year.

6. ENROLLMENT STATUS

Design for lifecycle states such as:

PENDING
ACTIVE
SUSPENDED
TRANSFERRED
WITHDRAWN
COMPLETED
PROMOTED
REPEATING

Only introduce statuses that are justified by the existing architecture.

Do not allow arbitrary invalid transitions.

Consider whether status transitions should eventually be audited.

7. CLASS / GRADE FOUNDATION

The system needs a configurable academic class structure.

Do NOT assume:

class = P7

is sufficient.

A class/grade should support:

name
code
level/order
description
active status
school
academic structure/category where appropriate

Examples:

P1
P2
P7
S1
S4
S6

The design should also support custom structures.

8. STREAM FOUNDATION

A class may contain multiple streams.

Example:

S1
 ├── A
 ├── B
 └── C

A stream should belong to a class/grade and school.

Support:

name
code
capacity where appropriate
active status
class reference

Enrollment should be able to place a student into a stream.

A student's stream should be determined by the enrollment record, not by arbitrary client input outside the enrollment workflow.

9. SUBJECT FOUNDATION

The system must prepare for subject enrollment.

Do NOT attach arbitrary subject IDs directly to Student.

Use an academic structure such as:

Subject
AcademicYear
Class
SubjectOffering
StudentSubjectEnrollment

The exact design must be determined after inspecting the current schema.

The system should eventually support:

subject code
subject name
subject category
compulsory/elective
class availability
academic year availability
subject combinations
student's selected subjects

This must be flexible enough for Ugandan secondary-school subject structures.

Do not hard-code UNEB subject combinations into the database.

10. PARENT / GUARDIAN MANAGEMENT

A serious ERP must support parent/guardian relationships.

Do NOT simply store:

parentName
parentPhone

on Student.

Design a reusable relationship model.

A student may have:

father
mother
guardian
sponsor
emergency contact
other authorized relationship

A student may have multiple guardians.

A guardian may be associated with multiple students/siblings.

Support relationship metadata such as:

relationship type
full name
phone
alternate phone
email
address
occupation where appropriate
preferred contact method
emergency contact flag
primary contact flag
authorized pickup flag
portal access eligibility

Do not assume biological parentage.

Use a generalized guardian/contact relationship.

11. STUDENT USER ACCOUNT

Do NOT automatically assume every Student is a system User.

The domain distinction should remain clear:

User

is an authentication/account identity.

Student

is a school domain entity.

A student may later receive a User account for:

student portal
results
attendance
fees
communication

But creating the Student record must not automatically create an authentication account unless explicitly designed.

12. STUDENT NUMBER / ADMISSION NUMBER

The system must support school-specific student identification.

Consider:

admission number
student number
registration number

The number must be unique within the appropriate school context.

Do not assume a globally unique admission number across every school.

Example:

SCH001 / ADM-2026-0042

Do not hard-code this format.

13. ADMISSION / REGISTRATION

The foundation should support student registration/admission information.

Consider:

admission date
entry academic year
entry class
admission type
previous school
previous class
transfer-in indicator
first-time student indicator
returning student indicator

Possible admission types:

NEW
TRANSFER
RETURNING
RE_ENTRY

Do not add unnecessary complexity if it is not required by the current domain.

14. STUDENT STATUS

A student can exist independently of a particular year's enrollment.

Do not confuse:

Student status

with:

Enrollment status

For example:

A student may remain a valid student record while their current enrollment is withdrawn.

Design the distinction carefully.

15. PROMOTION / PROGRESSION FOUNDATION

Do not implement a full automated promotion engine in this milestone.

However, design the enrollment model so that future progression can support:

P6 → P7
S3 → S4
S4 → S5

and:

promoted
repeated
transferred
completed

Do not hard-code promotion rules.

Promotion rules may later depend on:

school policy
academic results
attendance
administrative decisions
16. TRANSFER / WITHDRAWAL FOUNDATION

Prepare the domain for:

transfer to another school
withdrawal
expulsion
completion
death where legally/operationally appropriate
temporary suspension

Do not implement complex transfer workflows unless necessary for this milestone.

However, preserve the historical enrollment record.

Never simply overwrite:

currentClass
currentStream

and destroy historical information.

17. DATA HISTORY

Historical academic records are extremely important.

A student enrolled in:

2024 → P5
2025 → P6
2026 → P7

must retain all historical enrollments.

Never make the current enrollment overwrite previous records.

This is essential for:

report cards
transcripts
attendance history
academic progression
audits
alumni records
18. PRIVACY / SECURITY

Student data is sensitive.

Do not expose:

password hashes
internal database fields unnecessarily
unrelated school records
another school's students
another school's guardians
another school's enrollment records

All endpoints must be tenant-scoped.

Cross-school access must fail safely.

Use appropriate:

UnauthorizedException
ForbiddenException
NotFoundException
ConflictException
validation errors

Do not leak whether another school's private record exists where the existing architecture expects indistinguishable 404 behavior.

19. API DESIGN

Follow the existing module convention.

Likely structure:

apps/api/src/modules/students/


├── students.module.ts
├── controllers/
│   ├── students.controller.ts
│   ├── enrollments.controller.ts
│   └── guardians.controller.ts
├── services/
│   ├── students.service.ts
│   ├── enrollments.service.ts
│   └── guardians.service.ts
├── dto/
├── types/
└── ...

However:

DO NOT blindly create this structure.

Inspect existing conventions first and choose the cleanest modular-monolith design.

20. API CAPABILITIES

At minimum establish the foundation for:

Students
POST   /students
GET    /students
GET    /students/:studentId
PATCH  /students/:studentId
Enrollment
POST   /students/:studentId/enrollments
GET    /students/:studentId/enrollments
GET    /enrollments/:enrollmentId
PATCH  /enrollments/:enrollmentId
Guardians
POST   /students/:studentId/guardians
GET    /students/:studentId/guardians
PATCH  /students/:studentId/guardians/:guardianId
DELETE /students/:studentId/guardians/:guardianId

Only implement endpoints justified by the inspected domain/schema.

Do not build the frontend yet.

21. PERMISSIONS

Inspect existing permissions first.

The existing seed already contains:

students.read
students.create
students.update
students.delete

Reuse these.

Do NOT invent a large new permission system unless required.

For enrollment/guardian operations:

determine whether existing student permissions are sufficient
if new permission keys are genuinely required, document why and update seed accordingly

Never create permissions that cannot be assigned or are not used.

22. AUTHORIZATION

Use:

@UseGuards(AuthGuard, PermissionGuard)

and:

@Permissions(...)

on protected endpoints.

Student creation, updates, enrollment and guardian management must never be accessible across schools.

The service layer must still enforce tenant boundaries even though the controller has authorization guards.

23. INPUT VALIDATION

DTOs must:

use class-validator
support global whitelist
reject non-whitelisted fields
reject client-supplied schoolId
reject invalid UUIDs
validate dates
validate enums where appropriate
reject malformed email addresses
trim/normalize suitable string fields

Do not silently accept:

{
  "schoolId": "another-school-id"
}

The request should either reject the field through validation or ignore it only if that matches the established validation architecture.

Follow the existing project behavior.

24. DUPLICATE / CONFLICT PROTECTION

Prevent:

duplicate student identifiers within a school
duplicate enrollment for the same student + academic year
duplicate guardian relationship
duplicate subject enrollment when subject enrollment is introduced
invalid class/stream relationships

Use database constraints where appropriate.

Do not rely only on application-level checks for uniqueness.

If schema changes are required:

explain them first
create a proper migration
update seed only if necessary
25. TRANSACTIONS

Use Prisma transactions for operations that modify multiple related records atomically.

Examples:

student + initial enrollment
enrollment + placement where multiple writes are required
guardian relationship creation where required
future subject enrollment workflows

Do not use transactions unnecessarily for simple reads.

26. RESPONSE SAFETY

Use explicit response DTOs where appropriate.

Never return raw Prisma entities blindly.

Student responses should not accidentally expose:

internal relation objects
password hashes from linked users
unnecessary database metadata
unrelated school information
27. SWAGGER / DOCUMENTATION

Follow the existing Swagger conventions.

Every API route should have appropriate:

@ApiTags
@ApiOperation
@ApiResponse
request/response DTO documentation
authentication documentation where applicable
28. TESTING REQUIREMENTS

This milestone MUST have serious test coverage.

Unit tests

Cover:

student creation
normalization
duplicate student ID
student retrieval
update
tenant isolation
enrollment creation
duplicate enrollment
invalid academic year
invalid class
invalid stream
cross-school enrollment attempt
guardian creation
duplicate guardian relationship
authorization failures
transaction failures where practical
E2E tests

Create:

apps/api/test/students.e2e-spec.ts

Cover:

missing JWT → 401
insufficient permissions → 403
create student
list students
get student
update student
create enrollment
retrieve enrollment history
guardian management
school isolation
client-supplied schoolId rejection
invalid UUID
duplicate conflicts
passwordHash absence
another school's student inaccessible

Use the existing mocked-Prisma e2e pattern.

Do not require a live external database for e2e tests unless the existing architecture explicitly requires it.

29. DATABASE DESIGN RULE

Before modifying schema.prisma, carefully inspect the existing models.

Do not duplicate existing concepts.

If new models are necessary, ensure relationships are deliberate.

Likely conceptual entities include:

Student
Enrollment
Class/Grade
Stream
Guardian
StudentGuardian

Potential subject entities may be deferred if the current schema does not yet contain the required academic structure.

Do NOT create half-designed subject systems merely to satisfy this milestone.

The student/enrollment foundation should leave a clean path for the next academic modules.

30. DO NOT IMPLEMENT YET

Do NOT implement:

frontend student management
report cards
marks entry
grading engine
attendance
fees
payroll
transport
boarding
SMS
WhatsApp integration
biometric integration
full admissions portal
automated promotion engine
full subject-combination engine
transcript generation
UNEB integration
national EMIS integration

Those will be separate milestones.

This milestone establishes the domain foundation they will depend on.

31. ARCHITECTURAL PRINCIPLES

Maintain these principles:

One codebase

The future PWA will consume the API.

Modular monolith

Keep student management isolated as a domain module.

Tenant isolation

Every school sees only its own students.

Historical integrity

Never destroy historical enrollments merely because a student's current placement changes.

Database authority

Authorization decisions come from the database.

Explicit school context

Tenant-scoped operations use:

activeSchoolId
No client-controlled tenancy

Never trust:

schoolId

from the client.

Production quality

Prefer simple, understandable architecture over premature abstractions.

32. VERIFICATION

After implementation run:

pnpm --filter api exec prisma validate
pnpm --filter api exec prisma generate
pnpm --filter api build
pnpm --filter api test
pnpm --filter api test:e2e

If a command cannot be run through the workspace because of the known pnpm environment behavior, run the equivalent command from apps/api and report exactly what was executed.

Do not claim tests passed without running them.

33. GIT DISCIPLINE

DO NOT commit.

After implementation report:

Changed

Every created/modified file and purpose.

Database

Explain every schema/migration change.

API

List the new endpoints.

Security

Explain tenant isolation and authorization.

Tests

Report exact:

unit suites/tests
e2e suites/tests
Verification

Report actual command results.

Git

Show:

git diff --stat
git status -sb

Then STOP.

Wait for approval before committing.

34. IMPORTANT IMPLEMENTATION RULE

Do not blindly implement every idea in this document.

This document defines the domain direction and required foundation.

Before coding:

Inspect the existing schema.
Identify what already exists.
Reuse existing models where appropriate.
Identify the minimum additional models required.
Implement the smallest complete production-quality foundation.
Do not introduce speculative complexity.
Do not modify unrelated working code.

If an architectural decision is ambiguous and would materially affect future modules, explain the decision in the final report rather than silently making a large redesign.