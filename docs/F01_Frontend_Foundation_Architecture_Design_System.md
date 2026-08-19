# F01 — Frontend Foundation, Architecture & Design System

## School ERP Frontend Implementation Specification

**Project:** School ERP  
**Frontend milestone:** F01  
**Target:** Production-oriented responsive PWA frontend for Ugandan schools  
**Implementation:** Frontend foundation only  
**Backend:** Existing backend is the source of truth  
**Current rule:** Do NOT implement feature modules yet.

---

# 1. Mission

Establish the frontend foundation that all future School ERP screens will use.

F01 must create a clean, scalable, responsive frontend architecture for:

- mobile
- tablet
- laptop
- desktop

The frontend must be a single application/codebase that adapts its layout and interaction patterns to the device.

The goal is NOT to build the whole ERP UI.

The goal is to create the foundation that makes future frontend milestones fast, consistent and maintainable.

---

# 2. READ THE REPOSITORY FIRST

Before changing anything:

1. Inspect the entire repository.
2. Inspect the existing `frontend/` directory.
3. Identify the actual frontend framework/version.
4. Inspect package.json files and workspace configuration.
5. Inspect existing routing.
6. Inspect existing styling/Tailwind configuration.
7. Inspect existing components.
8. Inspect existing API/client code.
9. Inspect environment configuration.
10. Inspect any existing authentication code.
11. Inspect existing frontend tests/configuration.
12. Inspect backend API conventions sufficiently to understand how the frontend will consume them.

Do NOT assume the frontend should be rebuilt.

If useful frontend infrastructure already exists, preserve and improve it.

Do not rewrite working code without a demonstrated reason.

---

# 3. Current Frontend Scope

F01 ONLY establishes:

- frontend architecture
- application structure
- routing foundation
- styling foundation
- design tokens
- reusable UI primitives
- responsive layout system
- application shell foundation
- loading/error/empty states
- API client foundation
- environment configuration
- frontend testing foundation
- accessibility foundation

Do NOT implement:

- student management
- teacher management
- assessment pages
- analytics dashboards
- report cards
- transcripts
- progression
- attendance
- timetable
- notifications

Those belong to later frontend milestones.

---

# 4. Technology Rules

Inspect the existing frontend before choosing technologies.

Prefer the existing stack if it is already appropriate.

Do not introduce a second frontend framework.

Do not add large dependencies merely for convenience.

If the project already uses:

- Next.js
- TypeScript
- Tailwind CSS
- App Router

continue using them unless there is a concrete repository-based reason not to.

Use strict TypeScript.

Avoid `any`.

Keep the architecture simple.

---

# 5. Frontend Architecture

Establish a clear separation between:

```text
frontend/
├── app/                 # routes/pages
├── components/          # reusable UI
│   ├── ui/
│   ├── layout/
│   └── feedback/
├── features/            # future domain features
├── lib/                 # utilities/infrastructure
├── hooks/               # reusable hooks
├── types/               # shared frontend types
├── config/              # frontend configuration
└── tests/               # frontend tests
```

Adapt this structure to the actual framework/project instead of blindly forcing it.

Feature code should eventually be isolated.

For example:

```text
features/
├── students/
├── academics/
├── assessments/
├── analytics/
├── reports/
└── progression/
```

Do not create empty feature implementations unnecessarily.

---

# 6. Design System

Create a small consistent design system.

At minimum establish reusable:

### Inputs

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Combobox

### Feedback

- Alert
- Toast
- Badge
- Spinner
- Skeleton
- EmptyState
- ErrorState

### Containers

- Card
- Modal/Dialog
- Drawer
- Dropdown
- Tabs
- Accordion

### Data

- Table
- Pagination
- DataTable foundation
- StatCard

### Navigation

- Sidebar foundation
- Header
- Breadcrumb
- Mobile navigation foundation
- PageHeader

Do not build highly specialized ERP components yet.

---

# 7. Design Tokens

Establish centralized design tokens for:

- typography
- spacing
- border radius
- shadows
- breakpoints
- layout widths
- z-index layers
- transitions
- form sizes

Avoid arbitrary values scattered throughout the application.

The system should feel visually consistent.

Do not hard-code colors in dozens of components.

Use semantic tokens such as:

```text
background
foreground
muted
primary
secondary
success
warning
danger
border
card
```

The exact visual palette should follow the existing project if one already exists.

---

# 8. Responsive Strategy

This is a major requirement.

Do NOT simply shrink desktop screens for mobile.

The application should adapt its interaction model.

## Desktop

Use:

```text
Sidebar
+
Top Header
+
Main Content
```

## Tablet

Use:

```text
Collapsible Sidebar
+
Header
+
Main Content
```

## Mobile

Use:

```text
Compact Header
+
Main Content
+
Mobile Navigation / Bottom Navigation where appropriate
```

The same route should remain usable across devices.

---

# 9. Mobile-First Rules

Design mobile-first.

Minimum requirements:

- touch-friendly controls
- sufficient tap targets
- no horizontal overflow
- readable typography
- responsive tables
- mobile-friendly forms
- mobile-friendly dialogs
- drawers instead of oversized desktop modals where appropriate
- sticky actions where useful
- efficient navigation

Do not force wide desktop tables onto a 360px screen.

For future data-heavy tables, the design system should support:

```text
Desktop → table
Mobile → cards/condensed rows/detail drawer
```

---

# 10. Alignment and Layout

The UI must maintain predictable alignment across screen sizes.

Establish:

- page max-width
- horizontal page padding
- consistent content spacing
- grid rules
- vertical rhythm
- header height
- navigation dimensions

Avoid per-page arbitrary margins.

Future screens should be able to use a standard pattern such as:

```text
Page
 ├── PageHeader
 │    ├── Title
 │    ├── Description
 │    └── Actions
 │
 └── Content
```

---

# 11. Application Shell Foundation

Create the shell structure but do NOT implement complete feature navigation.

Conceptually:

```text
┌───────────────────────────────────────────┐
│ Logo / School Context     User / Actions │
├──────────────┬────────────────────────────┤
│ Navigation   │                            │
│              │        Main Content        │
│              │                            │
│              │                            │
└──────────────┴────────────────────────────┘
```

On mobile:

```text
┌─────────────────────────┐
│ Header            Menu  │
├─────────────────────────┤
│                         │
│      Main Content       │
│                         │
├─────────────────────────┤
│ Home | ... | More       │
└─────────────────────────┘
```

Use placeholder navigation only where required to demonstrate the shell.

Do not build real module pages.

---

# 12. Page Layout System

Create reusable layout primitives for future screens.

Examples:

```text
AppShell
PageContainer
PageHeader
PageContent
Section
ResponsiveGrid
```

Future pages should not need to reinvent their layout.

---

# 13. Loading States

Every future API-driven screen must have a consistent loading strategy.

Create reusable:

- PageSkeleton
- TableSkeleton
- CardSkeleton
- InlineSpinner

Avoid blank screens while data loads.

Do not overuse spinners when skeletons are more appropriate.

---

# 14. Empty States

Create a reusable EmptyState supporting:

- title
- description
- optional icon
- optional action

Example:

```text
No students found

There are no students matching the current filters.

[Clear filters]
```

Do not create feature-specific empty-state implementations yet.

---

# 15. Error States

Create consistent error handling for:

- API failure
- unauthorized request
- forbidden request
- not found
- validation errors
- unexpected errors
- network failure

Do not expose raw backend stack traces to users.

Provide developer-friendly logging without leaking sensitive information into the UI.

---

# 16. API Client Foundation

Create or standardize a typed API client layer.

It should provide:

- base URL configuration
- request handling
- JSON parsing
- authentication support foundation
- consistent error handling
- request timeout/abort where appropriate
- typed response/error structures

Do not implement every API endpoint yet.

Only create the infrastructure required for future feature modules.

---

# 17. Environment Configuration

Establish safe frontend environment handling.

For example:

```text
NEXT_PUBLIC_API_URL
```

or the equivalent required by the actual framework.

Rules:

- never expose secrets
- never put database credentials in frontend environment variables
- document required variables
- provide a safe development configuration
- fail clearly when required configuration is missing

---

# 18. Authentication Foundation

Do NOT fully implement M09 frontend authentication yet unless existing frontend authentication already exists.

F01 should only establish the infrastructure needed for:

```text
Login
   ↓
Authenticated session/token
   ↓
Current user
   ↓
Active school context
```

If authentication already exists, preserve it and integrate it cleanly.

Do not duplicate backend authentication logic.

The backend remains authoritative.

---

# 19. School Context Foundation

The future frontend must support a user belonging to multiple schools.

Conceptually:

```text
User
 ├── School A
 └── School B

        ↓

Active School
```

F01 should establish the frontend state/context mechanism needed to represent the active school.

Do not implement a complete school-selection workflow unless the existing frontend already has one.

---

# 20. Permission-Aware UI Foundation

The frontend may hide navigation/actions based on permissions for usability.

However:

**Frontend permissions are NOT security.**

The backend remains authoritative.

Create a reusable mechanism such as:

```text
hasPermission("students.read")
```

or equivalent.

Do not hard-code roles like:

```text
if admin
if teacher
```

when the backend exposes permission-based authorization.

---

# 21. Accessibility

Build accessibility into the foundation.

Requirements:

- semantic HTML
- keyboard navigation
- visible focus states
- labels for inputs
- accessible dialogs
- appropriate ARIA only where needed
- sufficient contrast
- screen-reader-friendly controls
- no interaction that requires mouse-only behavior

Do not sacrifice accessibility for visual design.

---

# 22. Performance

The frontend must be fast.

F01 should establish good defaults:

- avoid unnecessary client components
- avoid unnecessary global state
- lazy-load expensive features
- optimize images
- avoid huge dependencies
- minimize unnecessary re-renders
- keep initial JavaScript reasonable
- use server rendering where appropriate for the chosen framework

Do not prematurely optimize every component.

---

# 23. PWA Preparation

Full PWA/offline functionality belongs to a later milestone.

F01 should only avoid architectural decisions that would make PWA implementation difficult later.

Do NOT implement:

- offline database
- service worker synchronization
- offline assessment entry
- sync queues
- conflict resolution

Those belong to the dedicated PWA milestone.

---

# 24. Theme / Appearance

If the existing project supports light/dark mode, preserve it.

If not, create the design system so theme support can be added later without rewriting components.

Do not spend the milestone building a complex theme engine.

---

# 25. Testing

Add a frontend testing foundation.

At minimum test:

- design-system components render
- responsive layout does not throw errors
- buttons/inputs basic behavior
- API client error normalization
- permission helper
- application shell rendering
- loading/empty/error states

Use the existing project's test framework if one exists.

Do not introduce a second testing framework unnecessarily.

---

# 26. Build Verification

At the end:

- run frontend lint
- run frontend type-check
- run frontend tests
- run frontend production build

Fix actual errors.

Do NOT disable lint/type checking to make the build pass.

---

# 27. No Feature Creep

Do NOT implement:

- student CRUD
- teacher CRUD
- classes CRUD
- subject management UI
- assessment entry
- analytics dashboards
- report cards
- transcripts
- progression
- attendance
- timetable
- notifications

Those belong to later milestones.

---

# 28. Recommended Implementation Order

### Step 1 — Repository inspection
Understand the existing frontend.

### Step 2 — Architecture cleanup
Only if the existing structure genuinely needs it.

### Step 3 — Design tokens
Typography, spacing, colors, radius, breakpoints.

### Step 4 — UI primitives
Buttons, inputs, cards, dialogs, tables, feedback.

### Step 5 — Layout primitives
PageContainer, PageHeader, AppShell, responsive grid.

### Step 6 — Responsive shell
Desktop/tablet/mobile behavior.

### Step 7 — API client foundation
Typed requests and error handling.

### Step 8 — Auth/school-context foundation
Only infrastructure, not full feature screens.

### Step 9 — Accessibility/performance pass

### Step 10 — Tests and production build

---

# 29. Definition of Done

F01 is complete when:

- the existing frontend architecture has been understood and preserved where appropriate
- a clean frontend structure exists
- design tokens exist
- reusable UI primitives exist
- responsive layout primitives exist
- application shell foundation exists
- mobile/tablet/desktop layouts work
- no horizontal overflow exists in the foundation screens
- API client foundation exists
- authentication/school-context infrastructure is prepared
- permission-aware UI foundation exists
- loading/error/empty states exist
- accessibility basics are implemented
- frontend tests pass
- type-check passes
- lint passes
- production build passes
- no ERP feature modules have been prematurely implemented

---

# 30. Required OpenCode/Qoder Workflow

Before coding:

1. Read this specification completely.
2. Inspect the entire repository.
3. Inspect `frontend/` carefully.
4. Report the existing frontend architecture.
5. Identify what should be preserved.
6. Identify what genuinely needs to be added or corrected.
7. Produce a concise implementation plan.
8. Wait for approval before making major architectural changes.

When implementation begins:

1. Make the smallest safe changes.
2. Keep the existing backend untouched.
3. Do not modify Prisma/schema/backend code.
4. Do not implement future feature modules.
5. Run tests after meaningful changes.
6. Run type-check/lint/build.
7. Review the final git diff for scope creep.

---

# 31. Final Report Required

At completion report:

- existing frontend architecture discovered
- files created
- files modified
- dependencies added/removed
- design-system components created
- responsive behavior implemented
- API infrastructure created
- authentication/context foundation created
- permission foundation created
- tests added
- test results
- lint result
- type-check result
- production build result
- known limitations
- confirmation that backend/database were not modified
- confirmation that feature modules were not implemented

---

# Final Principle

F01 is the **foundation**, not the ERP itself.

Build the system so that future modules can consistently follow:

```text
Feature
  ↓
Feature Components
  ↓
Reusable UI
  ↓
Design System
  ↓
App Shell
  ↓
Typed API Client
  ↓
Existing NestJS Backend
```

The frontend must feel like **one coherent School ERP**, not a collection of unrelated pages built by different developers.
