# M13 — Report Cards, Academic Records & Progression Foundation

## OpenCode Implementation Specification

**Project:** School ERP  
**Milestone:** M13  
**Target:** Uganda-context school ERP, configurable for different schools/curricula  
**Implementation:** Backend/domain/database/API/tests only  
**Frontend:** NOT in scope

---

## 1. Mission

Implement the foundation for **official academic reporting and academic records**.

M13 sits after M12 Assessment/Examinations/Grading and M22 Analytics:

```text
M10 Academic Operations
        ↓
M12 Assessment / Results / Grading / Ranking
        ↓
M22 Analytics
        ↓
M13 Report Cards / Academic Records / Transcripts / Progression
```

M12 answers: **What did the learner achieve?**

M22 answers: **What does the learner's performance show?**

M13 answers: **How do we officially record, present and act on that academic performance?**

---

## 2. READ THE REPOSITORY BEFORE CODING

The repository is the source of truth.

Inspect the actual implementation of:

- M09 Identity/Authorization
- M10 Academic Operations
- M12 Assessment, Examinations, Grading and Ranking
- M22 Analytics as currently implemented
- Prisma schema and migrations
- Student, Enrollment, AcademicYear, Term/period, AcademicClass, Stream, Subject
- LearnerResult and its lifecycle
- DTO/controller/service/repository conventions
- authorization and permission patterns
- existing tests and fixtures

Do not assume a model or service exists because documentation says it exists.

---

## 3. M13 Responsibilities

M13 should provide:

1. Academic record foundation
2. Report card generation/read model
3. Report card snapshots/versioning
4. Configurable report sections
5. Teacher/class/head-teacher comments
6. Academic-period reports
7. Annual academic summaries
8. Transcript foundation
9. Progression policy foundation
10. Progression evaluation/recommendation
11. Progression decision
12. Completion record foundation
13. Historical/auditable academic records

If the agent's capacity is limited, implement these in small phases rather than one huge change.

---

## 4. Critical Architecture Rule

M13 must NOT become a second M12 or M22.

M12 remains responsible for:

- assessment calculations
- score calculation
- grading
- grade boundaries
- ranking
- assessment weighting
- examination calculations

M22 remains responsible for:

- derived academic analytics
- performance trends
- comparative analytics
- academic summaries

M13 consumes those results. It does not duplicate their engines.

---

# 5. Academic Record

Introduce a durable academic-record concept where genuinely required.

Conceptually:

```text
Student
  ↓
AcademicRecord
  ├── Academic periods
  ├── Final results
  ├── Report cards
  ├── Progression decisions
  └── Completion records
```

Reuse existing Student/Enrollment/AcademicYear/Term/Class/Stream/LearnerResult relationships.

Avoid duplicating enrollment information.

---

# 6. Academic Context

Every report/record must have a clear context, where applicable:

```text
School
Academic Year
Academic Period
Education Section
Academic Level
Class
Stream
Student
```

Do not hard-code:

```text
S1, S2, S3, P7
Term 1, Term 2, Term 3
PCM, PCB, HEG
```

The system must work from configured academic structures.

---

# 7. Report Card

A report card represents the learner's official academic report for a specific academic context.

It may contain:

### Learner information

- student identity
- admission/identifier from the existing model
- academic year
- academic period
- education section
- academic level
- class
- stream

### Academic results

For each reported subject:

- subject
- score where applicable
- grade where applicable
- achievement level where applicable
- descriptor where applicable
- ranking/position only if enabled and supplied by M12
- M22 performance indicators where appropriate

Do not assume every curriculum uses numeric marks.

---

# 8. M12 Is the Source of Truth

The relationship must remain:

```text
M12 LearnerResult
       ↓
M13 Report Card
```

If M12 says:

```text
Mathematics
Score: 76
Grade: B
```

M13 displays/records that result.

M13 must not independently decide that 76 = B.

---

# 9. Report Snapshot / Historical Integrity

Once a report is generated or issued, later changes to grading configuration, analytics, enrollment or templates must not silently rewrite the historical report.

Use a snapshot/version concept:

```text
M12 Final Results
      ↓
Report Generation
      ↓
Report Snapshot
      ↓
Approval
      ↓
Issue
```

Issued academic content should remain historically accurate.

---

# 10. Report Lifecycle

Use a simple lifecycle consistent with repository conventions. Conceptually:

```text
DRAFT
GENERATED
APPROVED
ISSUED
AMENDED
```

Issued reports must not be silently edited.

An amendment should preserve:

- previous version
- new version
- reason
- actor
- timestamp

---

# 11. Configurable Report Templates

Do not hard-code one report format.

Conceptually:

```text
ReportTemplate
      ↓
ReportTemplateVersion
      ↓
ReportCard
```

Possible sections:

```text
Academic Performance
Performance Summary
Teacher Comment
Class Teacher Comment
Head Teacher Comment
Conduct
Co-curricular
Custom
```

Do not build a generic CMS. Keep core academic data explicit.

Attendance may eventually appear on a report, but attendance management is M11 and is **not part of M13**.

---

# 12. Comments

Support configurable:

- Subject Teacher Comment
- Class Teacher Comment
- Head Teacher Comment

Comments must belong to the correct report/version and remain historically preserved after issue.

Do not use AI to generate official academic comments in M13.

---

# 13. M22 Analytics Integration

M13 may consume report-ready analytics from M22:

```text
M12 Results
      ↓
M22 Student Analytics
      ↓
M13 Report Card
```

Possible indicators:

- performance trend
- strengths
- attention areas
- period comparison
- achievement summary

Do not rebuild M22 calculations inside M13.

---

# 14. Annual Report

Support an annual academic summary:

```text
Academic Year
 ├── Period 1
 ├── Period 2
 ├── Period N
 └── Annual Summary
```

Do not assume exactly three periods.

Annual calculations must follow the configured M12/result rules. Do not invent a new grading formula in M13.

---

# 15. Transcript

A report card describes a period.

A transcript describes academic history.

Conceptually:

```text
Student
  ↓
Academic History
  ↓
Transcript
```

A transcript may contain:

- academic years
- academic levels/classes
- subjects
- finalized results
- grades
- achievement levels
- completion status
- progression history where appropriate

Initial scope should focus on the current school's academic history.

Do not implement national learner-ID or UNEB integration.

---

# 16. Transcript Versioning

Issued transcripts must be historical records.

Conceptual lifecycle:

```text
DRAFT
GENERATED
ISSUED
REVOKED
```

If a transcript is reissued, preserve its previous version according to the repository's audit/versioning conventions.

---

# 17. Progression

M13 provides the progression foundation.

Example:

```text
Current Academic Level/Class
        ↓
Progression Evaluation
        ↓
Recommendation
        ↓
Authorized Decision
        ↓
Next Academic Level/Class
```

Do not hard-code class transitions.

---

# 18. Progression Policies

Policies must be configurable.

Conceptually:

```text
ProgressionPolicy
      ↓
ProgressionPolicyVersion
      ↓
ProgressionRules
```

Potential rules:

- minimum overall result
- minimum grade
- minimum number of successful subjects
- required subjects
- completion requirements
- other school-configured criteria

Do not encode Uganda policy as hard-coded TypeScript conditions.

---

# 19. Recommendation vs Final Decision

Separate automatic evaluation from the final administrative decision.

Example:

```text
System recommendation: REPEAT
             ↓
Authorized administrator
             ↓
Final decision: PROMOTED
             ↓
Required reason
```

Record:

- recommendation
- final decision
- reason
- actor
- timestamp

Never silently overwrite the original recommendation.

---

# 20. Progression Statuses

Possible configurable statuses include:

```text
PROMOTED
CONDITIONAL
REPEAT
WITHHELD
COMPLETED
TRANSFERRED
```

Do not assume every school uses every status.

---

# 21. Progression History

Preserve:

```text
Academic Year
From Level/Class/Stream
To Level/Class/Stream
Recommendation
Final Decision
Decision Maker
Decision Date
Reason
```

Do not simply update a student's current class and lose the decision history.

---

# 22. Placement

M13 may record:

```text
Next Academic Year
Next Academic Level
Next Class
Next Stream
```

but do NOT build automatic stream balancing or sophisticated placement optimization.

---

# 23. Completion

Distinguish:

```text
PROMOTED
```

from:

```text
COMPLETED
```

Promotion means moving to the next level.

Completion means completing the relevant academic stage.

Create a durable completion record where appropriate.

---

# 24. Uganda Context

Support Ugandan schools, but remain configurable.

Do NOT hard-code:

- UNEB grades
- S1-S6
- P1-P7
- PCM/PCB/HEG
- national promotion thresholds
- national ranking rules

Uganda-specific configuration can be seeded/configured separately.

Where NCDC/UNEB-style reporting requires grades, achievement descriptors or similar information, consume the corresponding M12 structures.

Do not pretend M13 itself is a UNEB system.

---

# 25. Security

Reuse the existing:

- AuthGuard
- PermissionGuard
- CurrentUser
- PermissionService
- active school context

Every M13 operation must enforce school/tenant isolation.

School A must never access School B:

- reports
- transcripts
- progression decisions
- academic records

Teachers must only access records they are authorized to manage.

Do not create a second authorization system.

---

# 26. Auditability

Where the existing architecture supports audit history, record:

- who generated a report
- who approved it
- who issued it
- who amended it
- amendment reason
- who made progression decisions
- decision timestamps

Never silently mutate issued academic records.

---

# 27. Database Rules

Before adding models:

1. Inspect the existing Prisma schema.
2. Reuse existing relationships.
3. Avoid duplicate data.
4. Add only genuinely required M13 models.
5. Add appropriate unique constraints.
6. Add indexes based on real query patterns.
7. Preserve school isolation.
8. Use transactions where report issue/amendment requires atomicity.

Do not modify M12 models merely for convenience.

If a schema change is genuinely necessary, explain why.

---

# 28. API Rules

Follow existing API conventions.

Possible conceptual routes:

```text
GET    /api/v1/reports
GET    /api/v1/reports/:id
POST   /api/v1/reports/generate
POST   /api/v1/reports/:id/approve
POST   /api/v1/reports/:id/issue
POST   /api/v1/reports/:id/amend

GET    /api/v1/transcripts/:studentId
POST   /api/v1/transcripts/generate

GET    /api/v1/progression
POST   /api/v1/progression/evaluate
POST   /api/v1/progression/:id/decide
```

These are conceptual. Inspect the existing API style before choosing exact routes.

Do not create unnecessary endpoints.

---

# 29. Missing Results

Never automatically treat missing data as zero.

Respect the actual M12 result states, such as where supported:

```text
NO_RESULT
ABSENT
NOT_ASSESSED
WITHHELD
EXEMPT
FINALIZED
```

Use the real M12 semantics. Do not invent conflicting meanings.

---

# 30. Testing

Add tests for:

### Reports
- correct academic context
- correct student
- correct finalized M12 results
- correct M22 analytics consumption
- missing results
- non-numeric results
- multiple subjects

### Authorization
- authorized administrator
- unauthorized user
- teacher access
- cross-school rejection

### Snapshots
- issued report remains unchanged
- amendment creates history
- old version remains auditable

### Comments
- subject teacher
- class teacher
- head teacher
- optional sections

### Transcripts
- multiple years
- multiple periods
- academic history
- versioning
- issue/revoke lifecycle

### Progression
- eligible recommendation
- ineligible recommendation
- configurable rules
- manual override
- required reason
- decision history

### Security
Attempt cross-school access to reports, transcripts and progression records and verify rejection.

---

# 31. Regression Testing

After each implementation phase run:

```text
M09 tests
M10 tests
M12 tests
M22 tests
M13 tests
```

Do not accept M13 if existing functionality is broken.

---

# 32. Frontend Is NOT in Scope

Do NOT implement:

- Next.js pages
- report-card UI
- dashboards
- mobile screens
- PWA
- PDF visual rendering

M13 is backend/domain/API/database/testing only.

PDF/export rendering can be added later after the domain model is stable.

---

# 33. Explicitly Out of Scope

Do NOT implement:

- Attendance
- Timetable
- Notifications
- PWA
- Dashboards
- Financial reporting
- National UNEB integration
- AI-generated comments
- Automatic stream balancing
- Payroll
- Discipline management
- Full document management

---

# 34. Recommended M13 Internal Phases

If the coding model is limited, implement M13 in these small phases:

### M13-P1 — Academic Record Foundation
Core academic-record/report context.

### M13-P2 — Report Card Read Model
Consume finalized M12 results.

### M13-P3 — Report Snapshots & Lifecycle
Generation, approval, issue, amendment/version history.

### M13-P4 — Report Templates & Comments
Configurable sections and comments.

### M13-P5 — M22 Performance Integration
Consume stable report-ready analytics.

### M13-P6 — Transcript
Academic-history and transcript foundation.

### M13-P7 — Progression
Policy, evaluation, recommendation and decision history.

### M13-P8 — Completion & Hardening
Completion records, security, integrity, performance and regression testing.

Do not force all eight phases into one coding task.

---

# 35. Definition of Done

M13 is complete when:

- finalized M12 results can become official report-card records
- report cards preserve historical snapshots
- report lifecycle is controlled
- comments are supported
- M22 analytics can be consumed
- academic history can produce transcripts
- configurable progression rules can evaluate learners
- administrators can make auditable progression decisions
- completion can be recorded
- school isolation is enforced
- existing authorization is reused
- M12 calculation logic is not duplicated
- M22 analytics logic is not duplicated
- major domain/security cases are tested
- all existing regression tests pass
- no frontend is implemented
- no future milestone is pulled into M13

---

# 36. OpenCode Workflow

Before coding:

1. Read this document completely.
2. Inspect the entire repository.
3. Inspect M10, M12 and implemented M22.
4. Verify actual database relationships.
5. Identify reusable services.
6. Produce an implementation plan.
7. Implement only the requested M13 phase.
8. Run tests.
9. Run the API build.
10. Review git diff for scope creep.

Never fix build failures by disabling TypeScript checks or weakening tests.

Never rewrite working modules without evidence.

---

# 37. Required Final Report

At completion report:

1. Repository findings
2. Existing architecture reused
3. Files created
4. Files modified
5. Database/schema changes
6. API endpoints
7. Authorization changes
8. Business rules implemented
9. Tests added
10. Tests executed/results
11. Build result
12. Limitations
13. Assumptions
14. Confirmation that no frontend was implemented
15. Confirmation that no future milestone outside this phase was implemented

## Final Architecture

M13 must sit cleanly on top of:

```text
M10 → Academic Context
M12 → Final Academic Results
M22 → Analytics
```

and provide:

```text
M13 → Official Academic Records
      Report Cards
      Transcripts
      Progression
      Completion
```

Do not turn M13 into a second assessment, grading, ranking or analytics system.
