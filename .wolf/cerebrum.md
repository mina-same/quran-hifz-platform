# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-06-27

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** quran hifz platform
- `quran-hifz-mobile` has zero API integration — all data is static mock constants in `lib/data/*.ts`, no fetch/axios anywhere. Don't assume it calls the server.
- `quran-hifz` (web) is the only app wired to `quran-hifz-server`, via relative `/api` path in `src/lib/api.ts`.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->
- [2026-07-01] `quran-hifz-mobile/tsconfig.json` was silently broken — `"baseUrl": "."` without `"ignoreDeprecations": "6.0"` makes `typescript@6.0.3` abort with TS5101 before checking any file, so `tsc --noEmit` has never actually run on this project. Fixed by adding `"ignoreDeprecations": "6.0"`. This uncovered ~12 pre-existing files with real type errors unrelated to any session's work (missing `theme.cream`/`theme.greenPale` in `lib/theme.ts`, `Badge`/`StatBox` used with props their types don't declare, `number && {...}` conditional styles, a `StyleSheet.absoluteFillObject` typo, a bad `StatusBar` prop) — see bug-011 in `.wolf/buglog.json` for the exact file list. Always run `tsc --noEmit` once early in a mobile session to check this hasn't regressed, since the error is silent (exits 1 with no per-file output) and easy to mistake for "no errors."

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
- [2026-07-01] `quran-hifz/src/lib/api.ts` BASE now reads `VITE_API_URL` (defaults to `/api`), and the Vite dev proxy target in `vite.config.ts` reads `VITE_API_PROXY_TARGET` (defaults to `http://localhost:5001`), instead of a hardcoded proxy URL. Reason: the dev proxy never runs on Vercel — production needs the browser to hit the deployed backend's real URL, set via env var. Added `quran-hifz/.env.example` documenting both vars. `quran-hifz-server`'s `CLIENT_URL` env var (for CORS) already existed and needs no change — just set it to the deployed frontend's URL when the server is hosted.
- [2026-07-01] Wired `quran-hifz-mobile` to the real backend (foundation + read screens), mirroring `quran-hifz`'s proven pattern but adapted: `expo-secure-store` for the JWT (async, unlike web's sync `localStorage`) with no separate cached-user store (since `/auth/me` is re-validated on every boot anyway, caching buys nothing extra on RN); auth state lives in the existing `lib/store/portalStore.ts` Zustand store (extended) rather than a parallel React Context, and its `persist`/AsyncStorage middleware was dropped since portal/user/navGroups are now derived fresh from `/auth/me` each launch. Login screen (`app/index.tsx`) replaced the old 4-card portal picker entirely — routes by the server-returned role via Expo Router's `Stack.Protected` guard pattern (SDK 53+ recommended approach, replacing manual `useEffect`+`router.replace` redirects). `PORTALS[role].user` static display fields in `lib/constants/portals.ts` are now vestigial/unused (superseded by real auth display data) — a future cleanup could remove them along with the `user` field in the `PortalConfig` type, but that's untouched for now (surgical scope). Deferred to a follow-up pass: the 5 write screens (admin `register.tsx`, teacher `evaluate.tsx`/`recordlesson.tsx`/`grouphomework.tsx`, teacher `attendance.tsx`) and 3 screens with no backend model at all (`student/points.tsx`, `student/store.tsx` — gamification; `teacher/plans.tsx` — annual targets). Full plan at `.claude/plans/ticklish-gathering-neumann.md` (or wherever it landed for this machine).
