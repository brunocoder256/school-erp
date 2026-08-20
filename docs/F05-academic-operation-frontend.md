F05 — Academic Operations Frontend

School ERP Frontend Implementation Specification

Project: School ERP
Frontend milestone: F05
Depends on: F01 — Frontend Foundation
Depends on: F02 — Authentication, School Context & Permissions
Depends on: F03 — Application Shell & Navigation
Depends on: F04 — Role-Based Experiences
Backend: M10 Academic Operations API is the source of truth
Implementation: Frontend academic-operations UI only
No backend redesign

1. Mission

Implement the first real School ERP feature module in the frontend:

Academic Operations & Teaching/Learning

F05 connects the existing backend M10 domain to usable frontend workflows.

The frontend should allow authorized users to understand and manage the academic structure that M10 established:

School
   ↓
Academic Year
   ↓
Education Section
   ↓
Academic Level
   ↓
Academic Class
   ↓
Stream
   ↓
Subject Allocation
   ↓
Teaching Group
   ↓
Teacher
   ↓
Student

F05 should make this academic delivery structure visible and manageable through a responsive interface.

2. Important Scope Rule

F05 implements the academic operations frontend only.

Do NOT implement:

assessment entry;

exams;

grading;

ranking;

analytics dashboards;

report cards;

transcripts;

progression;

attendance;

timetable;

notifications;

PWA offline synchronization.

Those belong to other milestones.

3. Read the Repository First

Before writing code:

Read F01–F05 completely.

Inspect the actual current frontend.

Inspect the actual M10 backend module.

Inspect M10 DTOs.

Inspect M10 controllers.

Inspect M10 services.

Inspect M10 API response shapes.

Inspect academic structure models.

Inspect student enrollment models.

Inspect subject/subject-offering models.

Inspect teacher/teaching-assignment models.

Inspect teaching-group implementation.

Inspect existing permissions.

Inspect existing frontend API client.

Inspect current route/layout patterns.

Inspect existing tests.

The repository is authoritative.

Do not invent API contracts.

4. Functional Areas

F05 should provide frontend experiences for:

Academic Structure

Academic Years

Academic Periods/Terms where already supported

Education Sections

Academic Levels

Academic Classes

Streams

Subject Operations

Subjects

Subject offerings/allocations

Class/stream subject allocation

Teaching Operations

Teaching assignments

Teaching groups

Teacher-to-subject-to-class relationships

Student Academic Context

Student academic enrollment view

Student subject enrollment view

Academic-context student lists

Implement only operations actually exposed by M10.

5. Academic Year UI

Create a usable academic-year management/list experience.

Support where the backend permits:

list academic years;

search/filter;

view status;

identify active/current year;

create/edit only when authorized;

activate/deactivate only where supported.

Do not create frontend-only year states.

If the backend has lifecycle rules, reflect them.

6. Academic Period / Term UI

If M10 exposes academic periods/terms, provide a lightweight interface.

Conceptually:

Academic Year
   ├── Period 1
   ├── Period 2
   └── Period N

Do not hard-code Term 1/2/3 unless those are actual configured records.

7. Education Section & Academic Level

Provide views for:

Education Section
       ↓
Academic Level

Examples may include Primary or Secondary, but these are data records.

Do not hard-code Uganda sections.

Allow authorized management only if M10 supports it.

8. Academic Classes

Create a class management experience.

Example:

S3
├── S3A
├── S3B
└── S3C

Support according to backend capabilities:

list;

search;

filter;

view details;

view streams;

create;

edit;

deactivate/archive.

Do not hard-code S1–S6 or P1–P7.

9. Streams

A class detail should display its streams.

Example:

S3
 ├── S3A
 ├── S3B
 └── S3C

Support where the API permits:

stream list;

student count;

class relationship;

create/edit;

activate/deactivate.

Backend validation remains authoritative.

10. Academic Structure Navigation

Create clear navigation:

Academic Year
  ↓
Education Section
  ↓
Academic Level
  ↓
Class
  ↓
Stream

Use breadcrumbs and drill-down pages where useful.

Prefer clear page navigation for complex management rather than excessive nested modals.

11. Class Detail Workspace

A class detail page should eventually provide:

Overview
Streams
Subjects
Teaching Groups
Students

Only implement tabs/sections whose underlying M10 APIs exist.

The page should clearly identify:

Academic Year
Education Section
Academic Level
Class

12. Subject Management UI

Connect the frontend to the existing subject API.

Support where available:

subject list;

search;

category;

status;

code;

name;

details.

Do not create a second subject system.

13. Subject Allocation

This is a major F05 workflow.

A school should be able to see:

S3A
 ├── Mathematics
 ├── English
 ├── Biology
 └── Chemistry

Support:

list allocated subjects;

allocate subject;

deactivate/remove where supported;

filter by academic year;

filter by class;

filter by stream;

filter by subject.

Do not hard-code PCM, PCB, HEG or any combination.

14. Subject Offering Integration

If M10 uses SubjectOffering, distinguish:

Subject

from:

Subject Offering / Availability

The UI should express the business meaning rather than expose database internals.

Example:

Subject: Mathematics
Offered in: S3
Assigned to: S3A, S3B

15. Teaching Assignments

Implement:

Teacher
   ↓
Subject
   ↓
Academic Year
   ↓
Class / Stream

Example:

Mr. John
Mathematics
2026
S3A

Support:

list;

teacher filter;

subject filter;

class filter;

stream filter;

academic-year filter;

create/update/deactivate where permitted.

Backend capability validation remains authoritative.

16. Teaching Groups

Represent:

S3A Mathematics
        │
        ├── Teacher(s)
        └── Student(s)

Support where the API permits:

list;

detail;

teachers;

students;

create/update;

deactivate/archive.

Do not build attendance, timetable or assessment screens inside teaching groups.

17. Student Academic Context

Provide a way to view a student's academic context:

Student
   ↓
2026
   ↓
Secondary
   ↓
S3
   ↓
S3A
   ↓
Subjects

Display where available:

academic year;

class;

stream;

enrolled subjects;

teaching groups.

Do not build full student management.

18. Student Subject Enrollment

If M10 exposes student-subject enrollment, provide UI to:

view subjects;

enroll student;

remove/deactivate enrollment;

show status.

Do not assume all students take all subjects.

19. Subject Combination UI

If M10 exposes combinations, show them simply:

PCM
├── Mathematics
├── Physics
└── Chemistry

Treat combinations as configurable data.

Do not create special UI logic for particular Ugandan combinations.

20. Search and Filtering

Provide reusable filters for:

Academic Year
Education Section
Academic Level
Class
Stream
Subject
Teacher
Student
Status

Use server-side search/pagination for large datasets when supported.

Do not load huge datasets into dropdowns.

21. Tables and Mobile Views

Desktop may use tables.

Example:

Class | Level | Section | Streams | Students | Status

Mobile must not force a wide table.

Use:

Desktop → Table
Mobile → Card/List/Detail

Reuse F01/F03 data components.

22. Forms

Use F01 form primitives.

Forms must:

validate for usability;

display backend validation errors;

disable submit while saving;

prevent duplicate submission;

show success/failure feedback;

work on mobile;

preserve input when safe.

Backend validation remains authoritative.

23. Dangerous Operations

Operations such as:

deactivate class;

deactivate stream;

remove subject allocation;

deactivate teaching assignment;

remove student subject enrollment;

should use confirmation when consequences are meaningful.

Do not create hard deletes when the backend uses lifecycle/status records.

24. Permissions

Use F02/F04 permission infrastructure.

Possible concepts may include:

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

These are examples only.

Use the real backend permission keys.

25. Role Experiences

Use F04 persona composition.

Administrator

Show authorized management workflows.

Academic Administrator

Prioritize:

Academic Structure
Subjects
Teaching
Student Academic Context

Teacher

Prioritize:

My Teaching Groups
My Subjects
My Classes
Student Academic Context

A teacher must not automatically receive administrative CRUD.

Student

Only their own academic context where backend permissions allow.

Guardian

Only authorized child academic information if the backend supports it.

26. No Academic Dashboard

Do not create a full academic analytics dashboard in F05.

A simple factual overview is acceptable.

M22 owns analytics.

27. Responsive Behavior

All F05 pages must work at:

360px
390px
768px
1024px
1440px

Mobile expectations:

searchable lists;

stacked forms;

touch-friendly controls;

compact filters;

drawers for detail;

cards instead of wide tables;

sticky save actions where useful.

Do not create separate mobile business logic.

28. Loading, Empty and Error States

Use F01 reusable states.

Examples:

No academic classes found
No streams configured
No subjects allocated
No teaching assignments
No teaching groups
No subjects enrolled

API pages must have:

loading skeletons;

inline action loading;

error state;

retry where appropriate;

backend validation display.

Do not expose raw stack traces.

29. API Integration

Use the F01/F02 typed API client.

Do not create raw fetch calls throughout pages.

Prefer:

API client
   ↓
feature API functions/hooks
   ↓
components/pages

Keep presentation separate from API logic.

30. Suggested Frontend Structure

Adapt to the actual repository:

features/
└── academic/
    ├── api/
    ├── components/
    ├── hooks/
    ├── types/
    └── utils/

Possible routes:

app/
├── academic/
│   ├── years/
│   ├── sections/
│   ├── levels/
│   ├── classes/
│   ├── subjects/
│   ├── teaching-groups/
│   └── assignments/
└── ...

Do not create routes whose underlying APIs do not exist.

31. Testing Requirements

Test:

Academic Years

list;

create/edit where allowed;

filtering;

authorization.

Classes

list;

detail;

create/edit;

streams;

school isolation.

Streams

list;

create/edit;

correct class relationship.

Subjects

list;

search;

status;

authorization.

Subject Allocation

list;

create;

deactivate;

duplicate/error handling.

Teaching Assignment

list;

create/update;

filters;

unauthorized context rejection.

Teaching Groups

list;

detail;

teachers;

students;

authorization.

Student Subject Enrollment

list;

enroll;

deactivate;

duplicate handling.

Permissions

unauthorized actions hidden;

direct route still blocked by backend.

Responsive UI

Use existing browser/e2e capabilities if available.

32. Build Verification

Run:

frontend lint
frontend type-check
frontend tests
frontend production build

Run relevant backend regression tests if contracts were affected.

Do not disable checks.

33. No Backend Scope Creep

F05 should normally modify frontend code only.

Do NOT modify:

Prisma;

M10 services;

M12;

M22;

backend permissions;

backend business rules.

If a real API gap is discovered:

document the exact gap;

verify whether an existing API solves it;

do not build an insecure workaround;

report it for backend planning.

34. No Future Feature Scope Creep

Do NOT implement:

attendance;

exams;

grading;

ranking UI;

analytics dashboards;

report cards;

transcripts;

progression;

timetable;

notifications;

PWA/offline synchronization.

F05 is the frontend implementation of M10 academic operations.

35. Recommended Implementation Order

Step 1

Inspect M10 API and F01–F04.

Step 2

Build academic routes/navigation.

Step 3

Academic year/period views.

Step 4

Education section/level views.

Step 5

Class and stream management.

Step 6

Subject list and allocation.

Step 7

Teaching assignments.

Step 8

Teaching groups.

Step 9

Student academic context.

Step 10

Student subject enrollment.

Step 11

Responsive/accessibility pass.

Step 12

Tests and production build.

If the coding model struggles with the total workload, split the implementation internally and commit after each stable section.

36. Definition of Done

F05 is complete when:

authorized users can navigate the academic structure;

academic years/periods can be viewed and managed where supported;

education sections and academic levels are accessible;

classes and streams are usable;

subjects are visible;

subject allocations are usable;

teaching assignments are usable;

teaching groups are usable;

student academic context is visible;

student subject enrollment is usable where supported;

permissions control available actions;

school isolation is respected;

forms validate correctly;

tables/lists work responsively;

mobile layouts are usable;

loading/error/empty states are consistent;

API integration uses the typed client;

tests pass;

lint passes;

type-check passes;

production build passes;

backend was not unnecessarily modified;

M11/M12/M13/M16/M21/M22/M24 functionality was not implemented here.

37. Required OpenCode/Laguna Workflow

Before coding:

Read F01, F02, F03, F04 and F05 completely.

Inspect the real frontend.

Inspect the real M10 backend/API.

Map every required screen to an actual API capability.

Identify missing API capabilities.

Produce a concise implementation plan.

Do not invent APIs or models.

During implementation:

Implement incrementally.

Reuse F01–F04 components and state.

Keep API logic separate from presentation.

Use real backend permission keys.

Test after each major section.

Run lint/type-check/build.

Review git diff for scope creep.

Do not try to complete every F05 screen in one massive change if the coding model is likely to lose context.

38. Final Report Required

Report:

actual M10 API contracts discovered;

frontend routes created;

academic screens created;

API client functions/hooks created;

permission integration;

school-context behavior;

responsive behavior;

files created;

files modified;

dependencies added/removed;

tests and results;

lint result;

type-check result;

production build result;

known API gaps;

known limitations;

confirmation no backend was unnecessarily modified;

confirmation no future milestone was implemented.

Final Principle

F05 is where the frontend starts operating the actual academic engine created by M10.

The final relationship should be:

F01
Frontend Foundation
      ↓
F02
Authentication + School Context + Permissions
      ↓
F03
Application Shell
      ↓
F04
Role-Based Experiences
      ↓
F05
Academic Operations
      ↓
Existing M10 Backend

The user should be able to move from:

School
  ↓
Academic Year
  ↓
Class
  ↓
Stream
  ↓
Subject
  ↓
Teaching Group
  ↓
Teacher
  ↓
Student

through a coherent, responsive interface.

Build the frontend on top of the real M10 domain. Do not recreate academic logic in the browser.