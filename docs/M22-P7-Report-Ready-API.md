# Report-Ready Analytics API
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

Prepare stable analytics read models for future M13.

M22 provides analytics; M13 will own report cards, transcripts and progression.

Create clean read contracts for:
- student performance summary
- subject performance
- period performance
- strengths/attention indicators
- grade/achievement distribution
- trends
- class comparison where appropriate
- ranking display from M12 where available

The student report-ready response should support:
Student → Academic Period → Subject Results → Performance Summary → Trends → Strengths → Attention Areas.

It must support numeric, grade-based and competency/achievement-based results.

Do NOT generate reports, PDFs or transcripts.

Regression-test earlier M22 phases.

Definition of done: M13 can consume analytics through a stable API without rebuilding analytics logic.

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
