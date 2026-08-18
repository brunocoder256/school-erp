# School ERP — Milestone 09
# Staff & Teacher Management Foundation

## Mission

Implement the Staff & Teacher Management Foundation for the School ERP.

This is a production-oriented School ERP intended primarily for Uganda, while remaining configurable enough to support different types of schools and future education systems.

The system must support:

- Nursery / Early Childhood schools
- Primary schools
- O-Level schools
- A-Level schools
- Mixed schools
- Small private schools
- Large private schools
- Government schools
- Boarding schools
- Day schools
- Schools with departments
- Schools without departments
- Schools with teaching and non-teaching staff
- Schools with different employment structures

The implementation MUST follow the existing modular-monolith architecture.

---

# 1. CRITICAL DESIGN PRINCIPLE

The ERP must NOT assume that every school operates the same way.

The following principle is mandatory:

> Required data must be enforced only when it is genuinely required for the entity or operation. Optional school-specific information must remain optional.

Do NOT make fields mandatory merely because:

- secondary schools may use them
- large schools may use them
- Ugandan schools commonly use them
- future HR functionality may use them

For example:

A small nursery school may not have:

- departments
- heads of department
- subject specialization
- teacher registration information
- complex employment contracts
- teaching assignments by stream

The system must still work perfectly for that school.

Likewise, a large secondary school should be able to configure those things when needed.

---

# 2. INSPECT BEFORE MODIFYING

Before making any changes:

Inspect the repository and current implementation.

Read:

- `apps/api/prisma/schema.prisma`
- existing Prisma migrations
- `apps/api/prisma/seed.ts`
- `apps/api/src/app.module.ts`
- Identity module
- Users module
- Schools module
- Academic Years module
- Students module
- Academic Structure module
- existing tests
- project documentation

Pay particular attention to existing models and relationships.

DO NOT create duplicate concepts.

If an existing model can be extended safely, extend it instead of creating another competing model.

---

# 3. EXISTING ARCHITECTURE

Preserve:

- pnpm monorepo
- NestJS
- Prisma 7
- PostgreSQL
- PWA frontend architecture
- modular monolith
- database-authoritative authorization
- JWT containing only identity/school context
- `activeSchoolId`
- `AuthGuard`
- `PermissionGuard`
- `@CurrentUser()`
- `@Permissions()`
- global ValidationPipe
- centralized HTTP exception handling
- Swagger conventions

Do not redesign these systems.

---

# 4. STAFF VS USER

This distinction is critical.

Do not assume:

```text
User = Staff
They are different concepts.

A User represents an application identity.

A Staff record represents a person employed/working at a school.

A staff member may eventually have a User account.

But not every staff member must necessarily have an application login.

For example:

A cleaner may exist in the Staff system without ever logging into the ERP.

A teacher may have:

Staff
↓
User account

Do not force a User account during staff creation unless the existing architecture clearly requires it.

Prefer an optional relationship.

5. STAFF CORE MODEL

Create or extend a school-scoped Staff entity.

The Staff entity should represent the person's institutional employment/profile record.

Potential fields include:

Identity
id
schoolId
staffNumber
firstName
middleName — optional
lastName
preferredName — optional
Contact
email — optional
phone — optional
alternativePhone — optional
Personal information
dateOfBirth — optional
gender — optional
nationalId / identification reference — optional
address — optional

Do not require national ID.

Do not assume every school has this information.

Employment
employmentStatus
employmentType — optional/configurable
joiningDate
leavingDate — optional
position/designation — optional
department — optional
notes — optional

The minimum required fields should be kept deliberately small.

6. STAFF NUMBER

Staff numbers should be supported.

Example:

STF001
TCH-2026-001
ADM-003

However, do not hard-code the format.

A school may use:

001
T001
EMP001

or no meaningful staff-number convention at all.

If staffNumber is required by the system for uniqueness, allow the school/admin workflow to generate or provide it.

Do not implement:

if staff is teacher then prefix = "TCH"

This is forbidden.

7. STAFF STATUS

Support employment lifecycle.

Examples may include:

ACTIVE
INACTIVE
SUSPENDED
LEFT

But before creating an enum, inspect the existing schema conventions.

If the status needs to be configurable in future, use an appropriate model/configuration instead.

Do not create statuses merely because they sound useful.

The important business requirement is that inactive/left staff must not accidentally receive new active assignments.

Historical records must remain intact.

8. STAFF TYPE / CLASSIFICATION

Schools should be able to distinguish different categories of staff.

Examples:

Teaching
Non-teaching
Administrative
Support
Other

Do not assume these are the only possible categories.

Where appropriate, create configurable staff categories/types.

A school should be able to define:

Teaching
Non-Teaching
Administration
Support Staff
Security
Driver
Catering
Medical
Other

without requiring code changes.

9. EMPLOYMENT TYPE

Support optional employment classification.

Examples:

Permanent
Contract
Temporary
Part-time
Volunteer
Other

Do not hard-code these into business logic.

If implemented as configurable data, schools can define their own terminology.

A school that does not care about employment type must be able to leave it unset.

10. POSITION / DESIGNATION

A staff member may have a designation.

Examples:

Head Teacher
Deputy Head Teacher
Teacher
Director of Studies
Head of Department
Secretary
Accountant
Bursar
Librarian
Nurse
Driver
Cleaner
Security Officer

These must NOT become a giant enum.

Prefer configurable positions/designations.

A school should be able to create:

Position:
Senior Teacher


Position:
ICT Coordinator

without changing code.

11. DEPARTMENTS

Departments should be optional.

Some schools have:

Science
Humanities
Languages
Mathematics
ICT

Others may have no departments.

Create a configurable school-scoped department structure if justified by the existing architecture.

Example:

Department
├── name
├── code (optional)
├── description (optional)
└── active

Staff may optionally belong to a department.

Do NOT require department assignment during staff creation.

12. STAFF PROFILE VS JOB ASSIGNMENT

Keep personal/staff identity separate from institutional assignments.

For example:

Staff
   ↓
Employment / Position
   ↓
Academic Assignment

A teacher may change:

Department
Position
Subjects
Classes

without creating an entirely new person.

Historical assignments should remain possible.

Do not overwrite history unnecessarily.

13. TEACHER PROFILE

Teacher-specific information should be separated from generic staff information.

A teacher profile may include optional information such as:

specialization
teaching experience
professional qualification
registration number
registration body
highest academic qualification
professional training
subjects qualified to teach

Do NOT require these fields.

A teacher can exist without all qualification data being entered.

14. QUALIFICATIONS

Do not create one giant field such as:

qualification = "Bachelor of Education"

if a structured qualification model is appropriate.

A staff member may have multiple qualifications:

Degree
Diploma
Certificate
Professional qualification
Training

Potential structure:

Staff
  ↓
StaffQualification

Each qualification may contain optional:

institution
qualification name
qualification type
field of study
award date
grade/classification
certificate/reference number

Do not require every field.

Do not store uploaded certificate files directly in database columns.

If document storage is needed, leave the integration point for a future document-management milestone.

15. PROFESSIONAL REGISTRATION

Some teachers may have professional registration information.

This must be optional.

Support concepts such as:

registration number
registration authority/body
registration date
expiry date — optional
status — optional

Do not assume every staff member has professional registration.

Do not hard-code a particular registration authority into application logic.

16. TEACHER SUBJECT CAPABILITY

Separate:

Subject

from:

Teacher can teach Subject

and from:

Teacher is currently assigned to teach Subject

These are different concepts.

The academic structure already contains the Subject catalog.

A teacher may have capability/qualification for:

Mathematics
Physics

but currently teach only:

Mathematics

Do not collapse these relationships.

17. TEACHER ACADEMIC ASSIGNMENTS

Create the foundation for teaching assignments.

A teaching assignment should be capable of connecting:

Teacher
+
Academic Year
+
Subject
+
Academic Level/Class
+
Stream (optional)

Example:

Teacher: John Doe
Year: 2026
Subject: Mathematics
Class: S4
Stream: East

Another assignment:

Teacher: John Doe
Year: 2026
Subject: Physics
Class: S5
Stream: Science

Stream MUST remain optional.

Some schools/classes do not use streams.

18. DO NOT ASSUME ONE TEACHER = ONE SUBJECT

A teacher may teach:

one subject
multiple subjects
different subjects in different classes

The model must support this.

Do not put:

teacher.subjectId

on the Staff or Teacher model.

Use an assignment/capability relationship.

19. DO NOT ASSUME ONE TEACHER = ONE CLASS

Teachers may teach:

S1A
S1B
S2A
S3

etc.

Assignments must support multiple classes.

Likewise, multiple teachers may be associated with the same subject/class where appropriate.

20. CLASS TEACHER / FORM TEACHER

Support the possibility of assigning a teacher responsibility for a class/stream.

Examples:

Class Teacher
Form Teacher
Stream Teacher
Class Coordinator

But do not hard-code these names.

Consider a configurable assignment responsibility/type.

Stream should be optional.

A school may assign responsibility at:

class level
stream level

depending on its structure.

21. HEAD OF DEPARTMENT / LEADERSHIP

Do not make leadership a permanent property such as:

staff.isHeadOfDepartment

Instead, use configurable responsibility/position assignments where possible.

This allows:

Teacher A → Head of Science
Teacher B → Head of Humanities

and later allows the assignment to change without changing the person's profile.

22. ACADEMIC-YEAR SCOPING

Teaching assignments MUST be associated with an AcademicYear.

Do not create permanent relationships like:

Teacher → S4

because classes and assignments change each academic year.

Use:

Teacher
  ↓
TeachingAssignment
  ↓
AcademicYear
  ↓
AcademicClass / Stream
  ↓
Subject

Historical assignments must remain queryable.

23. ACTIVE ASSIGNMENT RULE

Only active staff should normally receive new active academic assignments.

However, do not destroy historical assignments if a staff member becomes inactive.

The system should prevent inappropriate new assignments while preserving history.

24. USER ACCOUNT LINK

A staff member may optionally be linked to an existing User.

Example:

Staff
  ↓ optional
User

Do not automatically create a User account unless explicitly requested.

Do not automatically assign application roles based solely on staff category.

For example:

Teacher ≠ automatically TEACHER UserRole

Application access must remain an explicit authorization operation.

This preserves the existing Identity/Users architecture.

25. SCHOOL TENANCY

Every Staff-related school record must be tenant-scoped.

Tenant context MUST come from:

AuthenticatedUser.activeSchoolId

Never trust:

body.schoolId
query.schoolId
header.schoolId

for normal school-scoped operations.

A user from School A must never access staff records from School B.

Cross-school access should use safe 404 behavior where appropriate.

26. AUTHORIZATION

Use:

AuthGuard
+
PermissionGuard

for protected endpoints.

Do not put staff roles or permissions into JWT.

Permission resolution remains database-authoritative.

Inspect existing permissions before adding new ones.

Potential permission categories:

staff.read
staff.create
staff.update
staff.delete


departments.read
departments.create
departments.update
departments.delete


teacher_assignments.read
teacher_assignments.create
teacher_assignments.update
teacher_assignments.delete

But:

Inspect existing seed.
Reuse existing permissions where possible.
Add only genuinely necessary permissions.
Do not create permissions that have no corresponding business operation.

If staff deletion is dangerous because of historical relationships, consider whether deactivation/archiving is more appropriate than hard deletion.

Do not add a DELETE endpoint simply because CRUD normally has one.

27. STAFF DELETION

Be extremely careful with deletion.

A staff member may have historical:

teaching assignments
qualifications
leadership responsibilities
attendance records
future payroll records
audit records

Therefore:

Do NOT automatically cascade-delete staff history.

Prefer an inactive/left lifecycle where appropriate.

If a DELETE endpoint is implemented, it must have a clear business justification and safe referential behavior.

28. HISTORICAL DATA

Historical records must survive changes to:

staff status
department
position
subject assignments
classes
streams
academic years

Example:

A teacher taught S4 Mathematics in 2025.

In 2026 they teach S2 Mathematics.

The 2025 assignment must remain intact.

Do not update historical records to reflect current assignments.

29. API STRUCTURE

Follow the established modular monolith conventions.

Possible module:

apps/api/src/modules/staff/
├── staff.module.ts
├── controllers/
│   ├── staff.controller.ts
│   ├── departments.controller.ts
│   └── teaching-assignments.controller.ts
├── services/
│   ├── staff.service.ts
│   ├── departments.service.ts
│   └── teaching-assignments.service.ts
├── dto/
└── types/

Adapt to existing project conventions.

Do not create unnecessary modules.

30. STAFF ENDPOINTS

Design appropriate endpoints for:

Staff
POST   /staff
GET    /staff
GET    /staff/:staffId
PATCH  /staff/:staffId

Potential filtering:

status
staff type/category
department
search
active/inactive

Do not over-engineer filtering in this milestone.

Departments

If implemented:

POST   /departments
GET    /departments
GET    /departments/:departmentId
PATCH  /departments/:departmentId

Delete only if safe.

Teacher profile

Potentially:

POST/PATCH /staff/:staffId/teacher-profile
GET         /staff/:staffId/teacher-profile

Ensure only appropriate staff can receive teacher-specific information.

Qualifications

Potentially:

POST   /staff/:staffId/qualifications
GET    /staff/:staffId/qualifications
PATCH  /staff/:staffId/qualifications/:qualificationId
DELETE /staff/:staffId/qualifications/:qualificationId

Only if justified.

Teaching assignments

Potentially:

POST   /teaching-assignments
GET    /teaching-assignments
GET    /teaching-assignments/:id
PATCH  /teaching-assignments/:id

Use AcademicYear + Subject + AcademicClass + optional Stream.

31. VALIDATION

Use DTO validation consistent with the existing application.

Global ValidationPipe already provides:

whitelist: true
forbidNonWhitelisted: true
transform: true

Ensure:

schoolId is not accepted from clients
IDs are validated
dates are valid
referenced entities belong to active school
subject belongs to active school/catalog
academic year belongs to active school
class belongs to active school
stream belongs to class
teacher/staff belongs to active school
inactive staff cannot receive invalid active assignments
32. CROSS-ENTITY VALIDATION

Before creating a teaching assignment verify:

Teacher exists
AND
Teacher belongs to active school
AND
Teacher is eligible/active
AND
AcademicYear belongs to active school
AND
Subject belongs to active school
AND
AcademicClass belongs to active school
AND
Stream, if supplied, belongs to AcademicClass

Do not trust IDs simply because they are valid UUIDs.

33. SCHOOL CUSTOMIZATION

Nothing about staff management should assume:

every school has departments
every school has teachers
every teacher has qualifications recorded
every teacher has registration
every teacher teaches a single subject
every teacher teaches a single class
every class has streams
every staff member needs a User account
every school uses the same staff categories
every school uses the same employment types

The database and API must support customization.

34. UGANDA CONTEXT

The system should be suitable for common Ugandan school operations.

Potential staff categories include:

Teaching:

Head Teacher
Deputy Head Teacher
Teacher
Director of Studies
Head of Department
Class Teacher

Non-teaching:

Bursar
Accountant
Secretary
Librarian
Nurse
Laboratory Assistant
Driver
Cleaner
Security
Cook
Other

IMPORTANT:

These are examples for seed/demo configuration only.

They MUST NOT become hard-coded enums or mandatory categories.

Schools must be able to add their own.

35. DATA PRIVACY

Staff records may contain sensitive personal information.

Do not expose unnecessary information through list endpoints.

For example:

GET /staff

should not automatically expose every personal field.

Separate summary/list DTOs from detailed response DTOs.

Do not expose:

sensitive identifiers unnecessarily
private notes unnecessarily
authentication secrets
password hashes
internal security information

Password hashes must NEVER appear in responses.

36. AUDITABILITY

Do not implement a full audit system in this milestone unless the existing architecture already provides one.

However, design destructive/lifecycle operations so that a future audit system can record:

who changed the staff record
who changed employment status
who assigned a teacher
who revoked an assignment

Do not block the milestone waiting for full audit infrastructure.

37. DATABASE DESIGN

Before changing Prisma:

Inspect existing schema.
Inspect existing Users module.
Inspect Academic Structure.
Inspect existing migrations.
Identify reusable relations.
Avoid duplicate models.
Decide carefully between enums and configurable records.

Potential entities may include:

Staff
StaffCategory / StaffType
Department
StaffQualification
TeacherProfile
TeachingAssignment
StaffResponsibility

But DO NOT create all of these automatically.

Only create entities justified by actual requirements.

Prefer a smaller coherent model over a huge speculative schema.

38. REQUIRED VS OPTIONAL DATA

This rule must be reflected in DTOs and database nullability.

Examples:

Likely required for Staff:

school
firstName
lastName

Likely optional:

middleName
preferredName
email
phone
dateOfBirth
gender
nationalId
address
department
employmentType
position
leavingDate
notes

However, do not blindly follow this list.

Inspect the existing schema and determine the minimum safe required fields.

The principle matters more than the exact examples.

39. TESTING

Add unit tests for every service.

Add E2E coverage for:

Staff
create staff
list staff
get staff
update staff
duplicate staff number
cross-school access
missing JWT
insufficient permission
client-supplied schoolId rejected
passwordHash never exposed
optional fields omitted successfully
Departments
create
list
update
tenant isolation
optional department usage
Teacher profile
create/update
only appropriate staff
optional qualifications
school isolation
Qualifications
multiple qualifications
optional fields
cross-school isolation
Teaching assignments
valid assignment
invalid teacher
inactive teacher
invalid subject
invalid academic year
invalid class
invalid stream
stream from another class
cross-school IDs
historical academic-year assignment
optional stream
multiple subjects per teacher
multiple classes per teacher
40. SECURITY TESTING

Explicitly test:

School A user
cannot access
School B staff

Also test:

body.schoolId = School B

cannot override:

AuthenticatedUser.activeSchoolId = School A

Test forged/malicious IDs.

Test that authorization is resolved from the server-side database.

41. MIGRATION

If schema changes are required:

Create a proper Prisma migration.

Run:

pnpm --filter api exec prisma validate
pnpm --filter api exec prisma migrate dev
pnpm --filter api exec prisma generate

Then:

pnpm --filter api build
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api exec prisma migrate status

Do not claim success unless the commands actually pass.

42. SEED

If seed data is required:

Add representative configuration only.

Examples:

Teaching
Non-teaching
Administration
Science department
Humanities department
Teacher
Head Teacher

These are demo/configuration records.

Do not make them mandatory.

Do not create fake real people unless clearly marked as development/demo data.

Do not insert production credentials or secrets.

43. DOCUMENTATION

Update relevant documentation.

Document:

Staff vs User distinction
staff lifecycle
optional teacher profile
departments
qualifications
teaching assignments
academic-year relationship
optional streams
school customization
authorization
tenant isolation
historical integrity

Do not leave stale documentation claiming that staff management does not exist.

44. SCOPE — DO NOT IMPLEMENT YET

This milestone does NOT include:

payroll
salary processing
payslips
statutory deductions
NSSF
PAYE
leave management
full HR performance management
recruitment
job applications
biometric attendance
staff clock-in/out
teacher timetable generation
lesson planning
teacher appraisal
disciplinary management
full document management

Those belong to later milestones.

However, the Staff foundation must not prevent those modules from being added later.

45. ARCHITECTURAL QUALITY

Do not optimize for maximum number of tables.

Optimize for:

correctness
clarity
tenant isolation
historical integrity
optionality
maintainability
future extensibility

Avoid speculative abstractions.

Avoid unnecessary repository layers.

Avoid microservices.

Avoid event buses unless already required.

Avoid Redis.

Avoid external infrastructure.

Keep the implementation understandable for a solo developer.

46. BEFORE CODING

First inspect the repository and provide a short internal implementation plan covering:

Existing Staff/User-related models.
Existing academic models.
Existing permissions.
Existing module conventions.
Which new models are genuinely required.
Which existing models should be extended.
Which fields should be required.
Which fields should be optional.
How teaching assignments connect to the Academic Structure.
How tenant isolation will be enforced.
How historical records will be preserved.

Then implement the milestone.

Do not stop for confirmation unless you encounter a genuinely destructive architectural decision that cannot be resolved safely from the existing architecture.

47. FINAL VERIFICATION REPORT

When implementation is complete, report:

Changed

List every created and modified file.

Database

Report:

created models
modified models
important relationships
important indexes
important unique constraints
migration name
API

List all endpoints.

Staff Model

Explain:

required fields
optional fields
lifecycle
Teacher Model

Explain:

teacher-specific information
qualifications
subject capabilities
assignments
Academic Integration

Explain:

Staff
→ Teacher
→ Academic Year
→ Subject
→ Academic Level/Class
→ Stream (optional)
Customization

Explain how different schools can use different:

staff categories
departments
positions
employment types
qualification information
academic assignments

without code changes.

Security

Explain:

activeSchoolId
AuthGuard
PermissionGuard
cross-school isolation
schoolId injection prevention
Seed

List representative configuration data added.

Tests

Report actual results for:

prisma validate
prisma generate
prisma migrate status
build
unit tests
e2e tests

Do not claim tests passed unless they actually ran.

Lint

If lint fails because of pre-existing repository issues:

report the exact result
distinguish pre-existing errors from new errors
do not modify unrelated files merely to make the lint output look clean
Git

Show:

git status
git diff --stat

DO NOT commit.

DO NOT push.

FINAL PRINCIPLES

The implementation must satisfy all of these:

Staff and User are different concepts.
A staff member does not automatically need a User account.
A teacher is a specialization of staff, not a replacement for Staff.
Teacher assignments are separate from teacher identity.
Academic assignments are academic-year-aware.
Stream is optional.
Department is optional.
Qualifications are optional.
Professional registration is optional.
Employment information beyond the minimum is optional.
School-specific configuration must not be hard-coded.
Uganda-specific examples belong in seed/configuration data, not application logic.
Historical assignments must remain intact.
Tenant context always comes from authenticated activeSchoolId.
Client-provided schoolId must never override tenant context.
Authorization remains DB-authoritative.
Do not expose sensitive staff information unnecessarily.
Do not create speculative models.
Do not duplicate existing models.
Do not implement payroll/HR systems in this milestone.

Build a serious foundation that can support:

Nursery → Primary → O-Level → A-Level

and small → large schools

without forcing every school to use features they do not need.

Inspect first.

Reuse existing architecture.

Keep required data minimal.

Make optional data genuinely optional.

Never hard-code school business rules.