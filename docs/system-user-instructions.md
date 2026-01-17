# Production HACCP Control — User Instructions

## 1. Daily work (production)

### 1.1 Temperature journal
Path: `/journals/temperature`
- Select date (typically today).
- Enter temperatures per equipment (morning/day/evening).
- Sign the journal (signature time is stored as `signedAt`).
- Export PDF if needed.

### 1.2 Health journal
Path: `/journals/health`
- Select date (typically today).
- Mark status for each employee.
- Add notes if needed.
- Sign the journal.
- Export PDF if needed.

### 1.3 Nonconformities
Path: `/nonconformities`
- Create a nonconformity when an issue is detected.
- Set severity, add details, link to a document if needed.
- Close when resolved.

### 1.4 Documents / regulations
Path: `/documents`
- Create and route documents for approval/acknowledgement.
- Track tasks in `/workflow`.

### 1.5 Registry
Path: `/registry`
- Add documents into registry with object type, supplier, zone, expiry.
- Use filters to find expiring/expired items quickly.

## 2. Audit preparation and inspection

### 2.1 Audit Checklist
Path: `/audit/checklist`
- Review readiness metrics: journals completion, signatures, expiry risks, deviations, nonconformities.

### 2.2 Audit Package
Path: `/audit/package`
- Open quick links to registry/package.
- Download journals PDF.
- Review open nonconformities.
- Open audit log for the active session.

### 2.3 Audit Mode (start/stop)
- Directors/heads can start Audit Mode from the dashboard.
- While active, restricted actions are blocked (HTTP 403 `audit_mode_lock`).
- Stop Audit Mode after the inspection/preparation is completed.
