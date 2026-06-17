# SplitWise Expense Tracker

A mobile expense-tracking app for splitting bills with friends, built with Expo + React Native and a Node.js/PostgreSQL backend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 → 8080 internally)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo ~54, React Native 0.81, expo-router ~6
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs, token stored in AsyncStorage
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/index.ts` — DB schema (users, groups, group_members, bills, invite_codes)
- `artifacts/api-server/src/routes/` — API routes (auth, users, groups, invites)
- `artifacts/api-server/src/middleware/auth.ts` — JWT middleware (`requireAuth`, `signToken`)
- `artifacts/mobile/context/AuthContext.tsx` — JWT auth state (login, register, logout, apiRequest)
- `artifacts/mobile/context/AppContext.tsx` — groups/bills API calls; personal expenses in AsyncStorage
- `artifacts/mobile/app/auth.tsx` — Login/Register screen
- `artifacts/mobile/app/create-group.tsx` — Group creation with real user search
- `artifacts/mobile/app/join-group.tsx` — Join by invite code
- `artifacts/mobile/app/group/[id].tsx` — Group detail (bills, balances, invite share)
- `artifacts/mobile/app/add-bill.tsx` — Add bill with per-item splitting

## Architecture decisions

- JWT tokens stored in AsyncStorage (not SecureStore) for simplicity; can upgrade later.
- Groups and bills stored in PostgreSQL; personal expenses stay in AsyncStorage (device-only).
- Group members stored as JSONB array in `groups` table; `group_members` junction table for fast lookup.
- Bills items stored as JSONB array in `bills` table (avoids a fourth normalized table for MVP).
- Invite codes are 8-char hex, stored indefinitely (one per group, reused).
- `add-group-expense.tsx` is a legacy redirect to `add-bill.tsx`.

## Product

- User auth: register / login / logout with JWT
- Groups: create with member search by username, view/delete
- Bills: per-group bills with multiple line items, each item split among selected members
- Invites: share 8-char code via native Share sheet; join via code
- Personal expenses: local device-only expense tracking
- Overview screen shows net balance and recent activity

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- API base URL in mobile is `https://${EXPO_PUBLIC_DOMAIN}/api` (set by the `dev` script from `REPLIT_DEV_DOMAIN`)
- Run `pnpm --filter @workspace/db run push` after any schema changes in `lib/db/src/schema/index.ts`
- `pnpm --filter @workspace/api-server run dev` must be restarted after route changes (it builds first)
- `group_members` table has no unique constraint — `onConflictDoNothing()` is used when adding members

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
