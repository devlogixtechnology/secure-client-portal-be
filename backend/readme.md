# Auth & RBAC — Work Log

**Scope:** Register/login endpoints, JWT issue + refresh, password hashing, RBAC middleware
(route-level role guards for Admin/Employee/Client), password reset flow stub.

**Reference doc:** Client Portal System SRS (Albroe Accountants), v1.0, Aug 28 2026 — IEEE 830 format.

---

## 1. Findings from the SRS review

The original code (register/login, JWT issue+refresh, bcrypt hashing, RBAC middleware, reset stub)
was checked against Section 5.1 (Non-Functional / Security Requirements) and the GRC control table
in Section 6.2. Gaps found:

| # | Gap | SRS reference |
|---|-----|----------------|
| 1 | Passwords hashed with bcrypt, not Argon2id | NFR-1.1.4 |
| 2 | Refresh token read from request body, not rotated | NFR-1.2.8 |
| 3 | No rate limiting / account lockout on login | NFR-1.1.3, NFR-1.1.11 |
| 4 | No audit logging anywhere, including Employee-creation domain checks | NFR-1.6.1–2, Section 3.9 "Audit Logging Rule" |
| 5 | Password reset didn't invalidate existing sessions | NFR-1.1.6 |
| 6 | `createClient` had no duplicate-email check | FR-1.9 |
| 7 | Client accounts activated immediately, even with no Employee assigned | FR-1.4 |

**Note on scope conflict:** the task brief specified bcrypt; the SRS specifies Argon2id (NFR-1.1.4,
stated as non-negotiable). Decision made: **Argon2id**, to match the SRS as the authoritative
document. Flagged to the team for the record.

---

## 2. What was changed

### Password hashing
- Swapped `bcryptjs` → `argon2` (`argon2id` variant) in `src/utils/password.ts`.
- Removed the old synchronous `comparePassword` method from the `User` schema (argon2 has no sync
  compare); controllers now use the standalone `comparePassword` util.

### JWT / refresh tokens
- Access tokens now carry `tokenVersion`, checked on every request in `auth.middleware.ts`.
  Bumping a user's `tokenVersion` invalidates all their live access tokens instantly.
- Refresh tokens are no longer accepted from the request body. They're issued as random bytes,
  hashed (SHA-256) and stored in a new `RefreshToken` collection; the raw value is set as an
  **HttpOnly, SameSite=Strict** cookie scoped to `/v1/auth` (`Secure` flag is environment-aware —
  off in development, on in production).
- `/auth/refresh` **rotates** the token on every use: the old one is marked `revoked`, a new one
  is issued. Reusing a revoked/expired token is rejected (401) and revokes all of that user's
  other refresh tokens as a precaution.

### Rate limiting & lockout
- `express-rate-limit` added on `/auth/login` and both `/auth/password-reset/*` routes (per-IP).
- Per-account lockout: 5 consecutive failed logins locks the account for 15 minutes (`423`),
  tracked via new `failedLoginAttempts` / `lockUntil` fields on `User`.

### Audit logging
- New `AuditLog` model + `writeAuditLog()` helper (`src/utils/audit.ts`). Failures inside it are
  caught and logged to console — a broken audit write never breaks the request.
- Wired into: login (success/failure/denied-locked), password reset (request/confirm),
  Employee creation (both the domain-rejection and duplicate-email-rejection paths, plus success),
  Client creation (success), Client assignment (success).
- **Known gap:** `createClient`'s duplicate-email rejection path does not currently call
  `writeAuditLog` — only the success path does. Not yet fixed.

### Password reset → session kill
- On confirmed reset: `tokenVersion` is incremented (kills all live access tokens) and every
  `RefreshToken` for that user is marked `revoked` (kills all live sessions).

### Account creation fixes
- `createClient` now checks for an existing email before creating the account (previously only
  the Employee path checked this) — matches FR-1.9 ("regardless of role").
- `createClient` now sets `status: INACTIVE` when no `assignedEmployeeId` is given, matching
  FR-1.4 (credentials withheld until an Employee is assigned). `assignClient` flips the status to
  `ACTIVE` at the point of assignment.

### Infra / environment
- Added `cookie-parser` (required to read the refresh-token cookie) and wired into `server.ts`.
- `.env` created from `.env.example`; `JWT_SECRET` / `REFRESH_TOKEN_SECRET` populated with real
  random values (`crypto.randomBytes(32).toString('hex')`).

---

## 3. Files touched

**New:**
- `src/models/RefreshToken.ts`
- `src/models/AuditLog.ts`
- `src/utils/audit.ts`
- `src/scripts/checkUsers.ts` (debug/testing utility)
- `src/scripts/checkAuditLogs.ts` (debug/testing utility)
- `src/scripts/resetAdminPassword.ts` (debug/testing utility — also clears lockout fields)
- `src/scripts/getResetToken.ts` (test-only — bypasses the SMTP stub to retrieve a raw reset token)

**Modified:**
- `src/models/User.ts` — added `tokenVersion`, `failedLoginAttempts`, `lockUntil`; removed sync
  `comparePassword` method; removed `bcryptjs` import.
- `src/utils/password.ts` — bcrypt → argon2id.
- `src/controllers/auth.controller.ts` — login lockout, refresh rotation + cookie handling,
  reset confirm now bumps `tokenVersion` and revokes refresh tokens, audit logging throughout.
- `src/middleware/auth.middleware.ts` — checks `tokenVersion` on every authenticated request.
- `src/controllers/user.controller.ts` — duplicate-email check + inactive-until-assigned logic
  in `createClient`, audit logging on Employee/Client creation and assignment.
- `src/routes/auth.routes.ts` — rate limiters added to login and password-reset routes.
- `src/server.ts` — `cookie-parser` wired in.

**Dependencies:** removed `bcryptjs`; added `argon2`, `cookie-parser`, `express-rate-limit`
(+ `@types/cookie-parser`).

---

## 4. Testing — results so far

Manual testing via PowerShell `Invoke-WebRequest` against a local server
(`http://localhost:3000`), using seeded users reset to known Argon2id-hashed passwords.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Login with correct credentials | `200`, JWT in body, `refresh_token` set as HttpOnly cookie | ✅ Pass |
| 2 | Refresh token rotation | New token issued on `/refresh`; reusing the old (now-revoked) token → `401` | ✅ Pass |
| 3 | Account lockout | 5 wrong passwords → `401` each; 6th attempt (even with correct password) → `423` | ✅ Pass |
| 4 | Employee domain restriction | Creating an Employee with a non-`@albroeaccountants.com` email → `422` | ✅ Pass |
| 5 | Duplicate email rejection | Re-using an existing email for both Employee and Client creation → `409` (both) | ✅ Pass |
| 6 | Audit log entries | Login attempts and Employee-creation attempts (success + both denial types) appear in `AuditLog`, in the correct order, with correct outcomes | ✅ Pass — verified 11 entries matched the test sequence exactly |
| 7 | Password reset kills sessions | Access token issued before reset should be rejected (`401`) on any authenticated request made *after* the reset completes | ⏳ In progress |

### Test 7 — steps (in progress)
1. Log in, capture access token (`$oldAdminToken`).
2. Confirm that token currently works against a protected route (sanity check — expect non-401).
3. Call `/auth/password-reset/request`.
4. Retrieve a valid raw reset token directly from the DB (`getResetToken.ts` — test-only, bypasses
   the SMTP stub).
5. Call `/auth/password-reset/confirm` with that token + a new password.
6. Retry the **old** access token from step 1 against the same protected route → expect `401`,
   proving `tokenVersion` invalidation works even though the JWT hasn't technically expired.

---

## 5. Known gaps / not yet done

- **MFA** — schema fields exist (`mfaEnabled`, `mfaSecret`, `recoveryCodes`) but nothing enforces
  or verifies it yet. SRS requires it mandatory for Admin (NFR-1.1.7).
- **HIBP breached-password check** — not implemented (NFR-1.1.2).
- **Lockout backoff is flat (15 min), not exponential** — SRS says "exponential backoff"
  (NFR-1.1.3); current implementation is a single fixed window. Flagged, not yet addressed.
- **`createClient` duplicate-email rejection isn't audit-logged** — only the success path is.
- **Role enum mismatch** — code has four roles (`SUPER_ADMIN`, `ADMIN`, `EMPLOYEE`, `CLIENT`);
  SRS states "exactly three user roles" (FR-1.1). Not yet reconciled — worth confirming with
  whoever owns the SRS.
- **CSV/JSON/OCSF audit log export** — not implemented (NFR-1.6.6).
- **Rate-limit values are hardcoded** in `rateLimit.middleware.ts`, even though `.env.example`
  already defines `AUTH_RATE_LIMIT_MAX_REQUESTS` / `AUTH_RATE_LIMIT_WINDOW_MS` for this purpose —
  should be read from env instead.

---

## 6. Environment setup notes

- `.env` must exist (copy from `.env.example`) with real values for `JWT_SECRET` and
  `REFRESH_TOKEN_SECRET` — generate with:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Seeded test users (all passwords originally bcrypt-hashed, since re-hashed to Argon2id via
  `resetAdminPassword.ts` for testing):
  - `admin@albroeaccountants.com` — SUPER_ADMIN
  - `admin2@albroeaccountants.com` — ADMIN
  - `employee@albroeaccountants.com` — EMPLOYEE
  - `client@example.com` — CLIENT
- On Windows PowerShell, use `Invoke-WebRequest` rather than `curl` (aliased to
  `Invoke-WebRequest` with different flags) — `curl.exe` also works if invoked explicitly.