# School ERP — Milestone 08
# Academic Structure & Uganda Education Model Foundation

## Mission

Implement the academic structure foundation of the School ERP.

This is a production-oriented School ERP intended for Uganda and potentially other education systems.

The system MUST support:

- Nursery / Early Childhood
- Primary
- Lower Secondary / O-Level
- Upper Secondary / A-Level
- Schools with mixed sections
- Schools with customized class structures
- Schools with different subject offerings
- Different academic pathways
- Competency-based and traditional assessment models
- Future education models without requiring database redesign

IMPORTANT:

DO NOT hard-code Uganda's education structure into application logic.

Uganda should be represented through configurable data.

The database must provide a generic academic structure engine capable of representing Uganda's model.

---

# 1. Research Basis

Before changing code, inspect the repository and understand the existing:

- Prisma schema
- Student module
- Enrollment module
- Academic Years module
- Terms module
- School module
- Identity/authorization module
- Seed
- existing migrations
- existing tests

Also consider the current Uganda education framework.

NCDC currently describes:

- Primary education with P1-P3 thematic learning
- P4 as a transition phase
- P5-P7 as subject-based learning
- Lower Secondary / O-Level
- Upper Secondary / A-Level

The Lower Secondary curriculum is competency-based.

The A-Level curriculum has also undergone recent alignment/revision.

Do NOT copy these structures directly into hard-coded enums.

Instead, create configurable academic structures which can represent them.

---

# 2. Core Architectural Principle

The ERP must distinguish between:

## Academic Structure

What the school offers.

Example:

School
  → Education Section
      → Academic Level
          → Class
              → Stream
                  → Subject Offerings

and:

Academic Year
  → Term
  → Class/Level configuration
  → Subject offerings
  → Student enrollment

The academic structure must NOT be permanently tied to:

- P1
- P2
- P3
- P4
- ...
- S1
- S2
- S3
- S4
- S5
- S6

These should be configurable records.

---

# 3. Education Sections

Introduce a configurable concept representing major school sections.

Examples that Uganda schools may configure:

- Nursery
- Kindergarten
- Pre-Primary
- Primary
- Lower Secondary
- Upper Secondary
- Vocational
- Special Needs
- Other

Do NOT create a rigid enum that prevents future sections.

A school may have:

Primary only

or:

Nursery + Primary

or:

Nursery + Primary + O-Level

or:

Primary + O-Level + A-Level

etc.

Each school chooses what it operates.

---

# 4. Academic Levels / Grades

Introduce a generic academic level/grade concept.

Examples of configurable records:

Nursery 1
Nursery 2
Nursery 3

P1
P2
P3
P4
P5
P6
P7

S1
S2
S3
S4

S5
S6

But these are DATA, not enums.

A school administrator should eventually be able to define:

- name
- short code
- display order
- section
- level number
- description
- whether learners can enroll there
- whether it is terminal/final
- progression target
- active/inactive status

---

# 5. Academic Level Progression

Support configurable progression.

Example:

P1 → P2
P2 → P3
P3 → P4
...
P7 → S1
S1 → S2
...
S4 → S5
S5 → S6

But do not assume every school follows this exact path.

A school may configure:

P7 → S1

or another progression.

The database should represent progression relationships.

Avoid embedding progression logic such as:

if class === "P7" then nextClass = "S1"

That is forbidden.

---

# 6. Academic Class

Review the existing AcademicClass model before changing it.

The current system already has AcademicClass.

DO NOT create a duplicate class model.

Extend/refactor the existing model if necessary.

The final architecture should support:

- school
- academic section
- academic level
- class
- stream

Example:

School:
Mukono High School

Section:
Lower Secondary

Level:
Senior 2

Class:
Senior 2

Streams:
S2 East
S2 West
S2 North

Another school might use:

Senior 2A
Senior 2B

or:

S2 Red
S2 Blue

The system must support both.

---

# 7. Streams

Review the existing Stream model.

Do not duplicate it.

Streams must belong to an academic class.

A stream should support configurable:

- name
- code
- capacity
- active/inactive
- optional room/classroom reference later

Students may be enrolled into:

Academic Year
+
Academic Level/Class
+
Optional Stream

Do not assume every school uses streams.

---

# 8. Academic Structure Versioning

The academic structure must work across academic years.

Example:

2026:

S1
S2
S3
S4
S5
S6

A school may change its structure in 2027.

Therefore do not assume the structure is globally immutable.

Where appropriate, introduce academic-year-aware configuration.

Do not break existing Enrollment relationships.

A student enrolled in 2026 must retain the correct historical academic context even if the school changes its structure later.

---

# 9. Subject / Learning Area Architecture

This is extremely important.

Do NOT hard-code:

Mathematics
English
Biology
Physics
Chemistry
etc.

Create a configurable subject/learning-area model.

A subject should support concepts such as:

- name
- code
- short name
- description
- active status
- subject type/category
- grading/assessment configuration later

Examples:

Mathematics
English Language
Integrated Science
Social Studies
Biology
Chemistry
Physics
ICT
Agriculture
French
German
Luganda
CRE
IRE
Physical Education
Art and Design
Literature in English
Economics
Entrepreneurship

These are examples only.

They must be seed/configuration data, not hard-coded application behavior.

---

# 10. Learning Areas vs Subjects

The system must support both:

## Subject-based education

Example:

Mathematics
English
Biology

AND:

## Learning-area / thematic education

Example:

Lower Primary may organize learning around learning areas/themes rather than conventional subject structures.

Do not force every academic level to use the same subject model.

A configurable academic level should be able to specify its academic organization model, for example:

- THEMATIC
- SUBJECT_BASED
- COMPETENCY_BASED
- MIXED
- CUSTOM

Prefer configuration/data over enums if an enum would unnecessarily restrict future systems.

---

# 11. Subject Offerings

Create the concept of what a school actually offers.

There are three different concepts:

1. Subject catalog
2. School subject offering
3. Student subject enrollment

Example:

Subject catalog:
Physics

School offering:
Physics offered by School A in S4 during 2026

Student enrollment:
Student John selected Physics in S4 2026

Do not merge these concepts.

---

# 12. Subject Categories

Support configurable subject categories.

Examples:

- Core
- Compulsory
- Elective
- Optional
- Vocational
- Language
- Religious Education
- Creative
- Practical
- Science
- Humanities
- Technical
- Other

Do NOT hard-code Uganda's subject clusters into business logic.

A school should be able to define its own categories/groups.

---

# 13. Compulsory vs Elective Subjects

The system must support:

- compulsory subjects
- elective subjects
- optional subjects
- subject combinations
- minimum selections
- maximum selections

Example:

A school may configure:

S5 Science combination:

Physics
Chemistry
Mathematics

Another school may use:

Physics
Chemistry
Biology

The system must not assume one national combination.

---

# 14. Subject Combinations / Pathways

Support configurable academic pathways.

Example:

A-Level:

PCM
PCB
HEG
MEG

But these are examples.

The school must be able to create:

Combination:
PCM

Subjects:

Physics
Chemistry
Mathematics

And define:

- code
- name
- description
- academic level
- required subjects
- optional subjects
- minimum subjects
- maximum subjects

Do not hard-code PCM/PCB/etc.

---

# 15. Lower Secondary / O-Level

The system must be capable of representing Uganda's Lower Secondary structure.

It should support:

S1
S2
S3
S4

But these must be configurable academic levels.

It must support:

- compulsory subjects
- elective subjects
- subject clusters/groups
- competency-based assessment
- school-specific subject offerings
- student subject selections

Do not hard-code the current NCDC subject menu.

The school configuration should determine what is actually offered.

---

# 16. Upper Secondary / A-Level

The system must support:

S5
S6

through configurable academic levels.

It must support:

- subject combinations
- principal subjects
- subsidiary subjects
- school-specific offerings
- configurable subject selection
- competency/criterion-referenced assessment configuration
- future changes to A-Level curriculum

Do NOT encode today's A-Level rules directly into TypeScript.

Represent them through database configuration.

---

# 17. Nursery / Early Childhood

The system must not assume nursery learners use conventional academic subjects.

Support:

- nursery sections
- levels/classes
- learning areas
- themes
- competencies
- observations
- developmental assessment

Detailed ECCE assessment can be implemented in a later assessment milestone, but the academic structure must not prevent it.

---

# 18. Primary Education

The architecture must support the different primary phases.

For example, the system should be able to represent:

P1-P3:
Thematic / learning-area based

P4:
Transition

P5-P7:
Subject-based

But these should be configured as academic structure data.

Do not implement:

if grade === "P1" ...
if grade === "P2" ...

etc.

---

# 19. Academic Year + Enrollment Integration

Review the existing:

AcademicYear
Term
Student
Enrollment
AcademicClass
Stream

models.

Ensure the new academic structure integrates cleanly.

Enrollment should ultimately be capable of representing:

Student
Academic Year
Section
Academic Level
Class
Stream
Status
Admission type
Boarding/day status
Subject selections

Do not duplicate existing enrollment fields unnecessarily.

---

# 20. Historical Integrity

A student's historical academic records must remain valid when administrators change the current structure.

Example:

Student enrolled in:

2026
S2
Stream East

Later the school renames:

S2 → Senior Two

Historical enrollment must remain understandable.

Avoid destructive updates that corrupt historical academic records.

Use stable IDs and configurable display names/codes.

---

# 21. School Customization

A school administrator should eventually be able to configure:

- sections
- levels
- classes
- streams
- subjects
- subject categories
- learning areas
- subject offerings
- combinations
- pathways
- progression rules
- active/inactive structures
- academic-year availability

Do not require code changes for normal school customization.

---

# 22. Multi-Tenant Security

Every configuration entity that belongs to a school must be tenant-scoped.

The tenant must always come from:

AuthenticatedUser.activeSchoolId

Never accept schoolId from:

- request body
- query parameters
- arbitrary headers
- URL parameters

unless the route is explicitly SYSTEM-level and intentionally manages schools.

Cross-school access must return safe 404 responses where appropriate.

Use:

AuthGuard
+
PermissionGuard

on all protected routes.

Do not put permissions into JWT.

Permissions remain DB-authoritative.

---

# 23. Authorization

Review existing permissions before adding new ones.

Do not create duplicate permissions.

If new permissions are genuinely required, add them to seed.ts.

Potential permission categories may include:

academic_structure.read
academic_structure.create
academic_structure.update
academic_structure.delete

subjects.read
subjects.create
subjects.update
subjects.delete

subject_offerings.read
subject_offerings.create
subject_offerings.update
subject_offerings.delete

combinations.read
combinations.create
combinations.update
combinations.delete

But first inspect the existing seed.

Reuse existing permissions where possible.

Do not blindly add permissions.

---

# 24. API Design

Follow the existing project conventions.

Possible module structure:

apps/api/src/modules/academic-structure/

or split into clearly justified modules such as:

academic-structure/
subjects/

Do not create unnecessary modules.

Use:

controllers/
services/
dto/
types/

where appropriate.

All endpoints should have:

- DTO validation
- Swagger documentation
- AuthGuard
- PermissionGuard
- tenant isolation
- proper HTTP status codes
- Prisma error mapping

---

# 25. Database Design Rules

Before changing schema:

1. Inspect the existing schema.
2. Inspect existing migrations.
3. Reuse existing models.
4. Avoid duplicate concepts.
5. Preserve historical relationships.
6. Add indexes for tenant-scoped queries.
7. Add appropriate unique constraints.
8. Use foreign keys correctly.
9. Think about deletion behavior carefully.

Do not modify schema merely for aesthetics.

Every schema change must have a clear business reason.

If schema changes are necessary:

- create a Prisma migration
- run it against the development database
- verify migration status
- regenerate Prisma client

---

# 26. Seed Data

Seed representative Uganda configuration as DATA.

Examples may include:

Sections:

Nursery
Primary
Lower Secondary
Upper Secondary

Levels:

N1
N2
N3
P1-P7
S1-S6

However:

THESE MUST BE SEED RECORDS.

They must not become TypeScript enums or conditional logic.

Seed enough representative subject/configuration records to demonstrate the system.

Do not attempt to encode every possible Uganda school configuration.

The school administrator must be able to customize it.

---

# 27. Do Not Hard-Code Uganda

This rule is absolute.

Forbidden:

switch (level) {
  case 'P1':
  case 'P2':
  ...
}

Forbidden:

if (className === 'S4') ...

Forbidden:

if (subject === 'Mathematics') ...

Forbidden:

if (schoolType === 'SECONDARY') ...

Uganda's education model belongs in configurable database records.

The application should operate on IDs, relationships, types and configuration.

---

# 28. Tests

Add unit tests for every new service.

Add E2E tests covering at least:

- authenticated access
- unauthenticated access
- insufficient permissions
- tenant isolation
- school customization
- CRUD
- duplicate configuration
- invalid references
- cross-school references
- client-supplied schoolId rejection
- historical academic-year integrity
- subject offering restrictions
- invalid subject combinations
- progression configuration

Test that School A cannot access School B's academic structure.

Test that activeSchoolId comes from authenticated context.

Test that request-body schoolId cannot override tenant context.

---

# 29. Migration Safety

If schema changes are required:

Run:

pnpm --filter api exec prisma validate

pnpm --filter api exec prisma migrate dev

pnpm --filter api exec prisma generate

Then:

pnpm --filter api build

pnpm --filter api test

pnpm --filter api test:e2e

Also verify:

pnpm --filter api exec prisma migrate status

Do not claim success unless commands actually pass.

---

# 30. Documentation

Update relevant project documentation.

Document:

- academic structure architecture
- configurable Uganda education model
- section/level/class/stream relationship
- subject catalog vs offering vs student selection
- subject combinations
- progression
- tenant isolation
- customization philosophy

Do not leave documentation saying the backend/academic system is nonexistent.

---

# 31. Scope Discipline

This milestone is ONLY:

Academic Structure + Uganda Education Model Foundation.

Do NOT implement:

- examination engine
- report cards
- grading engine
- attendance
- timetable
- fees
- payroll
- teacher management
- full curriculum content
- lesson planning
- competency assessment engine

Those will be separate milestones.

However, design this foundation so those modules can safely build on it later.

---

# 32. Critical Architecture Review Before Coding

Before modifying anything, produce a short analysis answering:

1. What academic models already exist?
2. What needs to be extended?
3. What should NOT be changed?
4. Which concepts are currently missing?
5. How will Nursery, Primary, O-Level and A-Level be represented?
6. How will subject-based and thematic learning coexist?
7. How will school customization work?
8. How will historical enrollments remain valid?
9. Which new permissions are actually necessary?
10. What schema migration is required?

Then implement.

Do not wait for another confirmation after the analysis unless a destructive architectural decision is required.

---

# 33. Final Verification Report

At completion report:

## Architecture

Explain the final academic structure.

## Database

List:

- created models
- modified models
- migration name
- important indexes/constraints

## API

List all endpoints.

## Uganda Model

Explain how the system represents:

- Nursery
- P1-P3
- P4
- P5-P7
- O-Level
- A-Level

without hard-coded business logic.

## Customization

Explain how a school can customize the structure.

## Security

Explain tenant isolation and authorization.

## Seed

List representative configuration data added.

## Tests

Report actual:

- unit tests
- E2E tests
- build
- Prisma validation
- migration status

## Git

Show:

git status

git diff --stat

Do NOT commit or push.

---

# FINAL RULE

Build this as the foundation of a serious School ERP.

Do not build a "Uganda school demo".

Build a configurable academic engine that can faithfully represent Ugandan schools today while remaining capable of supporting different school structures tomorrow.

Inspect first.

Reuse existing architecture.

Do not duplicate existing models.

Do not hard-code curriculum rules.

Do not weaken tenant isolation.

Make the smallest correct architectural changes necessary.
