# Analytics Hardening, Performance & Audit
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

Harden the complete M22 subsystem before dashboards or M13 consume it.

Review:
- authorization
- tenant isolation
- query performance
- indexes
- aggregation correctness
- pagination
- filtering
- API consistency
- error handling
- auditability
- test coverage

Explicitly test attempts to access another school, unauthorized academic contexts, unrelated teaching groups and unauthorized student/class analytics.

Inspect for N+1 queries, repeated aggregation, unbounded queries and unnecessary application-memory aggregation.

Verify:
- correct use of finalized M12 results
- no duplicate counting
- absent is not silently treated as zero
- no M12 grading/ranking recalculation
- correct period boundaries
- correct non-numeric handling

Run all M09, M10, M12 and M22 tests.

NOT IN SCOPE:
frontend, charts, dashboards, PWA, predictive AI, report cards, transcripts, progression.

Definition of done: M22 is a secure, performant production-ready analytics backend.

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
