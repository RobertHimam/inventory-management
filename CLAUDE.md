# CLAUDE.md

Read AGENTS.md first.

AGENTS.md is the source of truth.
Never implement business logic before tests exist.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.

---

### 1. KISS — Keep It Simple, Stupid

- Simple does not mean trivializing the problem — make it as simple as possible, but no simpler than it needs to be.
- Simple code is easier to maintain and revisit later.

---

### 2. DRY — Don't Repeat Yourself

- ReUse, inherit, overload, overwrite.
- Centralize everything — one place for one piece of logic.
- Use constants: `BLConst.ITEMID`, `BLConst.ITEMDESC`, etc.

---

### 3. Divide et Impera — Divide & Conquer

- Break down complexity into manageable pieces.
- Split large tasks into multiple small, focused tasks.

---

### 4. Don't Do Business at the Crossroads

> Crossroads = branching/switching: `if / else if / else`, `switch / case`

- Don't put detailed process logic inside branching conditions.
- Handle the work elsewhere — create dedicated methods to group related operations.
- Branches are for directing flow, not for executing business logic.

---

### 5. Be Clear & Concise — O.V.O.P

> Data is your asset: object instances, variables (ordinal, literal, array).

- **One Variable, One Purpose** — one piece of data for one single intent.
- Names must be intuitive but short.
- Naming convention: `<object>_<sub1>_<sub2>`

---

### 6. Kick Troublemakers at the Front Door

- Handle invalid/error conditions early with guard clauses and early returns.
- Pattern: `if (invalid) return -1; todo1(); todo2();`
- Avoid deep nested conditions — fail fast, fail early.

---

### 7. Keep the Goal Close to the Net

- Perform checks at the most critical point that is guaranteed to be called.
- Don't check in many scattered places — that violates DRY.
- Place validation at the entry point that is always automatically executed.
