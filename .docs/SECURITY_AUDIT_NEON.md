# Security Audit: Neon Database & Multi-User Readiness

**Date:** 2026-01-10
**Status:** ⚠️ High Priority Remediation Required
**Auditor:** Antigravity

## System Overview
- **Frontend:** Single Page App (Vite/React) using Firebase Auth.
- **Backend:** Hono server on Vercel Functions (`/api/bridge`).
- **Database:** Neon Serverless Postgres via Drizzle ORM.
- **Auth:** Firebase Authentication (Bearer Token).

## 1. Authentication & Authorization
**Status:** ⚠️ Mixed (Core Secured / New Features Exposed)

### Mechanisms
- **Token Verification:** Implemented in `authMiddleware`. Uses `jose` library to verify Firebase ID token signatures, issuer, and composition. **(Good)**
- **User Sync:** Atomic upsert in middleware ensures user record exists in `users` table before request proceeds. **(Good)**

### Findings
- **[CRITICAL] Unprotected AI Routes:**
  The following routes are defined *before* the global authentication middleware in `server/src/api.ts`, making them publicly accessible without login:
  - `POST /api/ai/test`
  - `GET /api/ai/test-rag`
  - `GET /api/ai/test-graph`
  - **Risk:** Unrestricted access to AI APIs can lead to severe cost spikes (Data/Token theft).
- **Core Routes Secured:**
  - `GET /api/projects` and sub-routes are correctly protected by `app.use('/api/*', authMiddleware)`.
  - Application-level ownership checks (`requireProjectOwnership`) are consistently applied for specific resources.

## 2. Database Security (Neon + Drizzle)
**Status:** ✅ Acceptable for Current Scale

### Findings
- **Connection:** Uses `neon-http` driver on Vercel to prevent connection pooling issues.
- **Credentials:** `DATABASE_URL` is used. Logic exists to mask password in logs. **(Good)**
- **Schema & Isolation:**
  - `users` table uses Firebase UID as Primary Key.
  - `projects` table has mandatory `userId` Foreign Key.
  - **Start Strategy:** Application-level isolation. Every query to `projects` includes `.where(eq(projects.userId, user.id))` or checks ownership via helper.
  - **Row Level Security (RLS):** Not enabled at database level. Security relies entirely on the Hono application code. If `api.ts` has a bug, data could leak.
    - *Recommendation (Long-term):* Enable Postgres RLS policies for defense-in-depth, but current application-level checks are sufficient for "Lite" version.

## 3. Data Leaks & Logging
**Status:** ⚠️ Minor Warnings

### Findings
- **Logging:** Passwords are masked in DB connection logs.
- **Diagnostic Middleware:** A diagnostic middleware (lines 64-76) logs header types.
- **AI Agent Logging:** `POST /api/ai/test-agent` logs `userInput` and `storyContext` to console.
  - *Recommendation:* Remove detailed content logging in production to preserve user privacy.

## 4. Architecture & Bridges
- **Vercel Bridge:** `api/bridge.ts` correctly adapts Vercel requests to Hono.
- **Static Assets:** `site.webmanifest` 401 error likely user-environment specific or false positive. No strict blockage found in configuration.

## Action Plan (Remediation)
1.  **MUST:** Move AI routes behind `authMiddleware` immediately.
2.  **SHOULD:** Remove/Sanitize console logs of user content (`storyContext`).
3.  **NICE:** Add explicit test for multi-user isolation (User A cannot see User B's project).
