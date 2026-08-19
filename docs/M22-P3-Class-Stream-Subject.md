# Class, Stream & Subject Analytics
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

Build aggregated analytics for classes, streams and subjects.

Use finalized M12 results and never duplicate M12 grading/ranking logic.

Implement:
- class performance summary
- stream performance summary
- subject performance summary
- learner/result completion
- score distributions where numeric scoring exists
- grade distributions
- achievement distributions
- period-over-period change
- valid stream/class/subject comparisons

Handle non-numeric competency results correctly.

Avoid N+1 queries and aggregate in the database where practical.

Test empty/partial results, multiple streams, subject filtering, school isolation and permissions.

NOT IN SCOPE:
school-wide executive analytics, teacher analytics, attendance, dashboards/frontend, predictive analytics.

Definition of done: authorized users can analyze performance at class, stream and subject level.

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
