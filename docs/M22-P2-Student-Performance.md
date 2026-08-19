# Student Performance Analytics
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

Build student-level academic performance analytics on top of M22-P1 and M12.

Use finalized/eligible M12 results. Never recalculate M12 grades or rankings.

Implement:
- student performance summary
- subject-by-subject performance
- period comparison
- academic trend
- strengths/attention areas using transparent deterministic rules
- result completion
- grade/achievement distributions
- ranking display only when supplied by M12

Support numeric scores, grades, descriptors and achievement levels. Do not force competency outcomes into percentages.

Trends must work with configurable academic periods; do not assume exactly three terms.

Tests must cover single/multiple periods, missing results, non-numeric outcomes, changing subject enrollment, authorization and tenant isolation.

NOT IN SCOPE:
class/stream/school analytics, dashboards, report cards, progression, attendance, predictive analytics, frontend.

Definition of done: the backend can produce a trustworthy academic performance profile for one learner.

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
