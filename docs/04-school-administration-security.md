# School ERP — School Administration Hardening + Security Foundation

## Milestone Status

Previous milestones completed:

- Prisma 7 infrastructure
- Identity module
- Argon2 password hashing
- JWT authentication
- Multi-school authentication
- Active school selection
- AuthGuard
- PermissionGuard
- Database-backed PermissionService
- Cross-school authorization isolation
- Permission seed
- Authentication and authorization tests

The repository is currently the source of truth.

---

# 1. CRITICAL INSTRUCTIONS

Before making any changes:

1. Inspect the existing implementation.
2. Preserve all existing functionality.
3. Do not reset the repository.
4. Do not restore files.
5. Do not stash existing work.
6. Do not clean untracked files.
7. Do not delete working code.
8. Do not redesign the existing architecture.
9. Do not commit.
10. Do not push.

The current working tree contains completed Identity, Authentication, and Authorization work.

Those changes must be preserved.

Make the smallest production-quality changes necessary for this milestone.

---

# 2. CURRENT ARCHITECTURE

The application is a production-oriented School ERP built using:

- pnpm monorepo
- NestJS 11
- Prisma 7.9.1
- PostgreSQL
- PWA frontend
- Modular monolith architecture

The API is located under:

```text
apps/api
The application uses:

global PrismaModule
IdentityModule
SchoolsModule
global ValidationPipe
global HTTP exception filter
Swagger
API prefix /api/v1

Prisma generates the client into:

apps/api/generated/prisma

Do not replace this with @prisma/client.

3. IDENTITY AND AUTHENTICATION

Authentication is already implemented.

Current flow:

POST /auth/login
        ↓
PasswordService
        ↓
UserStatus.ACTIVE
        ↓
ACTIVE SchoolMemberships
        ↓
school selection
        ↓
JWT

JWT contains only:

{
  "sub": "user-id",
  "activeSchoolId": "school-id-or-null"
}

Do NOT add roles or permissions to the JWT.

The database remains authoritative.

4. AUTH GUARD

The existing AuthGuard uses Passport JWT.

JwtStrategy validates the token and re-checks the database.

It verifies:

User exists.
User is ACTIVE.
If activeSchoolId exists:
the user has a SchoolMembership for that school
the membership is ACTIVE

The authenticated request receives:

AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  activeSchoolId: string | null;
  roleNames: string[];
  permissionKeys: string[];
}

Do not weaken this behavior.

5. AUTHORIZATION

PermissionGuard is already implemented.

PermissionService resolves permissions from:

User
 ↓
SchoolMembership
 ↓
UserRole
 ↓
Role
 ↓
RolePermission
 ↓
Permission

For a tenant context:

activeSchoolId

is authoritative.

SCHOOL roles are resolved only for:

activeSchoolId

SYSTEM roles use:

schoolId = null

Multiple permissions use AND semantics.

Do not move permissions into the JWT.

Do not trust roles or permissions supplied by clients.

6. IMPORTANT SYSTEM ROLE SEMANTICS

The existing architecture intentionally allows SYSTEM roles to contribute their assigned permissions when an active school is selected.

For example:

SUPER_ADMIN
    ↓
SYSTEM role
    ↓
assigned permissions

This behavior is intentional.

Do not change it.

However:

A SYSTEM permission does NOT mean that a client may target an arbitrary school.

Tenant-specific operations must still use:

AuthenticatedUser.activeSchoolId

and verify the appropriate ACTIVE SchoolMembership where applicable.

Therefore:

SUPER_ADMIN + activeSchoolId=A

can operate in School A.

But:

SUPER_ADMIN + activeSchoolId=null

must not be allowed to arbitrarily select School B simply by sending:

{
  "schoolId": "school-b"
}

The server-side tenant context remains authoritative.

7. EXISTING SCHOOLS MODULE

The repository already contains:

apps/api/src/modules/schools/

Do NOT create another SchoolsModule.

First inspect the complete existing implementation.

Determine:

controllers
services
DTOs
guards
decorators
Prisma queries
Swagger documentation
current tests
existing endpoints
authorization requirements

The existing SchoolsModule is currently the reference implementation for tenant-scoped business logic.

Preserve its good architecture.

8. CURRENT SCHOOL ENDPOINTS

The repository currently contains:

POST  /api/v1/schools
GET   /api/v1/schools/me
PATCH /api/v1/schools/me

Inspect the actual implementation before changing anything.

Do not duplicate existing endpoints.

9. SCHOOL ADMINISTRATION HARDENING

The goal of this milestone is to make the existing School administration functionality production-safe and thoroughly tested.

The important tenant boundary is:

JWT
 ↓
AuthGuard
 ↓
AuthenticatedUser.activeSchoolId
 ↓
ACTIVE SchoolMembership
 ↓
School

A client must never be able to override:

activeSchoolId

through:

request body
query parameter
route parameter
custom HTTP header

For /schools/me, the target school must always come from:

request.user.activeSchoolId
10. SCHOOL SERVICE MEMBERSHIP CHECK

Inspect the existing SchoolsService.

For tenant-scoped operations, ensure the following sequence:

Authenticate the user.
Read activeSchoolId.
Reject if no active school is available and the endpoint requires a tenant.
Verify an ACTIVE SchoolMembership for:
userId + activeSchoolId
Only then query or modify the School.

Do not rely solely on:

school.findUnique({
  where: {
    id: activeSchoolId,
  },
});

The existence of a school does not prove the user is authorized to access it.

11. GET CURRENT SCHOOL

Ensure:

GET /api/v1/schools/me

is protected by:

@UseGuards(AuthGuard, PermissionGuard)

and:

@Permissions('schools.read')

Use the actual seeded permission key from seed.ts.

Do not invent another permission name.

The endpoint must:

authenticate the user
obtain activeSchoolId from authenticated context
verify ACTIVE membership
return only that school
never accept a client-supplied school ID as the target

Expected behavior:

No JWT
401 Unauthorized
No schools.read permission
403 Forbidden
No active school context

Reject appropriately.

Inactive membership
403 Forbidden
Valid authenticated tenant
200 OK
12. PATCH CURRENT SCHOOL

Ensure:

PATCH /api/v1/schools/me

is protected by:

@UseGuards(AuthGuard, PermissionGuard)

and:

@Permissions('schools.update')

The target school must come only from:

AuthenticatedUser.activeSchoolId

Do not accept:

{
  "schoolId": "..."
}

as a target selector.

The DTO must allow only legitimate editable School fields.

Do not allow clients to modify:

id
createdAt
updatedAt
memberships
roles
permissions
authorization data
ownership/security fields

Use class-validator DTO validation.

The existing global ValidationPipe is:

whitelist: true
forbidNonWhitelisted: true
transform: true

Preserve it.

13. POST SCHOOL

Inspect the existing implementation of:

POST /api/v1/schools

If it already exists, review it rather than creating another endpoint.

Use:

@UseGuards(AuthGuard, PermissionGuard)

and the actual:

schools.create

permission.

School creation should be treated as a SYSTEM-level administrative operation according to the current permission seed and role architecture.

Do not invent a school-admin registration workflow.

Do not automatically create memberships or roles unless the existing architecture explicitly requires it.

Do not modify the schema just to support provisioning.

14. SCHOOL DELETE

Do NOT implement:

DELETE /api/v1/schools/:id

during this milestone.

Even though:

schools.delete

exists in the permission seed, School has relationships to:

AcademicYear
SchoolMembership
UserRole
other future tenant data

Deletion therefore requires a deliberate data lifecycle strategy.

Leave deletion unimplemented.

Document this as a future architectural decision if appropriate.

15. SCHOOLS SERVICE UNIT TESTS

Create:

apps/api/src/modules/schools/services/schools.service.spec.ts

if it does not already exist.

Use mocked Prisma.

Test at minimum:

active school context required
ACTIVE membership required
correct school lookup
cross-school isolation
update target derived only from activeSchoolId
client-provided school ID cannot change target
forbidden fields cannot be updated

Do not require a live PostgreSQL database.

16. SCHOOLS E2E TESTS

Create:

apps/api/test/schools.e2e-spec.ts

Follow the existing e2e testing architecture.

The project currently uses mocked PrismaService for e2e tests.

Do not require a production database.

Test at minimum:

Authentication
no JWT → 401
Authorization
missing schools.read → 403
missing schools.update → 403
Membership
inactive membership → 403
active membership → success
Tenant isolation

User has:

School A
School B

JWT:

activeSchoolId = School A

Request:

GET /api/v1/schools/me

must return:

School A

Never School B.

Test attempts to override the school using:

body
query parameter
headers

The result must remain scoped to School A.

17. AUTH ME ENDPOINT

Implement:

GET /api/v1/auth/me

Requirements:

@UseGuards(AuthGuard)

Use:

@CurrentUser()

The endpoint must return a safe representation of the authenticated user.

Never return:

passwordHash

Never return raw authorization database records.

The JWT must remain unchanged.

18. ROLE AND PERMISSION RESOLUTION FOR /AUTH/ME

The current AuthenticatedUser contains:

roleNames: string[];
permissionKeys: string[];

These currently remain empty.

For /auth/me, populate them from the database.

Do not trust JWT values.

Use the existing PermissionService.

For an active school:

SYSTEM roles
+
SCHOOL roles for activeSchoolId

Only permissions applicable to the authenticated context may be returned.

Roles and permissions belonging exclusively to another school must never appear.

For:

activeSchoolId = null

only applicable SYSTEM roles should contribute.

Do not put the resulting permission graph into the JWT.

19. AUTH ME RESPONSE

Use a clean response shape.

It may contain:

{
  "id": "...",
  "email": "...",
  "fullName": "...",
  "activeSchoolId": "...",
  "roleNames": [],
  "permissionKeys": []
}

Do not blindly serialize the Prisma User object.

Do not expose:

passwordHash
internal database objects
memberships
UserRole records
RolePermission records
unnecessary internal fields
20. AUTH ME TESTS

Add tests for:

no JWT → 401
valid JWT → 200
correct user information
activeSchoolId correctly returned
roleNames populated from database
permissionKeys populated from database
School A permissions do not leak when activeSchoolId=B
SYSTEM role behavior remains correct
passwordHash never appears

Existing authentication tests must remain green.

21. LOGIN THROTTLING

The repository already contains:

@nestjs/throttler

but it is currently not registered.

Inspect the installed version.

Implement reasonable brute-force protection specifically for:

POST /api/v1/auth/login

Do not unnecessarily throttle every API endpoint.

Do not introduce Redis.

Do not create a custom rate-limiter.

Use the existing NestJS throttler package.

Choose a sensible login limit appropriate for the current monolithic application.

Document the chosen limit in code comments or documentation where useful.

Do not weaken authentication error handling.

The existing generic:

Invalid credentials

behavior must remain.

22. DO NOT IMPLEMENT YET

Do NOT implement any of the following:

user management
membership management
role assignment API
academic years
terms
students
teachers
classes
streams
subjects
attendance
exams
grades
fees
parent portal
frontend authentication
PWA changes
provisioning/bootstrap
school deletion
audit logging
Redis
microservices
generic tenant middleware
TenantContextService
TenantGuard
repository abstraction
AsyncLocalStorage/CLS
dynamic role editor
permission editor

These belong to later milestones.

23. SCHEMA AND SEED

Do NOT modify:

apps/api/prisma/schema.prisma

Do NOT modify:

apps/api/prisma/seed.ts

unless a genuine blocker is discovered.

Do not create a migration.

The existing schema is sufficient for this milestone.

If you discover a genuine schema limitation:

STOP.

Explain the limitation and wait for approval.

Do not redesign the database automatically.

24. SYSTEM ROLE SECURITY RULE

Preserve this behavior:

SYSTEM role
+
assigned permission
=
permission may contribute inside active tenant context

But:

SYSTEM permission
≠ arbitrary school selector

For tenant-specific endpoints:

activeSchoolId

remains mandatory where a school context is required.

Do not allow a client to provide:

schoolId=B

to override:

activeSchoolId=A
25. TEST REGRESSION REQUIREMENT

All existing tests must continue passing.

Existing unit tests include authentication and authorization coverage.

Existing e2e tests include:

authentication
permission enforcement
cross-school isolation
SYSTEM-role behavior

Do not break these tests.

26. VERIFICATION

After implementation, run the actual commands.

From the repository:

pnpm --filter api exec prisma validate

Then:

pnpm --filter api exec prisma generate

Then:

pnpm --filter api build

Then:

pnpm --filter api test

Then:

pnpm --filter api test:e2e

Do not claim success without running the commands.

If a command fails:

Inspect the actual failure.
Make the smallest necessary correction.
Rerun the failed command.
Report the real result.
27. GIT SAFETY

Do NOT execute:

git reset
git restore
git checkout .
git clean
git stash
git commit
git push

The current dirty working tree contains previous Identity/Auth/Authorization work.

Preserve it.

At the end run:

git diff --stat

and:

git status -sb
28. FINAL REPORT

When finished, report exactly:

Changed

List every created/modified file and explain why.

Existing SchoolsModule

Explain:

what already existed
what was changed
how tenant isolation works
Tenant Context

Explain the complete flow:

JWT
→ AuthGuard
→ AuthenticatedUser.activeSchoolId
→ ACTIVE SchoolMembership
→ SchoolService
→ Prisma
Auth /me

Explain:

response fields
role resolution
permission resolution
how cross-school permission leakage is prevented
Login Throttling

Report:

package/version used
configuration
endpoint protected
chosen limit
Security

Explain:

authentication
authorization
active membership verification
activeSchoolId enforcement
cross-school isolation
SYSTEM role semantics
client school-ID override protection
Tests

Report exact results:

Unit:
X suites
X tests


E2E:
X suites
X tests
Verification

Report actual results:

prisma validate:
prisma generate:
build:
unit tests:
e2e tests:
Git Status

Report:

git diff --stat
git status -sb
Issues

List unresolved issues only.

Next Milestone

Recommend the next logical milestone.

Do NOT implement it.

FINAL RULE

Inspect first.

Preserve the existing architecture.

Extend the existing SchoolsModule.

Use the actual seeded permissions.

Keep JWT minimal.

Keep database authorization authoritative.

Never weaken tenant isolation.

Do not redesign the schema.

Do not create unnecessary abstractions.

Make the smallest correct production-quality change.

Do not commit.

Do not push.