# School ERP — User, Membership & Role Administration

## Milestone Status

Planned.

This document defines ONE implementation milestone.

The coding agent must implement only this milestone and must not proceed into academic years, terms, students, staff, attendance, grades, audit logging, or other future modules.

---

# 1. Objective

Implement production-oriented **User, School Membership, and Role Administration APIs** for the existing School ERP.

The purpose of this milestone is to allow authorized school administrators to manage users within their active school context.

The existing authentication and authorization architecture is already implemented and tested.

Do NOT redesign it.

The existing architecture is:

```text
User
 │
 ├── SchoolMembership ──> School
 │
 └── UserRole ──> Role
                    │
                    └── RolePermission ──> Permission
Tenant context:

JWT
 │
 └── activeSchoolId
          │
          ▼
   AuthenticatedUser
          │
          ▼
 PermissionGuard
          │
          ▼
 PermissionService
          │
          ▼
 UserRole → Role → RolePermission → Permission

Every school-scoped operation MUST remain inside the authenticated user's activeSchoolId.
2. Repository Is Source of Truth

Before changing anything:

Inspect the repository.
Inspect the current Git status.
Read:
apps/api/prisma/schema.prisma
apps/api/prisma/seed.ts
apps/api/src/modules/identity/
apps/api/src/modules/schools/
existing unit tests
existing E2E tests
docs/
Inspect the latest Git commit.
Understand the existing conventions before creating new files.

Do not assume the schema from this document is more authoritative than the actual repository.

The repository is the source of truth.

3. Existing Security Architecture — MUST PRESERVE

Authentication is already implemented.

The JWT contains only:

{
  sub: string;
  activeSchoolId: string | null;
}

Do NOT add:

roleNames
permissionKeys
school permissions
user permissions

to the JWT.

Authorization is database-authoritative.

The existing flow is:

AuthGuard
    ↓
JwtStrategy
    ↓
active user verification
    ↓
active school membership verification
    ↓
AuthenticatedUser
    ↓
PermissionGuard
    ↓
PermissionService
    ↓
database roles + permissions

Use:

@UseGuards(AuthGuard, PermissionGuard)

on protected routes.

Use:

@Permissions(...)

to enforce permissions.

Use:

@CurrentUser()

when the authenticated user context is required.

Never trust:

schoolId from request body
schoolId from query parameters
schoolId from arbitrary route parameters
roles supplied by clients
permission keys supplied by clients
activeSchoolId supplied by clients

The authoritative school context is:

AuthenticatedUser.activeSchoolId
4. Existing Permission Model

Inspect apps/api/prisma/seed.ts and use the actual permission keys already seeded.

The existing permission families include:

users.*
memberships.*
roles.*

Do NOT invent duplicate permission keys if the required keys already exist.

Inspect the seed and determine the exact available keys before implementing the controllers.

Expected capabilities include concepts such as:

users.read
users.create
users.update
memberships.read
memberships.create
memberships.update
memberships.activate
memberships.deactivate
roles.read
roles.assign
roles.revoke

However:

The actual repository seed is authoritative.

If the exact names differ, use the existing names.

Do not modify the seed merely to rename existing permissions.

5. Module Structure

Create a dedicated module following existing project conventions.

Prefer:

apps/api/src/modules/users/
├── users.module.ts
├── controllers/
│   └── users.controller.ts
├── services/
│   └── users.service.ts
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── ...
└── types/

If the repository conventions indicate a better structure, follow the repository.

Do not create unnecessary abstractions.

Keep the implementation understandable for a solo developer.

Register the module in:

apps/api/src/app.module.ts
6. User Administration

Implement the minimum useful user-management API.

Create user

Provide an endpoint for an authorized school administrator to create a user.

Suggested:

POST /api/v1/users

The exact route may follow existing conventions if they are different.

Requirements:

authentication required
permission required
password must be hashed using the existing PasswordService
never store plaintext passwords
never return passwordHash
normalize email consistently with existing authentication logic
reject duplicate email addresses appropriately
validate request body using DTO validation
do not allow the client to provide arbitrary schoolId
do not allow the client to create arbitrary SYSTEM roles
do not allow the client to create a SUPER_ADMIN
do not allow privilege escalation through request fields

The newly created user should not automatically receive arbitrary roles.

Membership and role assignment should remain explicit operations.

If the existing business design strongly favors creating the user and membership together, inspect the schema and existing architecture first and implement the safest consistent behavior.

Do not redesign the schema just to simplify this endpoint.

7. List Users / Members

Implement an endpoint for viewing members of the authenticated user's active school.

For example:

GET /api/v1/users

Requirements:

authenticated
permission protected
use activeSchoolId
return only users who have membership in the active school
do not accept a client-controlled school ID
do not leak users from other schools
do not return password hashes
include useful membership information where appropriate

Possible response information:

id
email
fullName
userStatus
membershipStatus
joinedAt
roles

But only return information supported by the existing model and needed by the API.

Do not expose sensitive fields unnecessarily.

8. User Details

Implement a safe way to retrieve a specific user's details within the active school.

For example:

GET /api/v1/users/:userId

Requirements:

authenticate
require appropriate permission
resolve the user's membership through:
activeSchoolId
+
userId
never retrieve a user merely because the userId exists globally
deny access when the user is not a member of the active school
do not leak whether unrelated users exist in another school where practical
never return passwordHash
9. Membership Management

Implement membership management for the active school.

The existing schema contains:

SchoolMembership

with:

userId
schoolId
status
joinedAt

and:

@@unique([userId, schoolId])

Respect this design.

Do not add a role field to SchoolMembership.

Roles remain represented by:

UserRole
10. Activate / Deactivate Membership

Implement safe membership lifecycle operations.

Examples:

PATCH /api/v1/users/:userId/membership

or separate endpoints such as:

POST /api/v1/users/:userId/membership/activate
POST /api/v1/users/:userId/membership/deactivate

Follow the repository's established REST conventions.

Requirements:

authenticated
permission protected
operate only within activeSchoolId
verify the target membership exists in the active school
never modify another school's membership
do not accept arbitrary schoolId from the client
use existing MembershipStatus values
prevent accidental privilege escalation

Consider the current authentication behavior:

JwtStrategy re-checks ACTIVE membership on every authenticated request.

Therefore:

Deactivating a user's membership must invalidate their ability to authenticate/use that school context on subsequent requests.

Do not implement a separate token revocation system in this milestone.

11. Role Assignment

Implement role assignment using the existing:

UserRole
Role
SchoolMembership

architecture.

For example:

POST /api/v1/users/:userId/roles

Request may contain a role identifier/name appropriate to the existing schema.

Requirements:

Authenticate the administrator.
Require the existing role-assignment permission.
Resolve the administrator's activeSchoolId.
Verify the target user has an ACTIVE membership in that school.
Load the requested role from the database.
Verify that the role is appropriate for the school context.
For SCHOOL roles:
UserRole.schoolId MUST be the active school.
SYSTEM roles must NOT be assignable through normal school administration.
Do not allow a SCHOOL_ADMIN to grant SUPER_ADMIN.
Do not accept schoolId from the client as authority.
Prevent duplicate assignments.
Respect existing unique constraints.

The important rule is:

School Admin in School A
        ↓
can assign SCHOOL roles
        ↓
only to members of School A
        ↓
UserRole.schoolId = School A
12. Role Listing

Provide a safe way for school administrators to see assignable roles.

For example:

GET /api/v1/users/:userId/roles

or:

GET /api/v1/roles

Follow the repository architecture.

Important:

A school administrator must NOT receive SYSTEM roles as assignable roles.

Do not expose:

SUPER_ADMIN

as an assignable school role.

Only roles with:

Role.scope = SCHOOL

should be assignable through normal school administration.

Use the existing global Role catalog.

Do not add schoolId to Role.

13. Role Revocation

Implement role removal.

For example:

DELETE /api/v1/users/:userId/roles/:roleId

or another convention consistent with the project.

Requirements:

authenticated
permission protected
active school context required
target user must belong to active school
role assignment must belong to active school
SYSTEM roles cannot be revoked through normal school administration
no cross-school role manipulation
handle nonexistent assignments safely
respect database constraints
14. Self-Protection Rules

Implement reasonable safeguards against administrators accidentally locking themselves out.

At minimum consider:

An administrator should not be able to deactivate their own active membership if that would leave the school without an administrator.
An administrator should not be able to revoke their own only administrative role if that would leave the school without an administrator.

Do NOT invent a complicated policy.

Inspect the existing roles and permissions and implement the smallest safe rule.

If the existing schema cannot safely determine "last administrator", explain the limitation instead of creating an unreliable heuristic.

15. Cross-School Isolation

This is one of the most important requirements.

Assume:

School A
School B

and:

User X → School A
User Y → School B

A user operating with:

activeSchoolId = School A

must NOT be able to:

list School B members
retrieve School B users
activate School B membership
deactivate School B membership
assign School B roles
revoke School B roles

Even if they know:

School B UUID
User Y UUID
Role UUID

Never solve this by simply checking that the UUID exists.

Every database query must establish the relationship to:

activeSchoolId
16. Transaction Safety

Role and membership operations may involve multiple database writes.

Use Prisma transactions where appropriate.

For example:

verify membership
+
create UserRole

should be treated atomically where necessary.

Avoid partial state.

Do not introduce a generic transaction abstraction unless required.

17. Password Security

Reuse the existing:

PasswordService

Do NOT implement another password hashing mechanism.

Do NOT use:

bcrypt

if the existing project uses Argon2.

Do not return:

passwordHash

from any endpoint.

18. Email Handling

Follow the existing authentication email normalization behavior.

Email uniqueness must be respected.

Do not silently create duplicate users.

If the database currently enforces uniqueness, handle the Prisma error safely rather than exposing raw database errors.

19. API Errors

Use NestJS HTTP exceptions consistent with the existing application.

Examples:

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict

Do not leak:

password hashes
database connection details
Prisma internal errors
unrelated school information
role/permission internals unnecessarily
20. Swagger

Follow the existing Swagger conventions.

Every new endpoint should have appropriate Swagger decorators.

Document:

request body
response
authorization requirement
possible error responses where useful

Do not rewrite existing Swagger configuration.

21. Tests

Testing is mandatory.

Do not merely claim success.

Unit tests

Add service tests covering at minimum:

User creation
valid creation
password is hashed
plaintext password never returned
duplicate email
validation/business errors
Member listing
only active-school members returned
other-school users excluded
User retrieval
valid member returned
foreign-school user denied/not found
Membership
activate
deactivate
nonexistent membership
foreign-school membership
self-protection rules where implemented
Roles
assign valid SCHOOL role
duplicate assignment
foreign-school user
SYSTEM role rejected
SUPER_ADMIN rejected
revoke valid role
revoke foreign-school role rejected
22. E2E Tests

Create:

apps/api/test/users.e2e-spec.ts

or the appropriate filename following project conventions.

Use the existing E2E testing architecture.

The project currently mocks PrismaService for E2E tests.

Preserve that approach unless there is a concrete reason not to.

Cover:

authenticated user can access authorized endpoint
unauthenticated request → 401
insufficient permission → 403
create user
list members
retrieve member
deactivate membership
activate membership
assign SCHOOL role
revoke SCHOOL role
SYSTEM role assignment rejected
cross-school access rejected
client-supplied school ID cannot override active school
password hash never appears in responses

Also ensure all existing authentication and authorization E2E tests remain green.

23. Do Not Modify the Prisma Schema Unless Necessary

The current schema is intentional.

Do NOT:

add schoolId to Role
add role to SchoolMembership
redesign UserRole
introduce tenant-specific Role records
change RoleScope
add unrelated fields
create a new authorization model

Only modify the schema if implementation reveals a genuine requirement that cannot be correctly handled using the existing model.

If you believe a schema change is required:

STOP before applying it.

Report:

Why the schema change is required
What would change
Why the existing schema cannot support the requirement
Migration impact

and wait for approval.

24. Do Not Modify Seed Unless Necessary

Use the existing seeded roles and permissions.

Do not redesign the seed.

Do not add demo users automatically.

Do not create a default SUPER_ADMIN.

Do not expose credentials.

If a missing permission genuinely blocks the milestone, report it before modifying the seed.

Prefer using the existing permission model.

25. Do Not Implement Future Milestones

Do NOT implement:

academic years
terms
students
parents
staff
classes
attendance
grades
fees
reports
audit logging
notifications
frontend user management
invitations/email delivery
password reset
refresh token rotation
Redis
microservices
Kubernetes

Those belong to later milestones.

26. Architecture Constraints

Keep the application a:

Modular Monolith

Do not introduce microservices.

Keep:

pnpm monorepo
NestJS
Prisma 7
PostgreSQL
PWA frontend

Do not introduce unnecessary infrastructure.

Keep the implementation simple enough for a solo developer to maintain.

27. Database Authority

Never trust authorization information supplied by the client.

The server must determine:

current user
        ↓
active school
        ↓
membership
        ↓
role
        ↓
permission

from authenticated server context and the database.

The client should only request an operation.

The server decides whether it is allowed.

28. Verification

After implementation, run all relevant checks.

At minimum:

pnpm --filter api exec prisma validate
pnpm --filter api exec prisma generate
pnpm --filter api build
pnpm --filter api test
pnpm --filter api test:e2e

If the repository's scripts require running commands from apps/api, use the established working commands.

Do not claim a test passed unless it actually passed.

Report:

Prisma validate:
Prisma generate:
Build:
Unit tests:
E2E tests:
29. Git Discipline

DO NOT commit automatically.

After implementation:

Show git status -sb.
Show git diff --stat.
List all created files.
List all modified files.
Explain important architectural changes.
Report dependency changes.
Report schema/seed changes.
Report test results.
Report any unresolved issues.

Then STOP.

Wait for approval before committing.

30. Final Report Format

Return exactly these sections:

1. Implementation Summary

What was implemented.

2. API Endpoints

List every new endpoint with:

METHOD /path
Authentication
Permission
Purpose
3. Security

Explain:

activeSchoolId enforcement
membership enforcement
role restrictions
SYSTEM role protection
cross-school isolation
password protection
self-protection rules
4. Files Changed

List created and modified files.

5. Schema / Seed

Clearly state:

Schema changed: YES/NO
Seed changed: YES/NO
Migration created: YES/NO

If yes, explain exactly why.

6. Tests

Show actual results.

7. Git Status

Show actual output.

8. Issues / Deferred Work

Only list genuine remaining issues.

9. Next Milestone

Recommend the next milestone but DO NOT implement it.

Final Instruction

This is a production-oriented ERP.

Do not optimize for the number of endpoints.

Optimize for:

correctness
security
tenant isolation
maintainability
testability
simplicity

The most important invariant is:

A user operating inside School A must never be able to manipulate School B data, memberships, or roles merely by supplying School B identifiers.

Inspect first.

Preserve the existing architecture.

Implement only this milestone.

Test everything.

Do not commit.