# M12 — Assessment, Examinations, Grading & Ranking
## OpenCode Implementation Specification

**Project:** School ERP  
**Milestone:** M12  
**Implementation:** Backend/domain/API/database/tests only  
**Frontend:** NOT in scope

---

## 1. Objective

M12 establishes the School ERP's assessment and results engine.

M10 provides the academic delivery context:

```text
Academic Year
    ↓
Class / Stream
    ↓
Subject / Subject Offering
    ↓
Teaching Group
    ↓
Teacher(s)
    ↓
Student(s)
```

M12 builds:

```text
Teaching Context
      ↓
Assessment
      ↓
Assessment Components / Evidence
      ↓
Scores / Achievement
      ↓
Weighting / Calculation
      ↓
Final Result
      ↓
Grade / Descriptor / Achievement Level
      ↓
Optional Ranking
```

The result must be stable enough for M13 to later build report cards, transcripts and progression.

**Do not implement M13.**

---

## 2. Uganda Context

The ERP targets schools in Uganda, but M12 must not hard-code one grading system.

Uganda currently has different assessment contexts. Lower Secondary is competency-based and criterion-referenced. NCDC's framework emphasizes assessment of competencies, knowledge, skills, values and attitudes rather than simply comparing learners with peers. citeturn0search1turn0search10

UNEB's 2026 materials explicitly reference Continuous Assessment for S.3 and S.4, and 2026 UCE registration requires submitted CA scores for all subjects and project scores for S.3. citeturn0search0turn0search3

UNEB states that S.3 project work is assessed at school level and its achievement level is presented as a standalone component on the certificate. citeturn0search13

The aligned Advanced Secondary curriculum has also shifted toward criterion-referenced assessment. citeturn0search17

NCDC released current Advanced Secondary assessment guidelines in July 2026, including subject-specific guidelines. citeturn0search5turn0search7

Therefore:

> Build one configurable assessment engine rather than separate hard-coded engines for Primary, Lower Secondary and Advanced Secondary.

Uganda-specific schemes should be configuration/data, not business logic.

---

## 3. Critical Design Principle

Do NOT model M12 simply as:

```text
Student → Subject → Exam Mark → Grade
```

Instead:

```text
Assessment Scheme
       ↓
Academic Period
       ↓
Assessment
       ↓
Assessment Components
       ↓
Learner Scores / Evidence
       ↓
Calculation
       ↓
Result
       ↓
Grade / Achievement
       ↓
Optional Ranking
```

Keep **grading** and **ranking** separate.

Grading measures performance against criteria.

Ranking orders learners relative to one another.

---

# 4. Scope

M12 includes:

- assessment schemes;
- scheme versions;
- academic assessment periods;
- formative assessment;
- summative assessment;
- continuous assessment;
- projects;
- practical/performance assessment;
- evidence-oriented assessment;
- examinations;
- examination papers/components;
- raw scores;
- normalized scores;
- weighted calculation;
- final subject results;
- grading schemes;
- grade boundaries;
- grade descriptors;
- achievement levels;
- result submission;
- result approval;
- result locking;
- controlled result amendments;
- result history/audit;
- optional ranking;
- ranking policies;
- class/stream ranking;
- result aggregation needed for M13;
- APIs;
- authorization;
- automated tests.

M12 does NOT include:

- attendance;
- report cards;
- transcripts;
- progression decisions;
- timetable;
- notifications;
- dashboards;
- PWA;
- frontend.

---

# 5. Repository Is the Source of Truth

Before coding:

1. Read this document completely.
2. Inspect the repository.
3. Inspect the actual M10 implementation.
4. Inspect Prisma schema and migrations.
5. Inspect academic years/classes/streams.
6. Inspect students/enrollments.
7. Inspect subjects/offerings/combinations.
8. Inspect teaching groups/assignments.
9. Inspect Identity/Authorization.
10. Inspect existing DTO/service/controller patterns.
11. Inspect existing tests.

Reuse existing models and conventions.

Do not create duplicate entities.

---

# 6. Core Domain

The conceptual model should be approximately:

```text
Academic Year
      ↓
Academic Period
      ↓
Assessment Scheme
      ↓
Assessment
      ↓
Assessment Components
      ↓
Learner Scores / Evidence
      ↓
Calculation
      ↓
Subject Result
      ↓
Grade / Descriptor / Achievement
```

And:

```text
Examination
    ↓
Examination Session
    ↓
Examination Paper
    ↓
Assessment / Result
```

And:

```text
Subject Results
      ↓
Ranking Policy
      ↓
Optional Ranking
```

These are conceptual relationships. Use actual repository naming and reuse existing concepts.

---

# 7. Assessment Scheme

An Assessment Scheme defines how a context is assessed.

Examples:

```text
Lower Secondary CBC
Primary School Assessment
School Term Assessment
Advanced Secondary Chemistry
```

A scheme may define:

- assessment components;
- weights;
- maximum scores;
- calculation rules;
- grading scheme;
- achievement descriptors;
- ranking policy where applicable.

Potential metadata:

```text
name
code
description
scope/context
version
status
```

Do not hard-code schemes in services.

---

# 8. Scheme Versioning

Assessment rules can change.

Use versioning or immutable scheme versions.

Example:

```text
Lower Secondary CBC
  Version 1 → 2025
  Version 2 → 2026
```

Once a version is used by finalized results, changing the current configuration must not silently alter historical results.

Prefer a simple model such as:

```text
AssessmentScheme
    ↓
AssessmentSchemeVersion
```

if consistent with the existing architecture.

---

# 9. Academic Assessment Period

Support configurable periods such as:

```text
Term 1
Term 2
Term 3
Semester 1
Semester 2
End of Year
```

Do not hard-code terms.

If an equivalent academic-period model already exists, reuse it.

An assessment period must belong to the correct academic year and school context.

---

# 10. Assessment

An Assessment represents an actual assessment activity/event.

Examples:

```text
Mathematics Test 1
English Project
Biology Practical
Term 1 Examination
Physics Coursework
S3 Integrated Project
```

Potential properties:

```text
name
code
type
academic period
teaching group
subject
scheme version
date
maximum score
status
```

The exact model must follow the repository.

Every assessment must resolve to a valid M10 academic context.

---

# 11. Assessment Types

The model should support concepts such as:

```text
FORMATIVE
SUMMATIVE
CONTINUOUS_ASSESSMENT
EXAMINATION
PROJECT
PRACTICAL
PERFORMANCE
COURSEWORK
OBSERVATION
COMPETENCY
OTHER
```

Do not create an unnecessarily huge enum.

Use database-driven configuration where that better fits the existing architecture.

The important thing is to distinguish assessment purpose and calculation behavior.

---

# 12. Assessment Components

An assessment can contain multiple components.

Examples:

```text
Term 1 Mathematics
├── Test 1
├── Test 2
├── Coursework
└── Examination
```

or:

```text
Chemistry Practical
├── Procedure
├── Observation
├── Analysis
└── Conclusion
```

or:

```text
Competency Assessment
├── Knowledge
├── Skill
├── Application
└── Attitude/Value
```

Do not force every assessment to use components.

---

# 13. Weighting

Support configurable weighting.

Example:

```text
Test 1       20%
Test 2       20%
Coursework   10%
Examination  50%
Total       100%
```

Another scheme may use a different weighting.

Weights must be configuration.

Validate that a scheme's weights are internally consistent.

Do not allow finalized results to change because someone edits the current scheme.

---

# 14. Score Model

Distinguish:

### Raw score

```text
42 / 50
```

### Maximum score

```text
50
```

### Normalized percentage

```text
84%
```

### Weighted contribution

For a 20% component:

```text
84 × 0.20 = 16.8
```

Do not store only the final score if the underlying assessment evidence can be retained.

The system should be able to explain how a result was produced.

---

# 15. Rounding

Rounding must be explicit.

Define:

- precision;
- rounding mode;
- stage at which rounding occurs.

Do not rely on JavaScript floating-point behavior.

Prefer suitable decimal/numeric handling.

Calculate with adequate precision and round only at the defined output boundary.

---

# 16. Grading Scheme

A Grading Scheme maps a calculated result to a grade/achievement.

Example:

```text
90–100 → A*
80–89  → A
70–79  → B
60–69  → C
50–59  → D
40–49  → E
30–39  → F
<30    → G
```

This is an example configuration, not a universal rule.

A grading scheme should contain:

```text
name
code
version
status
grading entries
```

Each grading entry may contain:

```text
minimum
maximum
grade
descriptor
achievementLevel
displayOrder
```

Validate boundaries and prevent invalid overlaps.

---

# 17. Criterion-Referenced Assessment

Support criterion-referenced results.

A learner's achievement should not require comparison against peers.

Conceptually:

```text
Learner Performance
      ↓
Defined Criterion
      ↓
Achievement Level
```

Keep this independent from ranking.

---

# 18. Achievement Levels and Descriptors

Some assessment contexts may use achievement levels instead of traditional grades.

The result model should support configurable values such as:

```text
Exceptional
Outstanding
Satisfactory
Basic
Below Expected
```

These are examples only.

Do not hard-code these labels.

A result may contain:

```text
numeric score
grade
descriptor
achievement level
```

but not all fields must be required for every assessment scheme.

---

# 19. Evidence-Oriented Assessment

Competency-based assessment may involve:

- observation;
- practical performance;
- project;
- product;
- presentation;
- task completion;
- conversation;
- written work.

M12 should represent assessment evidence simply.

A possible conceptual structure:

```text
AssessmentEvidence
    assessment
    learner
    evidenceType
    score/level
    comment
    recordedBy
    recordedAt
```

Only introduce a separate evidence entity if it is genuinely needed after inspecting the existing domain.

Do not build a full digital portfolio/LMS.

---

# 20. Continuous Assessment

Continuous Assessment must be first-class.

UNEB's current 2026 requirements explicitly reference CA scores for S.3 and S.4. citeturn0search3

Support:

```text
Continuous Assessment
    ↓
Assessment Activities
    ↓
Learner Evidence/Scores
    ↓
CA Result
```

The calculation must be scheme-driven.

Do not assume one universal CA formula.

---

# 21. Project Assessment

Support project assessment as a distinct assessment type.

UNEB states that Lower Secondary project work is assessed at school level and its achievement level is presented as a standalone component on the certificate. citeturn0search13

Therefore do not force project assessment into an ordinary examination-mark model.

Conceptually:

```text
Project
    ↓
Learner
    ↓
Score / Achievement
    ↓
Project Result
```

The scheme determines whether it contributes to a final result or remains standalone.

Do not hard-code S.3-specific logic into application services.

---

# 22. Examination Model

Support school examinations without building a national examination administration platform.

Conceptually:

```text
Examination
    ↓
Examination Session
    ↓
Examination Paper
    ↓
Learner Result
```

Example:

```text
Term 2 Examination
├── Mathematics Paper
├── English Paper
└── Biology Paper
```

The model must support one or multiple papers.

Do not assume every subject has Paper 1/Paper 2/Paper 3.

---

# 23. Examination Paper

An examination paper may contain:

- subject;
- paper identifier;
- maximum marks;
- duration where applicable;
- examination/session;
- academic period;
- status.

Support practical/oral/project components where configuration requires them.

---

# 24. Learner Result

The core result should represent a learner's outcome in an academic subject/context.

Conceptually:

```text
Learner
    ↓
Academic Enrollment
    ↓
Subject
    ↓
Academic Period
    ↓
Subject Result
```

A result may contain:

```text
final score
grade
descriptor
achievement level
status
```

It must reference the scheme/version used to calculate and grade it.

---

# 25. Result Lifecycle

Use a controlled lifecycle, adapting to existing repository conventions.

Recommended:

```text
DRAFT
SUBMITTED
APPROVED
LOCKED
AMENDED
```

Meaning:

### DRAFT
Editable.

### SUBMITTED
Ready for review.

### APPROVED
Authorized academic administrator has approved it.

### LOCKED
Cannot be normally edited.

### AMENDED
Controlled correction has occurred and history remains available.

Do not simply overwrite approved/locked results.

---

# 26. Result Approval

A simple approval process is sufficient:

```text
Teacher enters results
       ↓
Submit
       ↓
Academic administrator reviews
       ↓
Approve
       ↓
Lock
```

Use existing authorization.

Do not create a generic workflow engine.

---

# 27. Result Amendments

Corrections must preserve history.

Do not silently change:

```text
72 → 82
```

Instead preserve:

```text
Original
   ↓
Amendment
   ↓
New value
   ↓
Actor
   ↓
Time
   ↓
Reason
```

At minimum record:

- previous value;
- new value;
- actor;
- timestamp;
- reason;
- affected result;
- approval information where applicable.

Reuse existing audit functionality.

---

# 28. Ranking

Ranking is an optional feature.

It must NOT be part of the grading engine.

```text
Grading:
performance against criteria

Ranking:
relative ordering
```

Support a configurable policy:

```text
RankingPolicy
    enabled
    scope
    method
```

Potential scopes:

```text
CLASS
STREAM
ACADEMIC_LEVEL
SCHOOL
```

Potential methods:

```text
TOTAL_SCORE
AVERAGE_SCORE
AGGREGATE
```

Only implement methods that make sense for the result model.

---

# 29. Ranking Policy Examples

Example 1:

```text
Lower Secondary CBC
Ranking = OFF
```

Example 2:

```text
School Internal Examination
Ranking = ON
Scope = STREAM
Method = AVERAGE_SCORE
```

This is a configuration decision, not a hard-coded application rule.

---

# 30. Ranking and Ties

Define deterministic tie behavior.

Example:

```text
A 90 → 1
B 90 → 1
C 88 → 3
```

or another explicit policy.

Do not silently invent inconsistent tie handling.

The policy must be tested.

---

# 31. Ranking Timing

Official ranking should use eligible finalized results.

Recommended:

```text
Draft
  ↓
No official ranking

Approved/Locked
  ↓
Official ranking
```

A preview can be supported later if necessary, but do not make it a requirement for M12.

---

# 32. Aggregation

Support aggregation required for subject results.

Example:

```text
Assessment scores
      ↓
Subject Final Result
```

Potentially:

```text
Subject Results
      ↓
Overall Result
```

Do not assume every curriculum uses the same overall aggregation.

The stable core output should be the **subject-level result**.

M13 can handle presentation and progression-specific aggregation later.

---

# 33. Missing / Absent / Exempt

Do not treat every missing score as zero.

Assessment participation/result state should distinguish relevant states such as:

```text
PRESENT
ABSENT
EXEMPT
NOT_ASSESSED
PENDING
WITHHELD
```

Use only states justified by the actual repository.

Critical rule:

```text
Absent ≠ Zero
```

unless a configured policy explicitly defines otherwise.

Do not implement attendance here.

---

# 34. Transfers / Repeats / Incomplete Cases

M12 must remain valid when a learner:

- transfers in;
- transfers between classes;
- repeats;
- joins after an assessment;
- changes subject;
- has incomplete assessment evidence.

Do not build a transfer-management system.

Correctly anchor results to:

```text
school
academic year
academic enrollment
subject
assessment context
```

---

# 35. School/Tenant Isolation

All M12 operations must respect school boundaries.

A School A user must not access or modify School B:

- assessments;
- results;
- grading schemes;
- examinations;
- ranking policies.

Use the existing identity/membership/authorization architecture.

Server-side queries must enforce tenant scope.

---

# 36. Authorization

Reuse:

- AuthGuard
- PermissionGuard
- `@CurrentUser()`
- `@Permissions(...)`
- PermissionService
- existing school membership/context

Inspect existing permission naming before creating M12 permissions.

Possible concepts:

```text
assessment:read
assessment:manage
assessment:submit

result:read
result:manage
result:approve
result:lock
result:amend

grading:read
grading:manage

ranking:read
ranking:manage
```

These are examples, not mandatory names.

---

# 37. Teacher Authorization

A teacher must not automatically access every school's or class's results merely because they are authenticated.

Where applicable, teacher access must be constrained by existing:

```text
TeachingAssignment
TeachingGroup
Subject
Class/Stream
AcademicYear
```

For example:

```text
Teacher John
  ↓
S3A Mathematics Teaching Group
```

should not automatically grant access to:

```text
S4B Biology
```

Follow existing authorization conventions.

---

# 38. API

Follow existing versioning, DTO and controller conventions.

Potential resources:

```text
assessment-schemes
assessment-periods
assessments
assessment-components
assessment-scores
examinations
examination-papers
results
grading-schemes
ranking-policies
result-amendments
```

Potential operations:

```text
create
read
update
submit
approve
lock
amend
calculate
resolve
```

Do not blindly implement every endpoint.

Build the smallest coherent API required by the actual repository.

---

# 39. DTO Validation

All writes must validate:

- IDs;
- required fields;
- score bounds;
- academic relationships;
- school boundaries;
- duplicate entries;
- status transitions;
- weighting;
- grading boundaries.

Do not trust a future frontend to validate data.

---

# 40. Calculation Engine

The calculation engine is a core M12 component.

It must be:

- deterministic;
- testable;
- configurable;
- independent of controllers;
- explicit about weighting;
- explicit about rounding;
- safe with decimal values.

Conceptually:

```text
Raw Scores
   ↓
Normalize
   ↓
Apply Weights
   ↓
Final Score
   ↓
Apply Grading Scheme
   ↓
Result
```

Use one authoritative calculation path.

Do not duplicate formulas across services.

---

# 41. Calculation Example

Example configuration:

```text
Test 1       20%
Test 2       20%
Examination  60%
```

Learner:

```text
Test 1 = 40/50 = 80%
Test 2 = 45/50 = 90%
Exam   = 70/100 = 70%
```

Weighted:

```text
80 × .20 = 16
90 × .20 = 18
70 × .60 = 42
```

Final:

```text
76%
```

This is only an example.

Do not hard-code it.

---

# 42. Grading Engine

The grading engine should:

- accept the final calculated value or achievement input;
- use a specific grading scheme version;
- resolve grade;
- resolve descriptor/achievement level;
- reject invalid schemes;
- be deterministic;
- preserve the version used by finalized results.

---

# 43. Result Snapshot

A finalized result should retain enough information to explain itself.

Conceptually:

```text
Result
├── learner
├── subject
├── academic period
├── final score
├── grade
├── descriptor
├── achievement level
├── calculation scheme/version
└── grading scheme/version
```

The system must be able to answer:

> Why did this learner receive this result?

---

# 44. Database Integrity

Use database constraints where practical.

Protect:

- duplicate assessment scores;
- duplicate subject results;
- school boundaries;
- academic-year consistency;
- component ownership;
- examination/paper relationships;
- grading boundary validity where possible;
- finalized result integrity.

Use transactions for multi-step finalization and bulk operations.

---

# 45. Grading Boundary Validation

Reject invalid schemes.

Invalid:

```text
90–100 A
85–95 B
```

because ranges overlap.

The system must validate boundaries.

Decide explicitly whether gaps are allowed; prefer a simple consistent policy.

---

# 46. Weight Validation

For a percentage-based scheme:

```text
20 + 20 + 60 = 100
```

is valid.

If the scheme requires complete weighting:

```text
20 + 20 + 50 = 90
```

must be rejected.

Use one clear representation for weights.

Do not mix percentages, ratios and points in the same calculation contract.

---

# 47. Bulk Result Entry

The backend should support efficient bulk score entry.

Example:

```text
Mathematics Test 1

Student A → 42
Student B → 35
Student C → 48
Student D → ABSENT
```

A bulk API is preferable to requiring one request per learner where appropriate.

Validate every entry.

Do not partially corrupt a bulk operation.

Use transactions where appropriate.

Return useful validation results for rejected entries.

---

# 48. Score Validation

Normally:

```text
0 ≤ score ≤ maximumScore
```

Reject invalid values.

Do not silently clamp:

```text
105 → 100
```

unless an explicit domain rule requires that behavior.

---

# 49. M10 Compatibility

Every assessment must resolve through M10's academic model.

Do not permit arbitrary records such as:

```text
studentId + subjectId + score
```

with no valid academic context.

Assessment should be traceable to:

```text
Academic Year
Class/Stream
Subject
Teaching Group
Student Enrollment
```

where applicable.

---

# 50. Performance

M12 may process thousands of scores.

Avoid N+1 queries.

Use:

- indexes;
- bulk operations;
- pagination;
- filters;
- efficient Prisma queries;
- bounded result sets;
- transactions.

Likely filters:

```text
school
academicYear
academicPeriod
class
stream
subject
teachingGroup
assessment
student
teacher
status
```

Add indexes based on actual access patterns.

---

# 51. Auditability

Reuse the existing audit/history mechanism.

Important events include:

- score entry;
- score amendment;
- result submission;
- result approval;
- result lock;
- result amendment;
- grading scheme changes;
- ranking policy changes.

Do not create a second audit framework.

---

# 52. Tests

M12 is incomplete without automated tests.

### Assessment Schemes

Test:

- create;
- update/version;
- invalid weights;
- duplicate scheme;
- school isolation;
- permissions.

### Assessments

Test:

- valid creation;
- invalid teaching group;
- invalid subject;
- wrong academic year;
- cross-school rejection;
- components.

### Scores

Test:

- valid score;
- score above maximum;
- negative score;
- absent;
- duplicate;
- bulk entry;
- invalid student;
- student outside teaching context.

### Calculation

Test:

- simple calculation;
- weighted calculation;
- multiple components;
- rounding;
- decimals;
- zero;
- maximum;
- incomplete inputs;
- deterministic output.

### Grading

Test:

- exact boundaries;
- minimum/maximum;
- invalid overlap;
- gaps;
- descriptor;
- achievement level;
- non-numeric result where supported.

### Continuous Assessment

Test:

- CA assessment;
- CA aggregation;
- scheme-specific weighting.

### Projects

Test:

- project assessment;
- project result;
- achievement level;
- standalone result where configured.

### Examinations

Test:

- examination;
- session;
- paper;
- learner results;
- multiple papers.

### Result Lifecycle

Test:

```text
DRAFT → SUBMITTED → APPROVED → LOCKED
```

and invalid transitions.

### Amendments

Test:

- amendment of locked result;
- reason;
- previous value;
- new value;
- actor;
- timestamp;
- authorization.

### Ranking

Test:

- disabled ranking;
- enabled ranking;
- class ranking;
- stream ranking;
- ties;
- incomplete results;
- deterministic ordering;
- finalized-result requirement.

### Authorization

Test:

- unauthenticated;
- insufficient permission;
- teacher access;
- administrator access;
- cross-school access;
- cross-teaching-group access.

### Regression

Run all existing M09/M10 and repository tests.

---

# 53. No Frontend

Explicitly do NOT build:

- Next.js pages;
- mark-entry screens;
- grading screens;
- ranking screens;
- dashboards;
- report-card screens;
- PWA;
- mobile UI.

M12 is:

```text
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
```

Only.

---

# 54. No Future Milestones

Do not implement:

### M11
Attendance

### M13
Report Cards, Transcripts & Progression

### M16
Timetable & School Calendar

### M21
Notifications & Communication

### M22
Dashboards, Analytics & Reporting

### M24
PWA, Offline & Mobile Experience

Only create minimal data contracts needed by future milestones.

---

# 55. UNEB Relationship

The ERP should be **UNEB-aware but not UNEB-dependent**.

UNEB is the national assessment body and has a separate eRegistration platform. citeturn0search9turn0search23

M12 should preserve structured data that could support legitimate future reporting/export/integration.

Do not build direct UNEB API integration unless explicitly required by the repository.

Do not represent internal school results as national UNEB results.

---

# 56. Uganda Curriculum Flexibility

The common engine should be able to support, through configuration:

```text
Primary
    ↓
Learning-area / subject-oriented assessment
```

```text
Lower Secondary
    ↓
Competency-based / criterion-referenced assessment
```

```text
Advanced Secondary
    ↓
Aligned competency / criterion-referenced assessment
```

NCDC's current Advanced Secondary direction emphasizes criterion-referenced assessment and current subject-specific assessment guidelines. citeturn0search17turn0search5

Do not create separate hard-coded assessment engines for each section.

Prefer:

```text
Common Assessment Engine
        +
Configurable Schemes
```

---

# 57. Simple but Strong Data Model

Aim conceptually for:

```text
AssessmentScheme
    ↓
AssessmentSchemeVersion
    ├── AssessmentComponentDefinition
    └── GradingSchemeVersion

AcademicPeriod
    ↓
Assessment
    ├── AssessmentComponent
    └── AssessmentScore

AssessmentScore
    ↓
LearnerResult

LearnerResult
    ├── Grade/Descriptor/Achievement
    └── Ranking (derived/configured)
```

Plus:

```text
Examination
    ↓
ExaminationPaper
    ↓
Assessment / Result
```

This is conceptual only.

Reuse equivalent existing models.

---

# 58. Keep It Simple

Do NOT build:

- a rules programming language;
- generic formula scripting;
- a workflow engine;
- a national UNEB platform;
- a full LMS;
- a full digital portfolio;
- report-card generation;
- transcript generation;
- progression engine.

M12 is a **school assessment and results engine**.

Configuration should cover normal academic variation without turning the application into an arbitrary programming platform.

---

# 59. Seed Data

Inspect existing seed data.

Add only minimal useful M12 demo data if necessary.

Examples may include:

```text
Assessment Scheme
Grading Scheme
Assessment Period
Assessment
```

Uganda examples are allowed as seed/configuration data.

They must never become hard-coded business logic.

---

# 60. Migration Strategy

Before Prisma changes:

1. Inspect current schema.
2. Inspect M10 migration.
3. Identify reusable models.
4. Add only necessary models/fields/relationships.
5. Generate migration.
6. Review SQL.
7. Check for destructive operations.
8. Verify constraints and indexes.
9. Run migrations.
10. Run tests against supported development database.

Do not modify unrelated schema.

---

# 61. Implementation Order

Use this sequence:

### Phase 1
Repository reconnaissance.

### Phase 2
M10 compatibility/domain mapping.

### Phase 3
Assessment scheme + versioning.

### Phase 4
Academic period integration if missing.

### Phase 5
Assessment + components.

### Phase 6
Scores/evidence.

### Phase 7
Calculation engine.

### Phase 8
Grading engine.

### Phase 9
Result lifecycle.

### Phase 10
Examinations.

### Phase 11
Ranking.

### Phase 12
Authorization and school isolation verification.

### Phase 13
Tests.

### Phase 14
Full regression.

### Phase 15
Final migration/diff review.

Do not create one giant service.

---

# 62. Service Boundaries

Follow the actual repository architecture.

Conceptually, responsibilities may be separated into:

```text
AssessmentSchemeService
AssessmentService
AssessmentScoreService
CalculationService
GradingService
ResultService
ExaminationService
RankingService
```

These are suggestions, not mandatory class names.

Keep responsibilities cohesive.

---

# 63. Calculation Engine Requirements

The calculation engine must:

- accept a specific scheme/version;
- validate inputs;
- normalize scores;
- apply weights;
- apply rounding;
- return deterministic output;
- never mutate source scores;
- preserve finalized results;
- be unit-testable independently of HTTP;
- be as independent of Prisma as practical.

---

# 64. Grading Engine Requirements

The grading engine must:

- use a specific grading scheme version;
- map score/achievement to grade;
- resolve descriptor;
- resolve achievement level;
- reject invalid scheme definitions;
- be deterministic;
- preserve the scheme version used.

---

# 65. Ranking Engine Requirements

The ranking engine must:

- run only when enabled;
- use explicit policy;
- use eligible finalized results;
- produce deterministic ordering;
- handle ties explicitly;
- never change grades;
- remain separate from grading.

---

# 66. Source vs Derived Data

Distinguish:

### Source

```text
Assessment scores
Evidence
Maximum scores
Weights
Scheme configuration
```

### Derived

```text
Normalized score
Weighted contribution
Final score
Grade
Descriptor
Rank
```

Derived values may be stored for performance, but the system must preserve enough information to explain them.

Avoid contradictory sources of truth.

---

# 67. Definition of Done

M12 is complete when:

- [ ] Repository inspected before implementation.
- [ ] M10 implementation inspected and reused.
- [ ] Existing academic/student/teacher/subject relationships respected.
- [ ] Assessment schemes exist.
- [ ] Scheme versions preserve historical rules.
- [ ] Academic assessment periods supported.
- [ ] Assessments can be created.
- [ ] Components supported where required.
- [ ] Continuous assessment supported.
- [ ] Project assessment supported.
- [ ] Examination assessment supported.
- [ ] Practical/performance/evidence assessment can be represented.
- [ ] Scores recorded safely.
- [ ] Absent is not automatically zero.
- [ ] Weighting configurable.
- [ ] Calculation deterministic.
- [ ] Rounding explicit.
- [ ] Grading configurable.
- [ ] Grade boundaries validated.
- [ ] Criterion-referenced outcomes supported.
- [ ] Achievement levels/descriptors supported.
- [ ] Subject results are stable and traceable.
- [ ] Result lifecycle implemented.
- [ ] Approved/locked results cannot be silently overwritten.
- [ ] Amendments preserve history.
- [ ] Ranking is optional.
- [ ] Ranking is separate from grading.
- [ ] Ranking supports appropriate scopes.
- [ ] Ranking ties are deterministic.
- [ ] Ranking uses eligible finalized results.
- [ ] School/tenant isolation enforced.
- [ ] Existing authorization reused.
- [ ] Teacher access respects teaching context where applicable.
- [ ] Database constraints protect important invariants.
- [ ] Calculation/grading tests are strong.
- [ ] API integration/E2E tests cover critical flows.
- [ ] Existing M09/M10 tests pass.
- [ ] No frontend implemented.
- [ ] No future milestone implemented.
- [ ] Migration reviewed and safe.
- [ ] Final diff has no unrelated scope creep.

---

# 68. OpenCode Instructions

You are implementing **M12 — Assessment, Examinations, Grading & Ranking**.

Read this entire document before coding.

Then:

1. Inspect the real repository.
2. Inspect the actual M10 implementation.
3. Inspect Prisma schema and migrations.
4. Map existing models to this specification.
5. Identify what already exists.
6. Identify what is missing.
7. Do not duplicate existing entities.
8. Produce a concise implementation plan based on the actual repository.
9. Implement M12 incrementally.
10. Run focused tests after each major layer.
11. Run the complete existing test suite.
12. Review migration SQL.
13. Review authorization.
14. Review school/tenant isolation.
15. Review the final git diff.
16. Remove accidental scope creep.

The repository is authoritative for naming and existing architecture.

The following constraints are non-negotiable:

**Backend only.**

**No frontend.**

**No hard-coded Uganda grading rules.**

**No hard-coded subject combinations.**

**No hard-coded ranking behavior.**

**No destructive rewriting of historical results.**

**No second authorization system.**

**No M11 attendance.**

**No M13 report cards/transcripts/progression.**

**No M16 timetable/calendar.**

**No M21 notifications.**

**No M22 dashboards/analytics.**

**No M24 PWA/offline/mobile.**

---

# 69. Final Report Required

At completion report:

## Repository Analysis
- Existing M10 structures reused.
- Existing assessment-related structures found.

## Files Created
List every file.

## Files Modified
List every file.

## Database
- Prisma changes.
- Constraints.
- Indexes.
- Migrations.
- Any data migration.

## Domain
- Assessment schemes.
- Assessments.
- Components.
- Scores/evidence.
- Calculation.
- Grading.
- Results.
- Examinations.
- Ranking.

## API
List endpoints and purpose.

## Authorization
List permissions and isolation behavior.

## Tests
List:
- unit;
- integration;
- E2E;
- complete suite result.

## Scope Confirmation

Explicitly confirm:

```text
Frontend: NOT implemented
M11: NOT implemented
M13: NOT implemented
M16: NOT implemented
M21: NOT implemented
M22: NOT implemented
M24: NOT implemented
```

## Remaining Limitations
List anything intentionally deferred.

---

# 70. Final Architecture Target

At the end of M12:

```text
M10
Academic Teaching Context
        │
        ▼
M12
Assessment Engine
        │
        ├── Assessment Schemes
        ├── Assessment Activities
        ├── Continuous Assessment
        ├── Projects
        ├── Practical / Evidence
        ├── Examinations
        │
        ▼
    Scores / Evidence
        │
        ▼
    Calculation Engine
        │
        ▼
    Final Subject Result
        │
        ├── Grade
        ├── Descriptor
        └── Achievement Level
        │
        ▼
    Optional Ranking
        │
        ▼
M13
Reports / Transcripts / Progression
```

The goal is a **small, reliable, configurable assessment engine** that fits Uganda's current educational context, supports different school sections and curricula, preserves academic history, and provides M13 with a trustworthy results foundation.

**Implement M12 cleanly, simply and production-safely.**
