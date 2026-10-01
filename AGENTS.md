# Agent Instructions

For every phase, in this order:

1. Read `docs/RULES.md` first.
2. Read `docs/PROJECT_CONTEXT.md`, `docs/PRD.md`, and the documents governing the current phase.
3. Establish and report a Context Lock containing the current phase, approved goal, approved architecture, approved stack, allowed files, acceptance criteria, prohibited work, and unresolved decisions.
4. Inspect `git status --short` before editing.
5. Modify only phase-relevant files and preserve unrelated work.
6. Reuse existing code and native platform features; do not add an arbitrary dependency.
7. Stop before any RED change or unresolved product, architecture, dependency, API, design, security, or scope decision and request human approval.
8. Run every verification command required by the phase. Never fabricate results.
9. Report the Context Lock, changes, verification, dependency changes, YELLOW/RED changes, and unresolved decisions.
10. Stop. Never commit automatically and never move to the next phase without explicit human approval.

The document authority order in `docs/RULES.md` is binding. Reference inputs are read-only and must never be executed.

