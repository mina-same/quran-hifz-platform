# Halqa/Track restructure — design

Date: 2026-09-05
Status: approved in chat (all decisions confirmed via AskUserQuestion), pending spec review

## Problem

The current model treats **حلقة (Halqa)** and **مسار (SpecialTrack)** as two parallel,
sibling "teaching contexts" — a student belongs to a Halqa (one teacher, fixed
weekly days/time, one masjid, at most one linked SpecialTrack), and
independently a SpecialTrack is a separate multi-teacher/multi-student
container mostly used for short-term programs (e.g. a Ramadan intensive).
Attendance, Evaluation, Homework, GroupHomework and LessonRecording each
carry **both** an optional `halqa` and an optional `specialTrack` field,
XOR-validated (`validators/context.ts`) — a record belongs to exactly one of
the two parallel contexts.

This does not match the platform's real organizational structure. A real
location (e.g. "جامع الأمير متعب بن عبدالعزيز") is what the user calls a
**حلقة** — a container that holds several **مسارات** (e.g. "مسار التميز",
"مسار الإتقان أ", "مسار الإتقان ب"), and it is the **مسار** that actually has
students, teachers, and a plan — closer to "an academic year containing
several classes/sections" than two independent, flat concepts.

## Confirmed decisions

1. **The `Halqa` model is eliminated entirely — no separate container
   entity.** Its role (a physical-location container that a مسار belongs
   to) is folded into the *existing* `Masjid` model instead of a new/kept
   `Halqa`. Nothing is ever recorded directly against a Masjid either —
   attendance/evaluation/homework/plans all live on the مسار.
2. **`Masjid` gains a `gender: 'male' | 'female'` field.** The Arabic UI
   label for a masjid is derived from this: **جامع** for `male`, **دار**
   for `female` — matching the real naming ("جامع الأمير متعب بن
   عبدالعزيز" for men, "دار خديجة" for women). `Masjid.name` stores the
   proper name only (e.g. "الأمير متعب بن عبدالعزيز"); the جامع/دار prefix
   is a display-time label derived from `gender`, not stored in the name
   string itself (avoids "جامع جامع الأمير..." duplication and keeps the
   name sortable/searchable without the prefix).
3. **مسار (currently modeled as `SpecialTrack`) becomes the real operating
   unit**, and gains a required `masjid` field (the parent pointer — this
   is the core inversion: today `Halqa.specialTrack` pointed down
   optionally from the container to a track; after this change
   `Track.masjid` points up from the track to its container, required).
   Everything a Halqa used to carry (teacher(s), students, a schedule, a
   plan) now lives on the مسار: it already has `teachers[]` and
   `enrolledStudents[]`, and `QuranPlan` can already target it — those
   parts barely change shape.
4. **The model/route/file identifier renames from `SpecialTrack` to
   `Track`** everywhere in code (this is a naming-only rename at the code
   level — the user-facing Arabic label was already "المسار" per prior
   work, never "المسار الاستثنائي"; only the internal identifiers catch up
   now). See "Renaming" below for the exact mapping.
5. **`SpecialTrack.location` (free-text string) is dropped entirely** —
   it's superseded by `track.masjid.location` once `masjid` exists.
6. **Student's primary group membership moves from `halqa` to `track`.**
   `Student.halqa` (required today) is replaced by `Student.track`
   (required, ref `Track`). `Student.masjid` (denormalized today) is
   dropped — masjid is now derived through `student → track → masjid`
   wherever needed, never stored redundantly on Student.
7. **Attendance / Evaluation / Homework / GroupHomework / LessonRecording
   collapse to a single required `track` field**, replacing today's
   `halqa?` / `specialTrack?` XOR pair. `validators/context.ts`'s XOR
   validation logic is no longer needed (single context, not two) — it is
   either deleted or reduced to a plain "track is present" check.
8. **`QuranPlan.targetType` drops `'halqa'` as an option.** A plan targets
   either `'track'` (the renamed `'specialTrack'` targetType) or
   `'students'` (explicit list) — never a whole Masjid, since a Masjid has
   no students of its own to target.
9. **No data migration.** Every document currently in the database is
   disposable seed/test data (confirmed by the user). The path is: change
   the schema and code to the new shape, then write fresh seed data that
   matches it. No script converts old documents to the new shape.

## Every reference to "Halqa" is removed, not just simplified

Because the model is eliminated rather than kept-and-shrunk, this touches
more than the renaming map below implies — every file in the earlier grep
sweep for `Halqa`/`halqa` (`Halqa.model.ts`, `halqa.controller.ts`,
`halqa.routes.ts`, `api/halqat.ts`, `AdminHalqat.tsx`, `TeacherHalqa.tsx`,
`HalqaCard.tsx`, `HalqaRow.tsx`, mobile `halqa-form.tsx`, `myhalqa.tsx`,
`useHalqat`/`useHalqa` hooks, etc.) needs its own pass in the relevant
phase's plan: most of these files are **deleted outright** (the dedicated
Halqa CRUD screens/routes/controller no longer have a reason to exist),
and their few genuinely-still-needed pieces (e.g. a teacher's "which
مسجد/مسار do I teach at" summary, formerly `myhalqa.tsx`) are rebuilt
against `Masjid`/`Track` instead. The implementation plan for each phase
must enumerate this list explicitly rather than treating it as covered by
the SpecialTrack→Track rename.

## Renaming map (SpecialTrack → Track)

| Old | New |
|---|---|
| `quran-hifz-server/src/models/SpecialTrack.model.ts` (`SpecialTrack`, `ISpecialTrack`) | `Track.model.ts` (`Track`, `ITrack`) |
| `quran-hifz-server/src/controllers/special-track.controller.ts` | `track.controller.ts` |
| `quran-hifz-server/src/routes/special-track.routes.ts` | `track.routes.ts` |
| API base path `/api/special-tracks` | `/api/tracks` |
| Mongoose collection `specialtracks` (implicit, from model name) | `tracks` |
| `quran-hifz/src/quran/api/special-tracks.ts` | `tracks.ts` (exports renamed: `SpecialTrack`→`Track` type, `useSpecialTracks`→`useTracks`, etc.) |
| `quran-hifz-mobile/lib/queries/specialTracks.ts` | `tracks.ts` (same export renames) |
| Every `specialTrack`-named prop/variable/field across all three apps (e.g. `plan.specialTrack`, `record.specialTrack`, `ContextPicker`'s `specialTrack` branch) | `track` |
| Page/route registry entries, file names like `AdminSpecialTracks.tsx`, `TeacherSpecialTracks.tsx`, `StudentSpecialTracks.tsx`, mobile `special_tracks.tsx`, `TrackDetail.tsx` (already named `Track...` in a couple of places — keep, just re-point internals) | `AdminTracks.tsx`, `TeacherTracks.tsx`, `StudentTracks.tsx`, mobile `tracks.tsx` (rename file), keep `TrackDetail.tsx`/`TeacherTrackDetail.tsx` names as-is (already correctly named) |

This is a mechanical, large-surface rename — every one of the 91 files
found by `grep -rl "SpecialTrack\|specialTrack\|special-track\|special_track"`
across the three apps needs at least a look; most need an actual edit.

## New model shapes (full field lists, not just deltas)

### Masjid (existing model, gains one field, absorbs Halqa's container role)
```ts
{
  name: string;
  location: string;
  gender: 'male' | 'female';   // NEW — drives جامع (male) / دار (female) display label
}
```
No `Halqa` model exists any more. A masjid is directly the container a
Track belongs to.

### Track (renamed from SpecialTrack)
```ts
{
  masjid: ObjectId;          // ref Masjid, required — NEW field, the core inversion
  title: string;
  type: string;
  status: 'active' | 'upcoming' | 'ended';
  startDate: Date;
  endDate: Date;
  daysPerWeek: string;
  timeSlot: string;
  isOnline: boolean;
  meetLink?: string;
  teachers: ObjectId[];       // ref Teacher — unchanged
  maxStudents: number;
  enrolledStudents: ObjectId[]; // ref Student — unchanged
  notes?: string;
}
```
Dropped from today's shape: `location` (superseded by `masjid.location`).

### Student
```ts
{
  name: string;
  nationalId?: string;
  path?: string;
  level?: number;
  plan?: string;
  track: ObjectId;            // ref Track, required — replaces `halqa`
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  totalPages: number;
  guardian: string;
  guardianPhone: string;
  lastMemorization: string;
  status: 'active' | 'inactive' | 'new';
  homeworkStatus: 'submitted' | 'pending' | 'late';
}
```
Dropped: `halqa` (replaced by `track`), `masjid` (now derived via `track.masjid`, never stored on Student directly).

### Attendance / Evaluation / Homework / GroupHomework / LessonRecording
Each keeps its own existing fields verbatim, except:
```ts
{ ...existing fields unchanged..., track: ObjectId /* ref Track, required */ }
```
Dropped: `halqa?`, `specialTrack?` (the XOR pair) — replaced by the single
required `track`.

### QuranPlan
```ts
targetType: 'track' | 'students';   // was 'halqa' | 'students' | 'specialTrack'
track?: ObjectId;                   // ref Track — renamed from `specialTrack`
// `halqa?: ObjectId` targeting field is removed entirely
```
Segments, schedule, days, ranges — everything from the same-day
multi-segment feature shipped this session — are completely unaffected;
they operate on the plan regardless of what it targets.

## Non-goals

- No change to the same-day حفظ/مراجعة segment feature shipped in the
  previous plan — it operates purely at the QuranPlan level and is
  orthogonal to this restructure.
- No change to `IndividualPlan`, `HifzEntry`, `Message`, `KPI`,
  `ParentStudent`, `User` models beyond updating any `halqa`/`specialTrack`
  references they hold to the new `track` shape.
- No attempt to preserve or migrate existing database documents.
- No third grouping layer beyond Masjid → Track (e.g. no "class within a
  track") — confirmed out of scope; a Track is the leaf teaching unit.

## Scope / phasing recommendation

Three roughly sequential phases, each independently plannable and
shippable, because the web and mobile UIs cannot be sensibly rewritten
until the server's new shape and API contract are final:

1. **Server** — delete `Halqa.model.ts`/`halqa.controller.ts`/
   `halqa.routes.ts` outright; update `Masjid.model.ts` (+gender) and its
   controller; rename `SpecialTrack`→`Track` (model, controller, routes,
   API path); update `Student`, `Attendance`, `Evaluation`, `Homework`,
   `GroupHomework`, `LessonRecording`, `QuranPlan`; remove/simplify
   `validators/context.ts`; update `lib/planStudents.ts`; rewrite the seed
   scripts (`seed.ts`, `wipe-all.ts`, `backfillPlans.ts`,
   `import-real-halaqat.ts`). Comfortably the largest single-phase file
   count once the Halqa-deletion sweep is included alongside the
   SpecialTrack→Track rename — enumerate exactly in the phase-1 plan.
2. **Web** (`quran-hifz`) — API layer (`api/*.ts`, including deleting
   `api/halqat.ts` and renaming `api/special-tracks.ts`→`api/tracks.ts`),
   delete `AdminHalqat.tsx`/`TeacherHalqa.tsx`, extend `AdminMasajid.tsx`
   with the gender field and (now) a richer per-masjid track listing,
   rename `AdminSpecialTracks.tsx`/`TeacherSpecialTracks.tsx`/
   `StudentSpecialTracks.tsx`, replace `ContextPicker.tsx`'s halqa/track
   XOR with a masjid→track drill-down (or track-only where no location
   filter is needed), every attendance/evaluation/homework/report/plan
   screen that reads `.halqa`/`.specialTrack`.
3. **Mobile** (`quran-hifz-mobile`) — mirror of phase 2: delete
   `halqa-form.tsx`/`HalqaCard.tsx`/`myhalqa.tsx`, rename
   `lib/queries/specialTracks.ts`→`tracks.ts`, `ContextCard.tsx`,
   admin/teacher/student screens, `EvaluationRoster.tsx`, `TrackDetail.tsx`.

Each phase gets its own implementation plan (`docs/superpowers/plans/`)
and its own subagent-driven-development execution pass, the same way the
same-day-segments feature was built. Phase 2 and 3 specs/plans should be
written only once phase 1's actual API shape is locked in (a design
detail decided mid-phase-1 — e.g. exact query-param names for filtering
tracks by masjid — should not be guessed twice).

## Testing / verification approach

- No automated test suite exists for the server or web apps in this repo
  (confirmed during the prior plan); mobile's only suite
  (`quranRange.test.ts`) is unaffected by this restructure entirely.
- Verification is: typecheck all three apps after each phase, and
  end-to-end manual/code-traced verification against a freshly reseeded
  database (phase 1's seed rewrite is itself the test fixture for phases
  2 and 3).
- After phase 1 ships, reseed with `wipe-all.ts` + the rewritten `seed.ts`
  before starting phase 2, so phase 2's UI work is built and checked
  against real (if fake) `Track`/`Masjid`-shaped data from day one.
