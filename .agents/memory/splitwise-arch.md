---
name: SplitWise auth and data architecture
description: Key decisions for JWT auth, data storage, Express+Drizzle typing, and mobile API integration
---

## Auth
- JWT via `jsonwebtoken` + `bcryptjs`; secret from `SESSION_SECRET` env var
- Token stored in AsyncStorage (not SecureStore); expires in 30 days
- `requireAuth` middleware in `artifacts/api-server/src/middleware/auth.ts`
- Token restored on app boot via `GET /auth/me`

## Data storage
- Groups and bills → PostgreSQL (Drizzle ORM)
- Group members stored as JSONB array in `groups.members`; `group_members` junction for fast lookup
- Bill items stored as JSONB in `bills.items` (avoids over-normalization for MVP)
- Personal expenses → AsyncStorage only (device-local)

## Express + Drizzle typing gotcha
`req.params.*` is typed `string | string[]` in Express, but Drizzle `eq()` only accepts `string`.
**Always cast**: `const id = req.params.id as string`
**Why:** TypeScript sees `req.params` as `ParamsDictionary` which allows array values.

## Mobile API base URL
`https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
Set by the `dev` script via `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN`

## Invite codes
8-char uppercase hex; one per group (reused); no expiry for MVP
Flow: POST /groups/:id/invite → code; POST /invites/:code/join → joins group + updates JSONB + inserts group_members row
