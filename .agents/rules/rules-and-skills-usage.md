---
trigger: always_on
---

# Rules & Skills Usage Guide

## Part 1: Conditional Rules (Model Decision)

### `frontend-rules`
**Activate on:** any UI task — component, page, modal, drawer, form, button, table, layout, style, design, look, feel.
**Do NOT activate for:** data fetching, service logic, TypeScript types, SQL, migrations.

**Mandatory workflow:**
1. Read `frontend-design` skill for aesthetic direction

## Part 2: Skills

| Skill | Purpose | Trigger |
|---|---|---|
| `frontend-design` | Premium UI, aesthetic direction | build, design, component, page, style, UI |
| `systematic-debugging` | Root-cause analysis before any fix | bug, error, broken, not working, unexpected |
| `universal-skills-manager` | Find, install, sync AI skills | install skill, find skill, sync skill |
| `vercel-react-best-practices` | React/Next.js best practices — new code, refactors, reviews | **any** React/Next.js work: new components, hooks, pages, data fetching, refactors, or reviews |

### `frontend-design`
Use for any visual output. **Not for** data fetching or business logic.
> "Add a payroll modal" / "Redesign the employee card" / "Make the dashboard more premium"

### `systematic-debugging`
⚠️ **Iron Law: invoke BEFORE any fix, no exceptions.** Root cause first, always.
> "Drawer isn't showing data" / "RLS blocks everyone" / "Salary returns wrong numbers"

### `universal-skills-manager`
Use to find, install, or sync skills across AI tools. Requires Python 3 + network access.
> "Find a code review skill" / "Install adversarial-coach" / "Sync skills to Gemini"

### `vercel-react-best-practices`
Use for **all React and Next.js work** — this is a baseline standard, not a last resort. It applies from the very first line of a new component, not just when something is slow or broken. Covers 64 rules across 8 priority categories — from eliminating async waterfalls and bundle size reduction (CRITICAL) to re-render optimization and advanced patterns (LOW).

**Activate on ALL of the following — no exceptions:**
- ✅ Writing any new React component, hook, or page (build it right the first time)
- ✅ Implementing data fetching — client or server-side
- ✅ Refactoring or reviewing existing React/Next.js code
- ✅ Adding state management, effects, or subscriptions
- ✅ Suspecting performance regressions — slow renders, waterfalls, large bundles
- ✅ Optimising bundle size or load times

> "Add a new drawer" / "Implement data fetching" / "Refactor this hook" / "Build a new page" / "Data fetching is slow"

---

## Part 3: Combined Flows

### Flow A — New UI Feature
```
frontend-rules → frontend-design → vercel-react-best-practices → build
```
*Example: payroll modal → apply aesthetic direction → apply React performance rules → build*

### Flow B — Backend Bug
```
systematic-debugging
```

### Flow C — Frontend Bug
```
systematic-debugging → frontend-rules → frontend-design → vercel-react-best-practices
```
*Example: preview shows NaN → trace API shape → fix null handling in component → verify no re-render regressions*

### Flow E — React/Next.js Performance Work
```
vercel-react-best-practices → systematic-debugging (if regression) → frontend-rules (if UI changes needed)
```
*Example: slow page load → check waterfall rules → parallelize fetches → verify bundle size impact*

### Flow D — Install a New Skill
```
universal-skills-manager → update this file to document the new skill
```

---

## Part 4: Quick Decision Reference

| Scenario | Activate |
|---|---|
| UI element, page, component | `frontend-rules` + `frontend-design` + `vercel-react-best-practices` |
| Any new React component, hook, or page | `vercel-react-best-practices` — always, even on first implementation |
| Refactor, review, or performance work | `vercel-react-best-practices` (Flow E) |
| Full-stack (table + page) | Flow B |
| Anything broken | `systematic-debugging` FIRST → then relevant rule + skill |
| Find/install a skill | `universal-skills-manager` |

---

## Part 5: Principles

1. **`systematic-debugging` is always first** for broken behavior — no fix without root cause.
2. **`frontend-rules` + `frontend-design` are inseparable** — rule governs tooling, skill governs aesthetics.
3. **`vercel-react-best-practices` is the React baseline** — apply it on every new component, hook, page, or data-fetching implementation. Do not wait for something to break. Build it right the first time.
4. **Debug first, then build** — data model and root cause must be resolved before new UI or schema work.
5. **Default flow: Debug → Backend → SQL Audit → Frontend → React Best Practices Check.**