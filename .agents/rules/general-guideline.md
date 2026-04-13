---
trigger: always_on
---

# Rule 1: General Coding Architecture & Standards

## Directive

These are the **non-negotiable architectural and code quality standards** for this project. Every code change — whether adding a feature, fixing a bug, or refactoring — must comply with these rules.

---

## Rule 1.1 — Dumb Frontend: The UI Only Renders, It Never Decides

The frontend is a **display layer only**. It renders what the API returns. It does not calculate, process, or make business decisions.

- ❌ Do NOT compute critical business values, policy outcomes, permissions, or billing decisions on the frontend.
- ❌ Do NOT derive state from other state that should have been pre-computed by the server.
- ✅ DO send raw user inputs to the server and render whatever the server sends back.
- ✅ DO display live UI projections (e.g., previews, estimates, simulations) **clearly labeled as estimates only**, understanding the backend's result is always authoritative and final.

The server is king. Its response is the truth. The frontend is just a window.

---

## Rule 1.2 — Service Layer Separation: Components Must Never Call the API Directly

All data fetching and mutation logic must be encapsulated in dedicated service files (`*.service.ts` or equivalent). UI components are not allowed to directly invoke network or data access clients.

**The only valid data flow is:**
```
Component → Service Layer → API / Data Source
```

- ❌ Do NOT write direct API/database calls inside UI components.
- ✅ DO create or update a service file (e.g., `user.service.ts`, `orders.service.ts`) and call a named function from it.
- ✅ DO keep service functions single-responsibility and clearly named (e.g., `createOrder`, `fetchActiveUsers`).

This ensures components remain clean, logic is reusable, and API changes only require touching one file.

---

## Rule 1.3 — Server-Side Validation is Mandatory and Non-Negotiable

Client-side validation (e.g., required field checks, format validation) is a **UX nicety only** — it is never a security control.

- ❌ Do NOT rely on frontend validation as the only guard against bad data.
- ✅ The backend MUST independently validate all inputs: types, required fields, value ranges, and business rules (e.g., uniqueness windows, lifecycle constraints), regardless of what the frontend sends.
- ✅ The API must return a structured, human-readable error response for every validation failure. Never return a raw stack trace to the client.

The rule is: if the backend doesn't check it, it isn't checked.

---

## Rule 1.4 — Type Safety: No Unsafe Escape Hatches

Use strict typing conventions supported by your stack. Unsafe type bypasses are banned.

- ❌ Do NOT use unsafe escapes (`any`, broad casts, ignores, or equivalent language-specific bypasses) to silence type errors.
- ✅ DO use generated/shared contract types where available (OpenAPI/GraphQL/schema-generated types, shared DTOs, or equivalent).
- ✅ DO fully type function signatures, component/module interfaces, and API response shapes.
- ✅ If a type is genuinely unknown, use safe unknown/object patterns and narrow with type guards or validators.

Type safety is not optional. It is your contract between layers.

---

## Rule 1.5 — No Magic Numbers or Hardcoded Constants in Logic

Business constants must never be scattered inline across the codebase. They belong in a single, named, and documented source of truth.

Examples of forbidden inline magic numbers:
```typescript
// ❌ BAD
const timeoutMs = 30000;
const tier = score >= 85 ? "high" : score >= 70 ? "medium" : "low";
```

```typescript
// ✅ GOOD — defined once in src/lib/constants.ts
import { REQUEST_TIMEOUT_MS, SCORE_TIERS } from "@/lib/constants";
const timeoutMs = REQUEST_TIMEOUT_MS;
```

All constants with business meaning (thresholds, retry windows, limits, defaults, etc.) must be defined in a single constants module (for example `src/lib/constants.ts`) with a clear name and comment explaining the rule behind the value.

---

## Rule 1.6 — i18n-Ready: No Hardcoded User-Facing Strings

If the product supports multiple locales, **all user-facing text must go through the translation system.** No exceptions.

- ❌ Do NOT write raw strings directly in UI markup when localization is enabled.
- ✅ DO use the project's localization APIs/helpers for all user-visible text.
- ✅ New translation keys must be added to all supported locale files whenever a new string is introduced.
- ✅ Error messages returned from the API should also be i18n-mapped on the frontend before display.

If a string will ever be read by a user, it must be translatable.

---

## Rule 1.7 — Consistent Error Handling: No Silent Failures

Every user-initiated action that touches the network must have explicit error handling with user-facing feedback.

- ❌ Do NOT leave `catch` blocks empty or only log to the console.
- ❌ Do NOT let failed API calls result in a blank screen or stale data with no indication to the user.
- ✅ DO surface all errors through the global notification system (toast / alert) with a clear, human-readable message.
- ✅ DO return structured error objects from all service functions — never raw `Error` instances or untyped exceptions.
- ✅ Loading states must always be handled. A user should never see a button that does nothing when clicked during a pending operation.

Silence is not acceptable. Every failure must be visible and recoverable.

---

## Rule 1.8 — Atomic Database Operations: No Partial State

Any server-side operation that involves multiple database writes (creating records, updating flags, deleting rows) must be wrapped in a **single atomic `BEGIN ... COMMIT` transaction**.

- ❌ Do NOT execute multi-step writes as a sequence of independent queries. If one fails halfway, the database will be left in a corrupt, partial state.
- ✅ Any critical multi-step create/update/delete operation MUST be fully atomic. If any step fails, the entire operation rolls back.
- ✅ This applies to any future multi-step operation added to the system.

Partial state is not a recoverable condition in transactional systems. Atomicity is required, not preferred.

---

## Rule 1.9 — File Organization: One Responsibility Per File

Every file in this project must have a **single, clear, and obvious purpose**. If a piece of code does not naturally belong in the file you are currently editing, it does not go there — it gets its own file.

- ❌ Do NOT add utility functions to a component file because it was "convenient".
- ❌ Do NOT add API calls to a constants file, or types to a service file, or business logic to a UI helper.
- ❌ Do NOT let a file grow into a "misc" or "utils" dumping ground with unrelated concerns lumped together.
- ✅ DO create a new file whenever new code doesn't clearly belong to an existing file's stated responsibility.
- ✅ DO name files after exactly what they do: `orders.service.ts`, `user.types.ts`, `date.utils.ts`, `constants.ts`. The filename should make the contents obvious without opening the file.
- ✅ DO follow the established directory structure for where new files land:

```
Example Structure:

src/
├── components/    # UI components only — no logic, no API calls
├── pages/         # Page-level components and routing
├── services/      # All API communication (*.service.ts)
├── store/         # Global state management (*.store.ts)
├── lib/           # Shared utilities, constants, and config
├── types/         # Shared TypeScript type definitions
└── i18n/          # Translation locale files
```

When in doubt, ask: *"If someone opened this file by its name, would they be surprised to find this code here?"* If yes — create a new file.