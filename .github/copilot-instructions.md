# Copilot / AI Agent Instructions — welltech-clinic-core

You are working in a regulated medical clinic system.
Speed is secondary to correctness.
Server-side rules override UI behavior.

---

## 🚫 RED-LINE RULES (NON-NEGOTIABLE)

1) **Completed visits are immutable**
- If `visit.status === "completed"`, you must NOT generate code that mutates:
  - SOAP fields (`subjective`, `objective`, `assessment`, `plan`)
  - Core visit fields
- Any post-completion change must be **append-only** (new note/event), never update-in-place.

2) **Server-only secrets never enter client code**
- `APPWRITE_API_KEY` and server-keyed `Databases` clients must never be imported into:
  - client components
  - shared utilities used by client components
- All admin DB access, session parsing, and auth enforcement happens server-side only.

3) **Role boundaries are enforced on the server**
- Reception:
  - create patient
  - create visit
  - view queue
  - ❌ no SOAP read/write
- Doctor:
  - read/write SOAP only while `in_consult`
  - complete visit
- UI checks do not count. Enforcement must exist in server actions or server components.

If a request would violate any red-line rule, STOP and ask for clarification.

---

## Big picture (current architecture truth)

- Next.js App Router project using **server-first patterns**
  - server components
  - server actions (`action.ts`)
- Appwrite is the backend for Phase 0
  - Do not introduce Firebase or abstraction layers “for later”
- Directional architecture:
  - per-clinic isolation
  - clinic-scoped authorization
  - append-only audit mindset

---

## Core domain model (Phase 0 spine)

### Visit lifecycle (immutable once completed)
- Status transitions: `queued` → `in_consult` → `completed`
- Invalid transitions rejected server-side.
- All completion attempts logged to append-only audit trail.

### Visit fields
- `status` (string: "queued", "in_consult", "completed")
- `consultEndAt` (datetime, set when status → "completed")
- `patientId` (string)
- SOAP fields: `subjective`, `objective`, `assessment`, `plan`
- Immutable after completion

### Audit trail
- Collection: `visit_audits` (append-only)
- Event types: `visit.complete_attempt`, `visit.completed`, `visit.complete_failed`
- Each audit includes: `visitId`, `clinicId`, `requestId`, `eventType`, `actorUserId`, `occurredAt`, `fromStatus`, `toStatus`, `error` (if failed)
- Clinic isolation: audit uses visit's clinicId, validated server-side

### Clinic isolation
- Every visit has a `clinicId`.
- On completion, server validates visit.clinicId matches actor's clinic scope.
- Audit records always use visit.clinicId from the document, never caller-supplied values.

---

## Appwrite usage patterns (follow existing helpers)

- Server-only helpers live in `app/lib/*`
  - Appwrite client creation
  - session parsing
  - authorization checks
- Two client modes:
  - **Session-bound** `Account` for per-user operations
  - **API-key-bound** `Databases` for admin queries
- Session cookie format:
  - `a_session_{APPWRITE_PROJECT_ID}`
- Never expose API keys to client bundles.

---

## Next.js conventions used in this repo

- Server actions live in `action.ts` inside route folders.
- Redirects use `next/navigation` and include query params for errors:
  - `/login?error=...`
- Auth and role checks happen at the **top** of server components or actions.
- Do not invent directories or files. Verify paths before referencing.

---

## Required environment variables

These are mandatory and server-only:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_CLINIC_USERS_COLLECTION_ID`
- `APPWRITE_PATIENTS_COLLECTION_ID`
- `APPWRITE_VISITS_COLLECTION_ID`
- `APPWRITE_VISIT_AUDITS_COLLECTION_ID`
- `WT_CLINIC_ID`

Use existing env access patterns (`getEnv()` style).  
Do not inline or default secrets.

---

## UI constraints (only when explicitly asked)

- Brand system is frozen.
- No creative redesigns.
- Match existing tokens, spacing, and typography exactly.
- UI changes must not weaken server enforcement.

---

## Explicitly unfinished (do not fake or hallucinate)

- Full platform-level role management
- Billing, pharmacy, consultation history UI

If asked to build these, clarify scope first.

---

## When you must ask before proceeding

- Changing collection names or schema fields
- Touching visit immutability rules
- Modifying role boundaries
- Introducing background jobs or cron behavior
