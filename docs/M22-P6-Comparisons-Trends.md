# Comparative & Trend Analytics
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

Add reusable comparison and trend analytics.

Implement:
- period-over-period comparison
- academic-year comparison
- class comparison
- stream comparison
- subject comparison
- trend direction
- change magnitude
- stable/improving/declining indicators

Only compare compatible academic contexts. For example, comparing the same subject across Term 1 and Term 2 is valid; blindly comparing unrelated levels is not.

For numeric results calculate absolute/percentage-point change. For achievement levels, only use ordinal comparisons when the M12 scheme explicitly defines an ordering. Never invent numeric meanings for descriptors.

Test compatible/incompatible contexts, missing periods, subject changes, different grading schemes and numeric/non-numeric results.

NOT IN SCOPE:
predictive analytics, AI, frontend, report cards, progression, attendance.

Definition of done: the system can reliably explain academic improvement, decline or stability across valid contexts.

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
