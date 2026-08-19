# School-Wide Academic Analytics
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

Build school-wide academic analytics.

Respect the existing hierarchy:
School → Education Section → Academic Level → Class → Stream → Subject.

Implement:
- school academic overview
- section overview
- academic-level overview
- class comparison
- stream comparison
- subject comparison
- result completion
- grade/achievement distributions
- period trends
- academic-year comparison where valid

Use database-side aggregation. Do not leak student-level information unless the endpoint explicitly requires it and authorization permits it.

Do not hard-code Uganda class names or grading rules.

Test school, section, level, class, stream, subject, period, year, authorization and tenant isolation.

NOT IN SCOPE:
frontend/dashboard UI, financial analytics, attendance, teacher analytics, predictive analytics, notifications.

Definition of done: the API provides trustworthy hierarchical school academic analytics.

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
