name: Rules And Skills Usage
description: "Decision guide for selecting rule files and skills based on task type, including debugging-first and UI workflows."
applyTo: "**"
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

### `frontend-design`
Use for any visual output. **Not for** data fetching or business logic.
> "Add a payroll modal" / "Redesign the employee card" / "Make the dashboard more premium"

### `systematic-debugging`
⚠️ **Iron Law: invoke BEFORE any fix, no exceptions.** Root cause first, always.
> "Drawer isn't showing data" / "RLS blocks everyone" / "Salary returns wrong numbers"

### `universal-skills-manager`
Use to find, install, or sync skills across AI tools. Requires Python 3 + network access.
> "Find a code review skill" / "Install adversarial-coach" / "Sync skills to Gemini"

---

## Part 3: Combined Flows

### Flow A — New UI Feature
```
frontend-rules → frontend-design → build
```
*Example: payroll modal → apply aesthetic direction → build*

### Flow B — Backend Bug
```
systematic-debugging
```

### Flow C — Frontend Bug
```
systematic-debugging → frontend-rules → frontend-design
```
*Example: preview shows NaN → trace API shape → fix null handling in component*


### Flow D — Install a New Skill
```
universal-skills-manager → update this file to document the new skill
```

---

## Part 4: Quick Decision Reference

| Scenario | Activate |
|---|---|
| UI element, page, component | `frontend-rules` + `frontend-design` |
| Full-stack (table + page) | Flow B |
| Anything broken | `systematic-debugging` FIRST → then relevant rule + skill |
| Find/install a skill | `universal-skills-manager` |

---

## Part 5: Principles

1. **`systematic-debugging` is always first** for broken behavior — no fix without root cause.
2. **`frontend-rules` + `frontend-design` are inseparable** — rule governs tooling, skill governs aesthetics.
3. **Debug first, then build** — data model and root cause must be resolved before new UI or schema work.
4. **Default flow: Debug → Backend → SQL Audit → Frontend.**