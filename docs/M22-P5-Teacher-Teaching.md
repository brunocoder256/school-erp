# Teacher & Teaching Analytics
## M22 — Analytics Phase

**Project:** School ERP  
**Milestone:** M22  
**Implementation:** Backend/domain/API/database/tests only  
**Frontend:** NOT in scope

---

## OpenCode Instructions

Read this entire file before coding.

The repository is the source of truth. Inspect the actual existing implementation before creating or modifying models.

**Do not implement future milestones.**

Build descriptive analytics around M10 teaching assignments and teaching groups.

Do NOT create teacher rankings or staff appraisal.

Implement:
- teaching-group result completion
- assigned learner/result counts
- submitted/pending results
- completion rate
- subject/class performance for legitimate teaching assignments
- missing-result identification
- period trends where meaningful
- submission timeliness only if existing timestamps support it

Teachers may only access teaching contexts they are authorized to access. Administrators follow existing permissions.

Explicitly avoid interpreting class averages as teacher quality.

Test teacher authorization, unrelated teaching-group rejection, administrator access, school isolation, missing results and non-numeric outcomes.

NOT IN SCOPE:
teacher ranking, appraisal, payroll, attendance, frontend dashboards, predictive analytics.

Definition of done: authorized users can understand teaching/result activity without creating a surveillance or appraisal engine.

## Required Workflow

1. Inspect the repository before coding.
2. Inspect existing M09, M10 and M12 structures relevant to this phase.
3. Identify reusable models/services.
4. Produce a concise implementation plan.
5. Implement only this phase.
6. Add focused tests.
7. Run affected tests.
8. Run the existing regression suite.
9. Review Prisma/schema/migrations if changed.
10. Review authorization and school isolation.
11. Review git diff for scope creep.

## Final Report

Report:
- repository findings
- files created
- files modified
- database changes
- API endpoints
- authorization
- tests executed/results
- known limitations
- explicit confirmation that frontend and future milestones were not implemented.
