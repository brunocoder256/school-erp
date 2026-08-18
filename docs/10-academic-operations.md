M10 — Academic Operations & Teaching/Learning Foundation

Implementation Brief for OpenCode

Project

School ERP

Milestone

M10 — Academic Operations & Teaching/Learning Foundation

Scope

This milestone is backend/domain/API only.

Do NOT build the frontend in M10.

The PWA, mobile experience, offline functionality and frontend application work will be handled later, especially in M24 — PWA, Offline & Mobile Experience.

1. Read This First

You are implementing M10 only.

Before changing any code, inspect the existing repository thoroughly.

The repository is the source of truth.

Do not assume that the conceptual model described in this document exactly matches the current codebase. Existing models, services, modules, naming conventions and relationships must be inspected first.

Do not duplicate functionality that already exists.

Do not redesign unrelated parts of the system.

Do not implement future milestones.

The current milestone sequence is:

M10 — Academic Operations & Teaching/Learning Foundation ← CURRENT

M11 — Attendance

M12 — Assessment, Exams & Grading

M13 — Report Cards, Transcripts & Progression

M16 — Timetable & School Calendar

M21 — Notifications & Communication

M22 — Dashboards, Analytics & Reporting

M24 — PWA, Offline & Mobile Experience

Everything else remains outside the current scope.

2. Existing Architecture

The project is a production-oriented School ERP targeted initially at the Ugandan school environment, but the domain model must remain configurable and must not hard-code Uganda-specific academic rules.

Current architectural direction:

pnpm monorepo

NestJS API

Prisma 7

PostgreSQL

Modular monolith

PWA frontend eventually

One codebase eventually serving mobile, tablet and desktop

Backend/domain foundation first

Git/GitHub workflow

Existing Identity & Authorization foundation

Existing Staff & Teacher Management foundation

The frontend is intentionally not being built yet.

3. Existing Foundation

Before implementing M10, inspect the actual repository and identify the existing implementation of the following concepts.

School / Academic Structure

Expected existing concepts include:

School

Education Section

Academic Year

Academic Level

Academic Class

Stream

Conceptually:

School
└── Academic Year
    └── Education Section
        └── Academic Level
            └── Academic Class
                └── Stream

Do not create duplicate versions of these entities if they already exist.

Students

Expected existing concepts include:

Student

Student Enrollment

Academic Year

Class

Stream

Conceptually:

Student
└── Enrollment
    ├── Academic Year
    ├── Class
    └── Stream

Inspect the real schema and preserve its existing design.

Teachers

Existing teacher/staff foundation includes concepts such as:

Staff

TeacherProfile

SubjectCapability

TeachingAssignment

Inspect the existing implementation before modifying anything.

Subjects

Existing subject foundation includes:

Subject

SubjectOffering

SubjectCombination

SubjectCombinationSubject

M10 must build on this foundation rather than replacing it.

Identity & Authorization

The existing identity foundation includes concepts such as:

PrismaService

IdentityModule

AuthGuard

PermissionGuard

CurrentUser decorator

Permissions decorator

PermissionService

JWT authentication

School membership/context

Reuse the existing authorization architecture.

Do not create a second authentication or authorization mechanism.

4. What M10 Is Supposed to Achieve

M10 turns the existing structural data into an actual academic delivery model.

The system must be able to answer:

Who teaches what, to whom, where, and during which academic year?

Before M10, the ERP may know:

Students
Teachers
Subjects
Classes
Streams
Academic Years

M10 connects them into:

Academic Year
      ↓
Class / Stream
      ↓
Subject Offering
      ↓
Teaching Group
      ↓
Teacher(s)
      ↓
Student(s)

And separately:

Student
   ↓
Academic Enrollment
   ↓
Subject Enrollment
   ↓
Subject / Subject Offering

This academic delivery model becomes the foundation for:

M11 Attendance

M12 Assessment, Exams & Grading

M13 Report Cards, Transcripts & Progression

M16 Timetable & School Calendar

M21 Notifications & Communication

M22 Dashboards, Analytics & Reporting

eventually M24 PWA/mobile/offline experience

Do not implement those milestones now.

5. M10 Core Domain Requirements

M10 should establish or operationalize the following areas.

5.1 Academic Context

The system must be able to resolve the academic context of an operation.

Example:

Mukono High School
└── 2026
    └── Secondary
        └── S3
            ├── S3A
            ├── S3B
            └── S3C

The system should be able to determine:

School

Academic Year

Education Section

Academic Level

Academic Class

Stream

Students

Subjects

Teachers

Do not hard-code:

S1
S2
S3
P7
N2

or any other class/level naming.

These are data/configuration.

6. Subject Allocation

M10 must establish which subjects are actually taught within a specific academic context.

Example:

2026
└── S3A
    ├── Mathematics
    ├── English
    ├── Biology
    └── Chemistry

Another stream could have:

2026
└── S3B
    ├── Mathematics
    ├── English
    ├── History
    └── Geography

The application must not assume that every class or stream takes every subject.

Reuse the existing:

Subject

SubjectOffering

SubjectCombination

SubjectCombinationSubject

where appropriate.

The implementation must establish the actual relationship between:

Academic Year
+
Class / Stream
+
Subject Offering

The exact database design must be based on the existing schema.

7. Teacher → Subject → Class/Stream

Existing TeachingAssignment must become an operational academic relationship.

Example:

Teacher: Mr. John
Subject: Mathematics
Academic Year: 2026
Class: S3
Streams: S3A, S3B

M10 must enforce appropriate business rules.

At minimum:

Teacher

Teacher belongs to the correct school.

Teacher is active where required.

Teacher has a valid teacher profile where required.

Teacher is capable of teaching the assigned subject according to SubjectCapability, if that is the existing domain rule.

Subject

Subject belongs to the appropriate school/scope.

Subject is valid for the academic context.

Subject is offered for the relevant academic context where the existing domain requires an offering.

Academic context

Academic year belongs to the school.

Class belongs to the appropriate academic structure.

Stream belongs to the selected class.

No cross-school relationships.

No invalid academic-year relationships.

Duplicate prevention

The system must prevent logically duplicate teaching assignments.

Important invariants must be enforced at the application layer and, where appropriate, at the database layer.

8. Teaching Group

M10 should introduce a TeachingGroup concept only if an equivalent concept does not already exist.

Do not blindly create it.

The reason for a teaching group is that:

S3 Mathematics

is not necessarily the same teaching unit as:

S3A Mathematics

or:

S5 PCM Mathematics

or:

P5 Mathematics Group 1

A teaching group should provide a stable operational unit that later milestones can reference.

Conceptually:

TeachingGroup
    ↓
Academic Year
    ↓
Class / Stream
    ↓
Subject Offering
    ↓
Teacher(s)
    ↓
Student(s)

This will later support:

Attendance

Timetable

Assessment

Exams

Reporting

Analytics

Do not implement those later systems in M10.

9. Student Subject Enrollment

A student does not necessarily take every subject available to their class or level.

Example:

Student A
2026
S4
├── Mathematics
├── English
├── Biology
├── Chemistry
└── Geography

Another student may have a different subject selection.

M10 therefore needs a configurable relationship representing:

Student
    ↓
Academic Enrollment
    ↓
Subject Enrollment
    ↓
Subject / Subject Offering

Requirements:

Student must belong to the correct school.

Student must have a valid academic enrollment.

Subject enrollment must belong to the appropriate academic year/context.

Duplicate subject enrollment must be prevented.

Historical subject enrollment must remain traceable.

No assumption that all students take identical subjects.

10. Subject Combination Handling

Existing subject combinations must connect to actual student academic enrollment where appropriate.

Example:

SubjectCombination
    PCM
       ↓
Mathematics
Physics
Chemistry

Student:

Student A
Academic Year: 2026
Combination: PCM

The system can then determine the expected subjects.

However:

Never hard-code:

PCM
PCB
HEG
MEG

or any other combinations in business logic.

Combinations must be configurable database data.

A school should be able to create its own combination.

Seed/demo data may contain Uganda-style examples, but those examples must remain ordinary records.

11. Domain Relationship Goal

The resulting domain should conceptually support:

School
  │
  ├── AcademicYear
  │       │
  │       └── StudentEnrollment
  │
  ├── EducationSection
  │       │
  │       └── AcademicLevel
  │               │
  │               └── AcademicClass
  │                       │
  │                       └── Stream
  │
  ├── Subject
  │       │
  │       └── SubjectOffering
  │               │
  │               └── TeachingGroup
  │
  └── Teacher
          │
          └── TeachingAssignment
                    │
                    └── TeachingGroup

And:

StudentEnrollment
       │
       ├── AcademicClass
       ├── Stream
       └── StudentSubjectEnrollment
                    │
                    └── Subject / SubjectOffering

And:

Teacher
   │
   └── TeachingAssignment
           │
           ├── AcademicYear
           ├── Class / Stream
           ├── Subject
           └── TeachingGroup

This is a conceptual target only.

The existing repository determines the final entity names and relationships.

12. Database Requirements

Use Prisma 7 and the existing PostgreSQL architecture.

Before changing the schema:

Inspect the current Prisma schema.

Inspect existing migrations.

Identify existing M10-compatible models.

Identify missing relationships.

Determine the smallest safe schema extension.

Implement the migration.

Review the generated migration SQL.

Check for accidental destructive operations.

Do not redesign existing schema merely for convenience.

13. Database Integrity

Where appropriate, enforce invariants with database constraints/indexes.

Consider:

unique academic context relationships;

duplicate subject allocations;

duplicate teaching assignments;

duplicate student subject enrollments;

foreign-key integrity;

school/tenant consistency;

academic-year consistency;

class/stream consistency;

subject-offering consistency.

Use composite unique constraints where they correctly represent business uniqueness.

Do not create arbitrary constraints without understanding the domain.

Use transactions for multi-step operations where partial updates could create inconsistent academic data.

14. Business Rules

Business rules must be enforced server-side.

At minimum:

A teacher must belong to the correct school.

An inactive teacher cannot receive a new teaching assignment.

A teacher must satisfy the existing subject-capability rules.

A subject must be valid for the academic context.

A stream must belong to the selected academic class.

A teaching assignment must belong to the correct academic year.

A student subject enrollment must belong to a valid student academic enrollment.

A student cannot be enrolled in the same subject twice within the same academic context.

A teaching assignment cannot be duplicated.

A teaching group cannot combine incompatible academic contexts.

Cross-school academic relationships must be rejected.

Historical academic records must remain traceable.

Subject combinations must remain configurable.

Uganda-specific class/combination rules must not be hard-coded.

Add additional rules only where justified by the existing repository/domain.

15. School/Tenant Isolation

This is a critical requirement.

Every M10 operation must respect the existing school/tenant model.

A user operating in School A must not be able to:

read School B's academic data;

assign School B's teacher;

allocate School B's subject;

enroll School B's student;

create School B's teaching group;

manipulate School B's academic context.

Do not rely solely on IDs being unknown to the client.

Authorization and domain queries must enforce school boundaries.

Reuse the existing Identity/Authorization architecture.

16. Authorization

Reuse:

AuthGuard

PermissionGuard

@CurrentUser()

@Permissions(...)

PermissionService

existing school membership/context resolution

Do not introduce another authorization system.

Inspect the repository's existing permission naming conventions before creating M10 permissions.

Potential permission concepts may include:

academic:context:read
academic:context:manage

academic:subject-allocation:read
academic:subject-allocation:manage

academic:teaching-assignment:read
academic:teaching-assignment:manage

academic:teaching-group:read
academic:teaching-group:manage

academic:student-subject:read
academic:student-subject:manage

These are examples, not mandatory names.

Follow the existing convention.

Permission semantics must be clear and tested.

17. Backend Modules

Follow the existing NestJS modular-monolith structure.

Do not create a giant generic AcademicService.

Prefer cohesive domain/application services.

Potential areas include:

academic context
subject allocation
teaching assignment
teaching group
student subject enrollment

The exact module structure must follow the existing repository architecture.

Do not create unnecessary modules merely to match this document.

18. API Requirements

M10 should expose clean versioned APIs following the existing API conventions.

Potential resources include:

academic context

subject allocation

teaching assignment

teaching group

student subject enrollment

subject combination enrollment/resolution

Possible operations include:

Academic Context

resolve academic context;

list academic classes;

list streams;

list subjects in a class/stream;

list teachers associated with an academic context.

Subject Allocation

create allocation;

update/deactivate allocation;

list allocations;

filter by academic year/class/stream/subject.

Teaching Assignment

create;

update;

deactivate;

list;

filter by teacher;

filter by subject;

filter by class;

filter by stream;

filter by academic year.

Teaching Group

create;

update;

deactivate;

list;

assign/remove teachers where appropriate;

resolve students.

Student Subject Enrollment

enroll student;

deactivate/remove enrollment according to project lifecycle conventions;

list student's subjects;

list students taking a subject.

Do not blindly implement every endpoint listed here.

First inspect existing controllers and resource conventions, then implement the smallest coherent API.

19. DTOs and Validation

Follow the existing project DTO and validation conventions.

All write operations must validate:

IDs;

required fields;

enum/status values where applicable;

academic relationships;

school boundaries;

duplicate conditions;

lifecycle/status rules.

Do not trust the frontend for validation.

Remember:

There is no frontend in M10.

The API must be fully safe and usable independently.

20. Query Requirements

The backend should make the following queries straightforward and efficient.

Student

Student
→ Academic Enrollment
→ Academic Year
→ Class
→ Stream
→ Subject Enrollments
→ Teaching Groups

Teacher

Teacher
→ Academic Year
→ Teaching Assignments
→ Subjects
→ Classes
→ Streams
→ Teaching Groups
→ Students

Class / Stream

Academic Year
→ Class
→ Stream
→ Subjects
→ Teaching Groups
→ Teachers
→ Students

Subject

Subject
→ Academic Year
→ Classes/Streams
→ Teaching Groups
→ Teachers
→ Students

Avoid obvious N+1 query patterns.

Use appropriate Prisma relation loading and filtering.

Use pagination for large collections where consistent with existing APIs.

21. Historical Data

Academic data is historical.

Example:

2025
S3A
Mathematics
Teacher John

must be able to coexist with:

2026
S4A
Mathematics
Teacher Mary

Do not overwrite historical academic relationships just because a teacher or student moved to a new academic year.

Follow the project's existing lifecycle/status conventions.

Avoid destructive deletes where historical records may be referenced by future milestones.

22. Auditability

Inspect the existing audit/history mechanism.

If one exists, integrate important M10 changes into it.

Important operations include:

subject allocation changes;

teaching assignment changes;

teaching group changes;

student subject enrollment changes.

Do not create a second unrelated audit system.

If no audit system exists, do not build a large unrelated audit framework solely for M10 unless it is clearly required by the existing architecture.

23. Seed Data

Inspect the existing seed system.

Preserve existing behavior.

If useful, add minimal M10 demo data.

Example data may contain:

2026
Secondary
S3
S3A
Mathematics
English
Teacher John

or:

PCM
Mathematics
Physics
Chemistry

But these must be database records, not application logic.

Seed data must respect:

school boundaries;

valid teacher capabilities;

valid subject offerings;

valid academic relationships;

valid student enrollments.

Do not turn seed data into hard-coded business rules.

24. Testing Requirements

M10 is not complete without automated tests.

Follow existing project test conventions.

Academic Context

Test:

valid context resolution;

valid class/stream resolution;

invalid academic year;

invalid class;

invalid stream;

cross-school access rejection.

Subject Allocation

Test:

valid subject allocation;

duplicate allocation rejection;

subject not available for the context;

invalid academic relationship;

cross-school rejection.

Teaching Assignment

Test:

valid assignment;

inactive teacher rejection;

invalid teacher capability rejection;

subject not available rejection;

invalid stream rejection;

duplicate assignment rejection;

cross-school rejection.

Teaching Group

Test:

valid creation;

invalid academic context;

duplicate/conflicting group;

teacher assignment;

student resolution;

cross-school rejection.

Student Subject Enrollment

Test:

valid enrollment;

duplicate enrollment rejection;

invalid student enrollment;

invalid subject;

wrong academic year;

cross-school rejection.

Authorization

Test:

unauthenticated access;

insufficient permission;

valid permission;

school isolation;

unauthorized mutation.

Regression

Run all existing tests.

M10 must not break:

authentication;

authorization;

staff/teacher functionality;

student functionality;

subject functionality;

existing E2E tests.

25. No Frontend in M10

This is explicit.

DO NOT:

create frontend pages;

create frontend components;

create dashboards;

create mobile UI;

create PWA UI;

create offline synchronization;

modify the frontend merely to demonstrate the API;

implement M24 frontend functionality.

M10 is:

Prisma
+
Database
+
Domain
+
Services
+
Business Rules
+
Authorization
+
API
+
Tests

Only.

If the existing frontend must be minimally changed to prevent the repository from breaking, explain why before doing so and keep the change strictly necessary.

26. No Future Milestone Scope Creep

Do not implement:

M11

Attendance

M12

Assessment, Exams & Grading

M13

Report Cards, Transcripts & Progression

M16

Timetable & School Calendar

M21

Notifications & Communication

M22

Dashboards, Analytics & Reporting

M24

PWA, Offline & Mobile Experience

M10 should only create the foundation that those milestones will later consume.

27. Recommended Implementation Process

Follow this sequence.

Phase 1 — Repository Reconnaissance

Inspect:

apps/api
apps/web
packages/*
prisma
tests
configuration

and identify the actual project conventions.

Pay special attention to:

module boundaries;

Prisma schema;

migrations;

service patterns;

DTO patterns;

controllers;

guards;

permissions;

school context;

existing tests.

Do not code yet.

Phase 2 — Domain Mapping

Create an internal map of:

Existing Model → M10 Requirement

For each requirement, determine:

already exists;

partially exists;

missing;

must be extended;

must not be changed.

Do not duplicate existing entities.

Phase 3 — Implementation Plan

Before implementation, produce a concise plan based on the actual repository.

The plan should identify:

models to reuse;

models to extend;

new models required;

relationships;

constraints;

services;

controllers;

permissions;

tests;

migration strategy.

Then implement the plan.

Do not stop at planning.

Phase 4 — Database

Implement only necessary Prisma changes.

Generate/review migration.

Verify:

foreign keys;

uniqueness;

indexes;

nullable/non-nullable fields;

lifecycle fields;

school boundaries.

Phase 5 — Domain/Application Services

Implement the M10 business logic.

Business rules belong server-side.

Do not hide business logic in controllers.

Do not rely on Prisma calls alone to represent complicated business rules.

Use transactions where required.

Phase 6 — Authorization

Integrate M10 with the existing Identity/Authorization foundation.

Ensure:

Authentication
      ↓
Permission
      ↓
School/Tenant Isolation
      ↓
Domain Validation
      ↓
Operation

Phase 7 — API

Implement the necessary versioned endpoints.

Follow existing conventions.

Use DTOs and validation.

Do not create an inconsistent API style.

Phase 8 — Tests

Add unit/integration/E2E tests appropriate to the existing architecture.

Run focused tests first.

Then run the complete test suite.

Phase 9 — Final Review

Inspect:

git diff
git status

Check for:

accidental frontend changes;

unrelated schema changes;

unrelated modules;

duplicated models;

missing authorization;

missing school isolation;

missing tests;

destructive migrations;

scope creep.

28. Definition of Done

M10 is complete when all applicable items are satisfied:

Repository architecture was inspected before implementation.

Existing Prisma schema and migrations were inspected.

Existing academic structure was reused appropriately.

Existing student/enrollment model was reused appropriately.

Existing staff/teacher model was reused appropriately.

Existing subject model was reused appropriately.

Existing Identity/Authorization system was reused.

Academic context can be resolved.

Subjects can be allocated to actual academic contexts.

Teaching assignments are operational.

Teacher capability rules are enforced where applicable.

Teaching groups exist or an existing equivalent is correctly operationalized.

Student subject enrollment is supported.

Subject combinations integrate with actual student academic enrollment.

No Uganda-specific academic logic is hard-coded.

Database constraints prevent important duplicates.

School/tenant isolation is enforced.

Historical academic data is preserved.

API endpoints follow existing conventions.

DTO validation is implemented.

Business rules are enforced server-side.

Unit/integration/E2E tests cover critical paths.

Existing tests continue passing.

Migration is reviewed.

No frontend functionality was implemented.

No future milestone functionality was implemented.

Final diff contains no accidental scope creep.

29. Final Expected Academic Model

The result should make this possible:

SCHOOL
  │
  └── ACADEMIC YEAR
        │
        └── EDUCATION SECTION
              │
              └── ACADEMIC LEVEL
                    │
                    └── ACADEMIC CLASS
                          │
                          ├── STREAM
                          │
                          ├── SUBJECT ALLOCATIONS
                          │       │
                          │       └── SUBJECT OFFERINGS
                          │
                          └── TEACHING GROUPS
                                  │
                                  ├── SUBJECT
                                  ├── TEACHER(S)
                                  └── STUDENT(S)

Students:

STUDENT
  │
  └── ACADEMIC ENROLLMENT
        │
        ├── ACADEMIC YEAR
        ├── CLASS
        ├── STREAM
        │
        └── SUBJECT ENROLLMENTS
                │
                └── SUBJECT / SUBJECT OFFERING

Teachers:

TEACHER
  │
  └── TEACHING ASSIGNMENTS
          │
          ├── ACADEMIC YEAR
          ├── CLASS / STREAM
          ├── SUBJECT
          └── TEACHING GROUP

This is the foundation that later academic modules will consume.

30. Final Instruction to OpenCode

Implement M10 now.

Do not merely describe the solution.

First inspect the real repository.

Then map the existing domain.

Then implement the smallest production-safe set of changes required to establish the academic delivery foundation.

Do not duplicate existing entities.

Do not build the frontend.

Do not implement future milestones.

Use the existing architecture and conventions.

Run tests.

Review the migration.

Review the final diff.

At completion, report:

Files created.

Files modified.

Prisma schema changes.

Migrations created.

Domain/business services added or modified.

API endpoints added.

Permissions added.

Business rules implemented.

Tests added.

Tests executed and results.

Seed changes, if any.

Any remaining limitations.

Final git diff/scope summary.