# Analytics Foundation
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

Build the backend foundation for M22 Analytics.

READ THE REPOSITORY FIRST. Inspect M09 Identity/Authorization, M10 Academic Operations and M12 Assessment/Results. Reuse existing models and conventions. Frontend is NOT in scope.

Implement only:
- M22 analytics module/domain foundation
- reusable analytics query/context filters
- school, academic year, period, section, level, class, stream, subject and student filtering where supported
- read-only analytics services/API contracts
- existing authorization and tenant isolation
- database-side aggregation where practical
- focused unit/integration/E2E tests

Analytics is a DERIVED READ layer. M12 remains the source of truth for scores, grades and ranking. Do not create another grading, ranking or assessment engine.

Do not hard-code S1/P7/PCM/terms or Uganda-specific grading rules.

Create only the smallest useful API proving the foundation works, such as an academic aggregate summary.

NOT IN SCOPE:
- frontend
- dashboards/charts
- report cards
- transcripts
- progression
- attendance
- notifications
- PWA
- predictive/AI analytics

Definition of done: M22 has a clean, secure analytics foundation that can safely query finalized M12 academic data.

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
