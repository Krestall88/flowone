# Production HACCP Control — Functional Specification

## 1. Purpose
The system supports HACCP/SanPiN operational discipline and audit readiness.

Key goals:
- Daily discipline: journals, documents, nonconformities are recorded consistently.
- Audit readiness: management and auditors can verify readiness quickly and transparently.

## 2. Roles
- `director`, `head`: manage Audit Mode, oversee readiness.
- `employee`, `journals_admin`: operational work (journals, tasks where permitted).
- `auditor`, `technologist`: read-only access for verification.

## 3. Modules

### 3.1 Journals
- Temperature journal: entries per equipment, day parts (morning/day/evening), signature by `signedAt`.
- Health journal: statuses per employee per day, signature by `signedAt`.
- Journals are audit-relevant: deviations and signatures are tracked.

### 3.2 Document workflow (Regulations)
- Documents have routes (tasks/steps) with actions (approve, acknowledge, etc.).
- Attachments are stored as files linked to documents.

### 3.3 Registry (Audit documents)
- Registry binds documents to audit object types (chemicals/raw/equipment/personnel), supplier, zone, expiry date.
- Statuses are derived from expiry date: active/expiring/expired/no-expiry.

### 3.4 Nonconformities
- Nonconformities track deviations with severity and open/closed lifecycle.
- Can be linked to documents.

### 3.5 Audit Log
- Records key actions with actor, entity, meta.
- Supports filtering by active audit session.

## 4. Audit Mode
Audit Mode is a special state (AuditSession) used during inspection/preparation.

Behavior:
- Only one active session at a time.
- Critical write operations are restricted and return HTTP 403 with `reason: audit_mode_lock`.
- Audit log automatically links actions to the active audit session.

## 5. Audit readiness UI
- Dashboard / Audit Checklist provides readiness indicators:
  - journals completion today and last 7 days
  - signatures
  - registry expiry risks
  - critical deviations
  - open/critical nonconformities
- Audit Package page provides a centralized hub for auditors.
