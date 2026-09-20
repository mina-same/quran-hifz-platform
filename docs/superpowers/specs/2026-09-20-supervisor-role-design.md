# Supervisor Role — Design

## Purpose

Add a new `supervisor` user role, created only by an admin, that can **view** tracks,
evaluations/grades, attendance, students, masajid, teachers, KPIs, and reports —
mirroring the admin's read-side of the platform — but cannot create, edit, or delete
anything. Each supervisor account is permanently scoped to one gender (بنين/بنات),
chosen by the admin at creation time, on both web (`quran-hifz`) and mobile
(`quran-hifz-mobile`).

## Out of scope

- Supervisors managing other supervisors.
- Supervisor ability to switch their own gender scope (it's fixed at creation).
- Any new report content beyond what admin already sees.
- Parent-portal-style features (messaging, homework review, etc.) — supervisor is
  observation-only over admin's existing views.

## 1. Data model (`quran-hifz-server`)

- `User.model.ts`: extend `UserRole` to
  `'admin' | 'teacher' | 'student' | 'parent' | 'supervisor'`.
- Add `supervisorGender?: 'male' | 'female'` to the `User` schema — required when
  `role === 'supervisor'`, absent/ignored otherwise. Set once at creation, never
  editable by the supervisor (no self-service profile change for this field).

## 2. Auth & permission enforcement

- **Route-level**: `authorize(...)` calls for every mutating route (create/update/
  delete across students, teachers, tracks, masajid, attendance, evaluations,
  homework, group-homework, KPIs, parents, users) must NOT include `'supervisor'`.
  Read routes (`GET` list/detail, stats/reports) DO include `'supervisor'`.
- **Gender enforcement (server-side, not just UI filtering)**: today
  `matchesGenderScope` only filters client-side and `stats.controller.ts` accepts an
  optional `?gender=` query param — neither is sufficient for a supervisor, whose
  restriction must be enforced regardless of what the client sends or omits.
  Add a helper, e.g. `resolveGenderFilter(req)` in a shared lib, used by every
  controller that lists/aggregates students, teachers, tracks, masajid, attendance,
  evaluations, and stats:
  - If `req.user.role === 'supervisor'`, force the filter to
    `req.user.supervisorGender`, overriding/ignoring any client-supplied `gender`
    query param.
  - Otherwise, behavior is unchanged (admin's existing optional `?gender=` param,
    or no filter).
  - Filtering joins through `Masjid.gender` exactly as the existing
    `teacherIdsInScope`/`matchesGenderScope` logic already does — this helper
    formalizes that join server-side instead of leaving it to the client.
- Controllers to touch: `student.controller.ts`, `teacher.controller.ts`,
  `track.controller.ts`, `attendance.controller.ts`, `evaluation.controller.ts`,
  `masjid.controller.ts` (or equivalent), `kpi.controller.ts`, `stats.controller.ts`.

## 3. Admin creates supervisor accounts

- New controller `createSupervisor` (mirrors `createParent` in
  `admin.controller.ts:45-59`): body `{name, email, password, gender}`, creates a
  plain `User` with `role: 'supervisor'`, `supervisorGender: gender`. Response
  includes one-time `credentials: {email, password}` like the parent flow.
- New admin-only route, e.g. `POST /api/admin/supervisors` (+ `GET` list, no
  update/delete needed beyond deactivation — reuse `isActive` toggle already on
  `User` if a "disable supervisor" action is wanted; deletion is out of scope
  unless trivial to add alongside parents' existing delete pattern).

## 4. Web (`quran-hifz`)

- `PortalContext.tsx`: derive `readOnly = role === 'supervisor'` alongside the
  existing `genderScope`. When `role === 'supervisor'`, `genderScope` is
  initialized from `user.supervisorGender` and the scope-switch control is hidden/
  disabled (no toggle UI for supervisors).
- `config/portals.ts`: add a `supervisor` `PortalKey` whose `nav` mirrors admin's
  nav groups (dashboard, students, teachers, masajid, tracks, reports, kpis) —
  reusing the **same page components** admin uses, not new files.
- Each reused admin page (`AdminStudents.tsx`, `AdminTeachers.tsx`,
  `AdminMasajid.tsx`, `AdminTracks.tsx`, `AdminReports.tsx`, `AdminDashboard.tsx`,
  KPIs page) reads `readOnly` from `usePortal()` and, when true, hides/disables
  Add/Edit/Delete buttons and any inline forms. `AdminReports.tsx` needs no change
  (already view-only).
- New `AdminSupervisors.tsx` page (admin-only nav item, not shown to supervisors)
  for creating supervisor accounts, following `AdminParents.tsx`'s list+create+
  `CredentialsDialog` pattern, with a gender `<select>` in the create form.
- Login/portal-resolution: after login, a `supervisor` role routes into the new
  `supervisor` portal key exactly like other roles resolve today.

## 5. Mobile (`quran-hifz-mobile`)

- `lib/store/portalStore.ts`: same `readOnly` derivation; `genderScope` locked to
  `user.supervisorGender` for supervisors, no scope-switch UI.
- `lib/constants/portals.ts`: add `supervisor` to `PORTALS` (nav mirroring admin's)
  and to `PORTAL_ROUTES` (initial route reusing an admin screen path).
- Reuse existing `app/(portal)/admin/*.tsx` screens for supervisor rather than a
  parallel `app/(portal)/supervisor/` tree — same `readOnly` gate hides
  create/edit/delete affordances (add buttons, swipe-to-delete, edit routes).
  `app/(portal)/_layout.tsx`'s role→pathname enforcement gets a `supervisor` case
  routing into the admin path group.
- New `admin/supervisors.tsx` screen (admin-only) mirroring `admin/parents.tsx`'s
  create-account flow, with a gender picker.

## 6. Testing / verification

- Manual, via the running dev server + Playwright (web) and Expo web (mobile),
  logging in as a male-scoped and a female-scoped supervisor:
  - Confirm each only ever *receives* (via network inspection, not just UI) their
    own gender's students/teachers/tracks/masajid/attendance/evaluations/stats.
  - Confirm every mutating action (add/edit/delete student, teacher, track,
    masjid, KPI, attendance record, evaluation) is rejected server-side (403), not
    merely hidden — attempt a direct API call as a supervisor for at least one
    mutating endpoint per resource type.
  - Confirm the gender-scope toggle is absent/disabled for supervisors on both
    platforms, and that admin's own toggle and CRUD abilities are unaffected.
  - Confirm admin can create both a male- and female-scoped supervisor and see
    one-time credentials.

## Backend contract (implemented — build the frontends against this exactly)

- `User.role` now includes `'supervisor'`. `User.supervisorGender?: 'male' | 'female'` is
  set only for that role.
- Login (`POST /api/auth/login`) and `GET /api/auth/me` responses now include
  `supervisorGender` on the `user` object (undefined for non-supervisors). The JWT
  itself also carries it, so every authenticated request already carries the
  supervisor's fixed gender server-side — the frontend does not need to send it.
- New admin-only routes (`quran-hifz-server/src/routes/admin.routes.ts`, under the
  existing `authorize('admin')` router):
  - `GET /api/admin/supervisors` → `{success, count, data: [{_id, name, email, isActive, gender}]}`
  - `POST /api/admin/supervisors` body `{name, email, password, gender: 'male'|'female'}`
    → `{success, data: {_id, name, email, gender}, credentials: {email, password}}`
    (same one-time-credentials shape as `POST /api/admin/parents`)
  - `DELETE /api/admin/supervisors/:supervisorId` → `{success, message}`
- Every existing read endpoint (students, teachers, tracks, masajid, attendance,
  evaluations, dashboard stats) now silently restricts its results to the
  supervisor's `supervisorGender` server-side, regardless of any `gender`/`track`/
  `masjid` query param the client sends. **The frontend does not need to pass a
  gender filter for a supervisor and cannot override it** — it should simply treat
  the API as if it only ever contains that supervisor's own gender's data, and hide
  the gender-scope switcher entirely for this role (there's nothing to switch).
- No mutating route (`POST`/`PUT`/`PATCH`/`DELETE`) anywhere in the API includes
  `'supervisor'` in its `authorize(...)` list, so every write attempt already 403s
  server-side. The frontend still must hide the corresponding buttons/forms for UX,
  but this is not the security boundary — the backend is.
- Chosen final page set (per "full admin sidebar, read-only" but excluding
  pages that are pure-create forms with no view content): supervisor sees
  **dashboard, students, teachers, parents (view-only), masajid, tracks, kpis
  (view-only), reports** — but NOT "تسجيل طالب جديد" (register), since that page
  has no read-only form of itself. حضور/غياب and درجات الأداء are already covered
  by the existing Reports dashboard (attendance + evaluation analytics), which
  admin also uses instead of a separate raw attendance/evaluation list page (none
  exists for admin either).

## Open risks / notes

- Teachers have no direct masjid link today (`teacherIdsInScope` derives it via
  tracks); the new server-side gender helper must reuse that same derivation for
  teacher-list filtering rather than inventing a second method.
- `evaluation.controller.ts` and `attendance.controller.ts` currently scope by
  `halqa`/`track`/`student` params, not by masjid directly — the gender filter
  there means constraining the *set of tracks/students* a supervisor's query is
  allowed to touch, and rejecting (403 or empty result) any explicit id outside
  that set, not just filtering after the fact.
