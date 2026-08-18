# School ERP — Milestone 06: Academic Years & Terms Administration

## Objective

Implement the production-ready Academic Years and Terms administration module.

The existing repository is the source of truth. Inspect the current code before making changes and preserve the established architecture.

Current architecture:

- pnpm monorepo
- NestJS 11 API
- Prisma 7
- PostgreSQL
- PWA frontend
- Modular monolith
- JWT authentication
- Argon2 password hashing
- Passport JWT
- AuthGuard
- PermissionGuard
- Database-authoritative authorization
- Explicit `activeSchoolId` tenant context

Do not redesign existing architecture.

---

# 1. Inspect First

Before changing anything, inspect:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `apps/api/src/modules/identity/`
- `apps/api/src/modules/schools/`
- `apps/api/src/modules/users/`
- `apps/api/src/app.module.ts`
- existing migrations
- existing unit tests
- existing E2E tests

Inspect the existing AcademicYear and Term Prisma models and their relations before implementing anything.

Do not assume field names. Use the actual schema.

Also inspect the existing permission keys:

- `academic_years.*`
- `terms.*`

Use the exact keys already defined by the seed.

---

# 2. Module

Create:

```text
apps/api/src/modules/academic-years/
Keep Terms inside the Academic Years domain unless the existing architecture strongly indicates otherwise.

Do not create unnecessary modules.

Register the module in app.module.ts.

3. Academic Year Administration

Implement tenant-scoped Academic Year operations using the existing Prisma model.

At minimum:

Create
POST /api/v1/academic-years

Required authorization:

AuthGuard
PermissionGuard
academic_years.create

The school MUST come from:

AuthenticatedUser.activeSchoolId

Never accept schoolId from the client as the tenant context.

If a client sends schoolId, it must not be allowed to override the authenticated school.

List
GET /api/v1/academic-years

Permission:

academic_years.read

Return only academic years belonging to the active school.

Get One
GET /api/v1/academic-years/:id

Permission:

academic_years.read

A record belonging to another school must not be accessible.

Prefer a safe 404 for cross-school resource lookup rather than revealing that the record exists.

Update
PATCH /api/v1/academic-years/:id

Permission:

academic_years.update

Tenant isolation must be enforced.

Delete
DELETE /api/v1/academic-years/:id

Permission:

academic_years.delete

Respect existing Prisma relations and database constraints.

Do not introduce cascading destructive behavior merely to make deletion succeed.

If the academic year has dependent Terms or other records that prevent deletion, return an appropriate conflict response.

4. Academic Year Rules

Inspect the existing schema and implement sensible validation based on its actual fields.

At minimum, prevent obvious invalid states such as:

empty names
invalid dates
end date before start date

If the schema has a unique academic-year identifier per school, respect that constraint.

Do not invent unnecessary business rules.

Do not add schema fields unless the existing model genuinely cannot support the milestone.

5. Terms

Implement Term administration under the Academic Years domain.

At minimum:

Create
POST /api/v1/academic-years/:academicYearId/terms

Permission:

terms.create

The AcademicYear MUST belong to the authenticated activeSchoolId.

Never trust a client-supplied school ID.

List
GET /api/v1/academic-years/:academicYearId/terms

Permission:

terms.read

Only return terms belonging to:

activeSchoolId
+
academicYearId
Get One
GET /api/v1/academic-years/:academicYearId/terms/:termId

Permission:

terms.read

Verify the complete tenant relationship.

Update
PATCH /api/v1/academic-years/:academicYearId/terms/:termId

Permission:

terms.update

Verify:

term
→ academic year
→ active school
Delete
DELETE /api/v1/academic-years/:academicYearId/terms/:termId

Permission:

terms.delete

Respect database relationships and constraints.

6. Tenant Security

This is mandatory.

Every query must be scoped through:

AuthenticatedUser.activeSchoolId

The client must never determine the tenant.

Do NOT trust:

body.schoolId
query.schoolId
params.schoolId
headers

as the security boundary.

Expected security chain:

JWT
 ↓
AuthGuard
 ↓
AuthenticatedUser.activeSchoolId
 ↓
PermissionGuard
 ↓
AcademicYear/Term Service
 ↓
Prisma query scoped to activeSchoolId

Cross-school records must never leak.

7. Authorization

Use the existing pattern:

@UseGuards(AuthGuard, PermissionGuard)

Use:

@Permissions('academic_years.read')
@Permissions('academic_years.create')
@Permissions('academic_years.update')
@Permissions('academic_years.delete')

and:

@Permissions('terms.read')
@Permissions('terms.create')
@Permissions('terms.update')
@Permissions('terms.delete')

Use the exact seeded permission keys.

Do not put permissions into JWT claims.

Do not bypass PermissionGuard.

8. DTO Validation

Create appropriate DTOs.

Use the existing global ValidationPipe:

whitelist: true
forbidNonWhitelisted: true
transform: true

Validate:

required fields
strings
dates
UUID parameters where applicable

Use ParseUUIDPipe for UUID route parameters where appropriate.

Follow existing DTO conventions.

9. Business Integrity

Inspect the actual Prisma relations before implementing deletion.

The service should translate expected Prisma errors into meaningful HTTP responses.

Examples:

P2002 → 409 Conflict
P2025 → 404 Not Found
foreign-key/dependency conflict → 409 Conflict

Do not expose raw Prisma/database errors to clients.

Keep business logic in services, not controllers.

10. Tests

Add comprehensive unit tests.

At minimum cover:

Academic Years
create
list
get
update
delete
validation
duplicate/conflict handling
cross-school isolation
client-supplied school ID cannot override tenant
authorization failures
Terms
create
list
get
update
delete
invalid academic year
cross-school academic year
cross-school term
client-supplied school ID cannot override tenant
authorization failures

Follow the existing test architecture.

11. E2E Tests

Create:

apps/api/test/academic-years.e2e-spec.ts

Use the existing mocked PrismaService approach unless there is a strong reason to use another approach.

Cover HTTP behavior including:

authenticated access
missing JWT
insufficient permissions
create
list
update
delete
term CRUD
cross-school isolation
school ID injection attempt
passwordHash must never appear in responses

Existing authentication and authorization E2E tests must remain green.

12. Schema Discipline

Do NOT modify:

schema.prisma

unless implementation is genuinely impossible with the current models.

If a schema change appears necessary:

Stop.
Explain why it is necessary.
Do not silently create a migration.
Report the proposed change for approval.

Do not modify the seed unless genuinely necessary.

The existing permission seed should be reused.

13. API Documentation

Follow the existing Swagger conventions.

Document:

routes
request DTOs
responses
authentication requirements
permission requirements where appropriate

Keep documentation consistent with the existing API.

14. No Unrelated Work

Do NOT implement:

students
staff
attendance
grades
frontend UI
audit logging
Redis
microservices
refresh-token rotation
dynamic permissions
role editor
unrelated schema redesign
provisioning/bootstrap

Those belong to later milestones.

15. Verification

Run:

pnpm --filter api exec prisma validate
pnpm --filter api exec prisma generate
pnpm --filter api build
pnpm --filter api test
pnpm --filter api test:e2e

If the repository's existing scripts require a slightly different command, use the established project convention and report it.

All existing tests must remain passing.

16. Git Discipline

Do NOT commit.

After implementation report:

Changed

Every created/modified file and its purpose.

Architecture

Explain how Academic Years and Terms fit into the existing tenant/auth/authorization architecture.

Security

Explain how activeSchoolId and cross-school isolation are enforced.

Tests

Report exact unit and E2E test counts.

Verification

Report actual results for:

Prisma validate
Prisma generate
build
unit tests
E2E tests
Git Status

Show:

git status -sb
git diff --stat
Issues

Clearly identify any unresolved issues.

Next Milestone

Recommend the next milestone but DO NOT implement it.

STOP after the report and wait for approval.