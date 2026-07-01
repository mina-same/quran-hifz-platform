# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-07-01T13:49:38.471Z
> Files: 346 tracked | Anatomy hits: 0 | Misses: 0

## ../../../../Users/macbook/.claude/plans/

- `joyful-growing-duckling.md` — Plan: Connect quran-hifz frontend → quran-hifz-server (~2150 tok)
- `ticklish-gathering-neumann.md` — Plan: Wire `quran-hifz-mobile` to the real backend (foundation + read screens) (~2460 tok)

## ./

- `.DS_Store` (~1640 tok)
- `.gitignore` — Git ignore rules (~131 tok)
- `CLAUDE.md` — OpenWolf (~57 tok)
- `quran hifz platform.html` — جمعية تحفيظ القرآن الكريم بالعماير (~59157 tok)
- `quran_hifz_v2 (7).html` — جمعية تحفيظ القرآن الكريم بالعماير (~81255 tok)

## .claude/

- `settings.json` (~441 tok)
- `settings.local.json` — Declares rn (~1852 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## .claude/skills/caveman-commit/

- `README.md` — Project documentation (~305 tok)
- `SKILL.md` — Rules (~642 tok)

## .claude/skills/caveman-compress/

- `README.md` — Project documentation (~1250 tok)
- `SECURITY.md` — Security (~389 tok)
- `SKILL.md` — Caveman Compress (~1132 tok)

## .claude/skills/caveman-compress/scripts/

- `__init__.py` — Caveman compress scripts. (~64 tok)
- `__main__.py` (~9 tok)
- `benchmark.py` — Support both direct execution and module import (~689 tok)
- `cli.py` — print_usage, main (~594 tok)
- `compress.py` — URL configuration (~3746 tok)
- `detect.py` — Detect whether a file is natural language (compressible) or code/config (skip). (~1161 tok)
- `validate.py` — ValidationResult: add_error, add_warning, read_file, extract_headings + 12 more (~1643 tok)

## .claude/skills/caveman-help/

- `README.md` — Project documentation (~243 tok)
- `SKILL.md` — Caveman Help (~572 tok)

## .claude/skills/caveman-review/

- `README.md` — Project documentation (~297 tok)
- `SKILL.md` — Rules (~674 tok)

## .claude/skills/caveman-stats/

- `README.md` — Project documentation (~232 tok)
- `SKILL.md` (~151 tok)

## .claude/skills/caveman/

- `README.md` — Project documentation (~470 tok)
- `SKILL.md` — Persistence (~1212 tok)

## .claude/skills/ui-ux-pro-max/

- `SKILL.md` — UI/UX Pro Max - Design Intelligence (~11172 tok)

## quran-hifz-mobile/

- `.gitignore` — Git ignore rules (~118 tok)
- `AGENTS.md` — Expo HAS CHANGED (~30 tok)
- `app.json` (~318 tok)
- `babel.config.js` — Babel configuration (~53 tok)
- `CLAUDE.md` (~3 tok)
- `global.css` — Styles: 3 rules (~17 tok)
- `LICENSE` — Project license (~295 tok)
- `metro.config.js` — Declares config (~66 tok)
- `nativewind-env.d.ts` — / <reference types="nativewind/types" /> (~46 tok)
- `package-lock.json` — npm lock file (~62494 tok)
- `package.json` — Node.js package manifest (~436 tok)
- `tailwind.config.js` — Tailwind CSS configuration (~214 tok)
- `tsconfig.json` — TypeScript configuration (~87 tok)

## quran-hifz-mobile/.claude/

- `settings.json` (~21 tok)

## quran-hifz-mobile/.expo/

- `devices.json` (~6 tok)
- `README.md` — Project documentation (~223 tok)

## quran-hifz-mobile/.expo/dev/logs/

- `export.log` (~2192 tok)
- `start.log` (~129275 tok)

## quran-hifz-mobile/app/

- `_layout.tsx` — queryClient (~639 tok)
- `index.tsx` — getHalqaName — renders form, modal (~2409 tok)

## quran-hifz-mobile/app/(portal)/

- `_layout.tsx` — PortalLayout — renders modal (~270 tok)

## quran-hifz-mobile/app/(portal)/admin/

- `_layout.tsx` — AdminTabLayout (~514 tok)
- `dashboard.tsx` — kpiVariant — renders table (~1087 tok)
- `halqat.tsx` — AdminHalqat (~211 tok)
- `kpis.tsx` — ratingVariant — renders table (~711 tok)
- `masajid.tsx` — AdminMasajid (~270 tok)
- `register.tsx` — PATHS — renders form — uses useState (~1788 tok)
- `reports.tsx` — EXPORT_BTNS (~1073 tok)
- `special_tracks.tsx` — INITIAL (~1589 tok)
- `students.tsx` — AdminStudents — renders table (~852 tok)
- `teachers.tsx` — ratingVariant — renders table (~636 tok)

## quran-hifz-mobile/app/(portal)/parent/

- `_layout.tsx` — ParentTabLayout (~445 tok)
- `attendance.tsx` — STATS (~648 tok)
- `dashboard.tsx` — CHILD (~877 tok)
- `homework_view.tsx` — GROUP_HWS (~617 tok)
- `messages.tsx` — MSGS (~670 tok)
- `recordings.tsx` — ROWS (~634 tok)
- `timeline.tsx` — TL (~894 tok)

## quran-hifz-mobile/app/(portal)/student/

- `_layout.tsx` — StudentTabLayout (~475 tok)
- `attendance.tsx` — StudentAttendance — renders table (~722 tok)
- `dashboard.tsx` — STATS (~1468 tok)
- `homework.tsx` — StudentHomework (~638 tok)
- `messages.tsx` — StudentMessages (~912 tok)
- `myhifz.tsx` — StudentHifz — renders table (~1106 tok)
- `points.tsx` — MY_PTS (~984 tok)
- `schedule.tsx` — DAYS (~1534 tok)
- `store.tsx` — MY_PTS (~1012 tok)

## quran-hifz-mobile/app/(portal)/teacher/

- `_layout.tsx` — TeacherTabLayout (~551 tok)
- `attendance.tsx` — OPTIONS — uses useState (~1267 tok)
- `dashboard.tsx` — STATS — renders table (~1104 tok)
- `evaluate.tsx` — STUDENTS (~1127 tok)
- `grouphomework.tsx` — INITIAL (~1434 tok)
- `homework.tsx` — TeacherHomework — renders table (~647 tok)
- `myhalqa.tsx` — TeacherHalqa (~358 tok)
- `plans.tsx` — statusVariant — renders table (~695 tok)
- `recordlesson.tsx` — TeacherRecordLesson (~1298 tok)
- `reports.tsx` — TeacherReports (~708 tok)
- `students.tsx` — hwVariant — renders table (~726 tok)

## quran-hifz-mobile/components/domain/

- `AudioRecorder.tsx` — AudioRecorder — uses useState, useEffect (~1336 tok)
- `HalqaCard.tsx` — HalqaCard (~746 tok)
- `MasjidAccordion.tsx` — MasjidAccordion — uses useState (~1036 tok)

## quran-hifz-mobile/components/forms/

- `FormGroup.tsx` — FormGroup (~249 tok)
- `FormInput.tsx` — FormInput (~230 tok)
- `FormSelect.tsx` — FormSelect — renders modal — uses useState (~974 tok)
- `FormTextarea.tsx` — FormTextarea (~266 tok)

## quran-hifz-mobile/components/layout/

- `DrawerContent.tsx` — DrawerContent — uses useRouter (~1139 tok)
- `NavItem.tsx` — ICON_MAP — renders chart — uses useRouter (~732 tok)

## quran-hifz-mobile/components/ui/

- `Alert.tsx` — COLORS (~403 tok)
- `AyahBar.tsx` — AyahBar (~234 tok)
- `Badge.tsx` — VARIANT_STYLES (~294 tok)
- `Button.tsx` — VARIANTS (~564 tok)
- `Card.tsx` — Card (~201 tok)
- `CardHeader.tsx` — CardHeader (~277 tok)
- `DataTable.tsx` — DataTable (~724 tok)
- `ProgressBar.tsx` — ProgressBar (~380 tok)
- `StatBox.tsx` — StatBox (~376 tok)
- `StatsRow.tsx` — StatsRow (~150 tok)

## quran-hifz-mobile/lib/

- `api.ts` — Exports ApiError, get, post, put + 2 more (~451 tok)
- `auth-storage.ts` — Exports getToken, setToken, clearToken (~229 tok)
- `theme.ts` — Exports theme, Theme (~279 tok)

## quran-hifz-mobile/lib/constants/

- `portals.ts` — Exports PORTALS, PORTAL_ROUTES (~1172 tok)

## quran-hifz-mobile/lib/data/

- `halqat.ts` — Exports HALQAT, MASAJID, KPIS (~704 tok)
- `students.ts` — Exports STUDENTS, MY_HIFZ_PLAN, MY_ATTENDANCE, MY_MESSAGES (~1142 tok)
- `teachers.ts` — Exports TEACHERS, HOMEWORK_REVIEWS, INDIVIDUAL_PLANS (~707 tok)

## quran-hifz-mobile/lib/queries/

- `attendance.ts` — Exports AttendanceRecord, AttendanceFilters, useAttendance (~325 tok)
- `halqat.ts` — Exports Halqa, HalqaFilters, useHalqat, useHalqa (~366 tok)
- `hifz.ts` — Exports HifzEntry, useHifz (~155 tok)
- `homework.ts` — Exports Homework, HomeworkFilters, useHomework (~368 tok)
- `kpis.ts` — Exports KPI, useKpis (~132 tok)
- `masajid.ts` — Exports Masjid, useMasajid, useMasjid (~189 tok)
- `messages.ts` — Exports Message, useMessages (~154 tok)
- `parent.ts` — Exports ParentChild, ChildHifzEntry, ChildAttendanceRecord, ChildHomework + 9 more (~896 tok)
- `specialTracks.ts` — Exports SpecialTrack, useSpecialTracks (~207 tok)
- `stats.ts` — Exports DashboardStats, useStats (~165 tok)
- `students.ts` — Exports Student, StudentFilters, useStudents, useStudent (~458 tok)
- `teachers.ts` — Exports Teacher, useTeachers, useTeacher (~225 tok)

## quran-hifz-mobile/lib/store/

- `portalStore.ts` — Exports AuthUser, usePortalStore (~941 tok)

## quran-hifz-mobile/lib/types/

- `halqa.ts` — Exports Halqa, Masjid, KPI (~128 tok)
- `portal.ts` — Exports PortalType, NavItem, NavGroup, PortalUser, PortalConfig (~117 tok)
- `student.ts` — Exports Student, HifzEntry, AttendanceRecord, Message (~220 tok)
- `teacher.ts` — Exports Teacher, IndividualPlan, HomeworkReview (~160 tok)

## quran-hifz-server/

- `.gitignore` — Git ignore rules (~10 tok)
- `package-lock.json` — npm lock file (~23821 tok)
- `package.json` — Node.js package manifest (~291 tok)
- `tsconfig.json` — TypeScript configuration (~128 tok)
- `vercel.json` (~54 tok)

## quran-hifz-server/api/

- `index.ts` — ensureDB: handler (~132 tok)

## quran-hifz-server/src/

- `app.ts` — API routes: GET (1 endpoints) (~818 tok)
- `server.ts` — Declares bootstrap (~198 tok)

## quran-hifz-server/src/config/

- `db.ts` — Exports connectDB (~140 tok)
- `env.ts` — Exports ENV (~161 tok)

## quran-hifz-server/src/controllers/

- `admin.controller.ts` — Zod schemas: updateParentSchema, createParentSchema (~1450 tok)
- `attendance.controller.ts` — Zod schemas: recordSchema, bulkSchema (~985 tok)
- `auth.controller.ts` — Zod schemas: loginSchema (~481 tok)
- `group-homework.controller.ts` — Zod schemas: groupHomeworkSchema (~495 tok)
- `halqa.controller.ts` — Zod schemas: halqaSchema (~878 tok)
- `hifz.controller.ts` — Zod schemas: entrySchema (~739 tok)
- `homework.controller.ts` — Zod schemas: homeworkSchema, reviewSchema (~750 tok)
- `kpi.controller.ts` — Zod schemas: kpiSchema (~389 tok)
- `lesson-recording.controller.ts` — Zod schemas: recordingSchema (~559 tok)
- `masjid.controller.ts` — Zod schemas: masjidSchema (~698 tok)
- `message.controller.ts` — Zod schemas: messageSchema (~526 tok)
- `parent.controller.ts` — Exports getChildren, getChildHifz, getChildAttendance, getChildHomework + 2 more (~959 tok)
- `special-track.controller.ts` — Zod schemas: trackSchema (~1073 tok)
- `stats.controller.ts` — Exports getDashboardStats (~525 tok)
- `student.controller.ts` — Zod schemas: studentSchema (~1412 tok)
- `teacher.controller.ts` — Zod schemas: teacherSchema (~1398 tok)

## quran-hifz-server/src/middleware/

- `auth.ts` — Exports authenticate (~234 tok)
- `error.ts` — Exports AppError, errorHandler, notFound (~336 tok)
- `role.ts` — Exports authorize (~121 tok)

## quran-hifz-server/src/models/

- `Attendance.model.ts` — Exports IAttendance, Attendance (~264 tok)
- `GroupHomework.model.ts` — Exports IGroupHomework, GroupHomework (~242 tok)
- `Halqa.model.ts` — Exports IHalqa, Halqa (~336 tok)
- `HifzEntry.model.ts` — Exports IHifzEntry, HifzEntry (~267 tok)
- `Homework.model.ts` — Exports IHomework, Homework (~373 tok)
- `IndividualPlan.model.ts` — Exports IIndividualPlan, IndividualPlan (~302 tok)
- `KPI.model.ts` — Exports IKPI, KPI (~199 tok)
- `LessonRecording.model.ts` — Exports ILessonRecording, LessonRecording (~308 tok)
- `Masjid.model.ts` — Exports IMasjid, Masjid (~125 tok)
- `Message.model.ts` — Exports IMessage, Message (~291 tok)
- `ParentStudent.model.ts` — Exports IParentStudent, ParentStudent (~172 tok)
- `SpecialTrack.model.ts` — Exports ISpecialTrack, SpecialTrack (~432 tok)
- `Student.model.ts` — Exports IStudent, Student (~498 tok)
- `Teacher.model.ts` — Exports ITeacher, Teacher (~289 tok)
- `User.model.ts` — Exports UserRole, IUser, User (~383 tok)

## quran-hifz-server/src/routes/

- `admin.routes.ts` — API routes: GET, POST, PUT, DELETE (7 endpoints) (~246 tok)
- `attendance.routes.ts` — API routes: GET, POST (3 endpoints) (~142 tok)
- `auth.routes.ts` — API routes: POST, GET (3 endpoints) (~93 tok)
- `group-homework.routes.ts` — API routes: GET, POST, DELETE (3 endpoints) (~149 tok)
- `halqa.routes.ts` — API routes: GET, POST, PUT, DELETE (5 endpoints) (~169 tok)
- `hifz.routes.ts` — API routes: GET, POST, DELETE (3 endpoints) (~139 tok)
- `homework.routes.ts` — API routes: GET, POST, PATCH, DELETE (4 endpoints) (~164 tok)
- `kpi.routes.ts` — API routes: GET, POST, PUT (3 endpoints) (~122 tok)
- `lesson-recording.routes.ts` — API routes: GET, POST, DELETE (3 endpoints) (~143 tok)
- `masjid.routes.ts` — API routes: GET, POST, PUT, DELETE (5 endpoints) (~161 tok)
- `message.routes.ts` — API routes: GET, POST, PATCH (3 endpoints) (~105 tok)
- `parent.routes.ts` — API routes: GET (6 endpoints) (~239 tok)
- `special-track.routes.ts` — API routes: GET, POST, PUT, DELETE (6 endpoints) (~210 tok)
- `stats.routes.ts` — API routes: GET (1 endpoints) (~79 tok)
- `student.routes.ts` — API routes: GET, POST, PUT, DELETE (5 endpoints) (~173 tok)
- `teacher.routes.ts` — API routes: GET, POST, PUT, DELETE (5 endpoints) (~166 tok)

## quran-hifz-server/src/seeds/

- `seed.ts` — Seed script — populates MongoDB with the same mock data used in the Next.js client. (~3398 tok)

## quran-hifz-server/src/types/

- `express.d.ts` — Declares Request (~62 tok)

## quran-hifz/

- `.env.example` — VITE_API_URL / VITE_API_PROXY_TARGET template (~80 tok)
- `.gitignore` — Git ignore rules (~90 tok)
- `.prettierignore` (~25 tok)
- `.prettierrc` — Prettier configuration (~24 tok)
- `AGENTS.md` (~119 tok)
- `bunfig.toml` (~110 tok)
- `components.json` (~127 tok)
- `eslint.config.js` — ESLint flat configuration (~358 tok)
- `package-lock.json` — npm lock file (~86488 tok)
- `package.json` — Node.js package manifest (~829 tok)
- `tsconfig.json` — TypeScript configuration (~192 tok)
- `vite.config.ts` — or the app will break with duplicate plugins: (~327 tok)

## quran-hifz/.lovable/

- `project.json` (~36 tok)

## quran-hifz/public/

- `robots.txt` (~31 tok)
- `robots.txt` — SEO: allow /, disallow portal paths, Sitemap pointer (~30 tok)
- `sitemap.xml` (~64 tok)

## quran-hifz/src/

- `router.tsx` — getRouter (~113 tok)
- `routeTree.gen.ts` — @ts-nocheck (~514 tok)
- `server.ts` — API routes: GET (1 endpoints) (~527 tok)
- `start.ts` — Exports startInstance (~177 tok)
- `styles.css` — Styles: 7 rules, 105 vars, 1 layers (~1548 tok)

## quran-hifz/src/components/ui/

- `accordion.tsx` — Accordion (~576 tok)
- `alert-dialog.tsx` — AlertDialog (~1196 tok)
- `alert.tsx` — alertVariants (~454 tok)
- `aspect-ratio.tsx` — AspectRatio (~41 tok)
- `avatar.tsx` — Avatar (~404 tok)
- `badge.tsx` — badgeVariants (~321 tok)
- `breadcrumb.tsx` — Breadcrumb (~786 tok)
- `button.tsx` — buttonVariants (~542 tok)
- `calendar.tsx` — Calendar — uses useEffect (~2060 tok)
- `card.tsx` — Card (~520 tok)
- `carousel.tsx` — CarouselContext — uses useContext, useState, useCallback, useEffect (~1772 tok)
- `chart.tsx` — Format: { THEME_NAME: CSS_SELECTOR } (~3020 tok)
- `checkbox.tsx` — Checkbox (~298 tok)
- `collapsible.tsx` — Collapsible (~96 tok)
- `command.tsx` — Command — renders modal (~1394 tok)
- `context-menu.tsx` — ContextMenu (~2112 tok)
- `dialog.tsx` — Dialog — renders modal (~1043 tok)
- `drawer.tsx` — Drawer — renders modal (~850 tok)
- `dropdown-menu.tsx` — DropdownMenu (~2171 tok)
- `form.tsx` — Form — renders form — uses useContext (~1201 tok)
- `hover-card.tsx` — HoverCard (~356 tok)
- `input-otp.tsx` — InputOTP — uses useContext (~618 tok)
- `input.tsx` — Input (~222 tok)
- `label.tsx` — labelVariants (~205 tok)
- `menubar.tsx` — MenubarMenu (~2442 tok)
- `navigation-menu.tsx` — NavigationMenu (~1472 tok)
- `pagination.tsx` — Pagination (~783 tok)
- `popover.tsx` — Popover (~387 tok)
- `progress.tsx` — Progress (~224 tok)
- `radio-group.tsx` — RadioGroup (~402 tok)
- `resizable.tsx` — ResizablePanelGroup (~444 tok)
- `scroll-area.tsx` — ScrollArea (~468 tok)
- `select.tsx` — Select (~1643 tok)
- `separator.tsx` — Separator (~207 tok)
- `sheet.tsx` — Sheet (~1214 tok)
- `sidebar.tsx` — SIDEBAR_COOKIE_NAME — uses useContext, useState, useCallback, useEffect (~6850 tok)
- `skeleton.tsx` — Skeleton (~69 tok)
- `slider.tsx` — Slider (~293 tok)
- `sonner.tsx` — Toaster (~210 tok)
- `switch.tsx` — Switch (~331 tok)
- `table.tsx` — Table — renders table (~806 tok)
- `tabs.tsx` — Tabs (~553 tok)
- `textarea.tsx` — Textarea (~194 tok)
- `toggle-group.tsx` — ToggleGroupContext — uses useContext (~501 tok)
- `toggle.tsx` — toggleVariants (~439 tok)
- `tooltip.tsx` — TooltipProvider (~366 tok)

## quran-hifz/src/hooks/

- `use-mobile.tsx` — MOBILE_BREAKPOINT — uses useEffect (~165 tok)

## quran-hifz/src/lib/

- `api.ts` — Exports ApiError, get, post, put + 2 more (~443 tok)
- `auth-storage.ts` — Exports StoredUser, getToken, setToken, clearToken + 3 more (~308 tok)
- `error-capture.ts` — Captures the original Error out-of-band so server.ts can recover the stack (~259 tok)
- `error-page.ts` — Exports renderErrorPage (~392 tok)
- `format.ts` — Exports toAr, pct (~67 tok)
- `lovable-error-reporting.ts` — Exports reportLovableError (~238 tok)
- `utils.ts` — Exports cn (~49 tok)

## quran-hifz/src/quran/

- `quran.css` — Styles: 73 rules, 18 vars (~15103 tok)
- `QuranApp.tsx` — Quran Hifz platform — React entry. (~834 tok)

## quran-hifz/src/quran/api/

- `admin-parents.ts` — Exports ParentUser, useAdminParents, useCreateParent, useLinkChild + 4 more (~787 tok)
- `attendance.ts` — Exports AttendanceRecord, AttendanceFilters, useAttendance, useRecordAttendance, useBulkAttendance (~543 tok)
- `group-homework.ts` — Exports GroupHomework, useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework (~359 tok)
- `halqat.ts` — Exports Halqa, HalqaFilters, useHalqat, useHalqa + 3 more (~589 tok)
- `hifz.ts` — Exports HifzEntry, useHifz, useUpsertHifz, useDeleteHifz (~388 tok)
- `homework.ts` — Exports Homework, HomeworkFilters, useHomework, useCreateHomework + 2 more (~628 tok)
- `kpis.ts` — Exports Kpi, useKpis, useCreateKpi, useUpdateKpi (~314 tok)
- `lesson-recordings.ts` — Exports LessonRecording, useRecordings, useCreateRecording, useDeleteRecording (~488 tok)
- `masajid.ts` — Exports Masjid, useMasajid, useMasjid, useCreateMasjid + 2 more (~461 tok)
- `messages.ts` — Exports Message, useMessages, useSendMessage, useMarkRead (~327 tok)
- `parent.ts` — Exports ParentChild, ChildRecording, ChildHomework, useParentChildren + 5 more (~717 tok)
- `special-tracks.ts` — Exports EnrolledStudent, SpecialTrack, useSpecialTracks, useCreateTrack + 4 more (~765 tok)
- `stats.ts` — Exports DashboardStats, useStats (~166 tok)
- `students.ts` — Exports Student, StudentFilters, useStudents, useStudent + 3 more (~737 tok)
- `teachers.ts` — Exports Teacher, useTeachers, useTeacher, useCreateTeacher + 2 more (~504 tok)

## quran-hifz/src/quran/components/

- `ChildSelector.tsx` — Post-login child picker for parent portal; fetches from useParentChildren(), calls setActiveChild from ParentContext (~900 tok)
- `PageOutlet.tsx` — PageOutlet (~131 tok)
- `PortalScreen.tsx` — LOGO_SRC (~516 tok)
- `Sidebar.tsx` — LOGO_SRC (~666 tok)
- `Topbar.tsx` — Topbar (~105 tok)

## quran-hifz/src/quran/components/common/

- `Alert.tsx` — ICONS (~156 tok)
- `AyahBar.tsx` — AyahBar (~40 tok)
- `Badge.tsx` — Badge (~83 tok)
- `Card.tsx` — Card (~181 tok)
- `HalqaRow.tsx` — HalqaRow (~104 tok)
- `ProgressBar.tsx` — ProgressBar (~68 tok)
- `StatsRow.tsx` — StatsRow (~146 tok)

## quran-hifz/src/quran/config/

- `masarMap.ts` — Exports MasarLevel, ServerPath, MasarInfo, MASAR_MAP, pickMasar (~416 tok)
- `portals.ts` — Exports PortalKey, NavItem, NavGroup, PortalConfig, PORTALS (~1231 tok)

## quran-hifz/src/quran/context/

- `AuthContext.tsx` — AuthContext (~690 tok)
- `ParentContext.tsx` — ParentContext (~206 tok)
- `PortalContext.tsx` — PortalContext (~483 tok)
- `ThemeContext.tsx` — ThemeContext (~307 tok)
- `useTopbar.ts` — Declarative topbar setter for a page component. (~106 tok)

## quran-hifz/src/quran/pages/

- `LandingPage.tsx` — LOGO_SRC (~4826 tok)
- `LoginPage.tsx` — schema — renders form (~1710 tok)

## quran-hifz/src/quran/pages/admin/

- `AdminDashboard.tsx` — PageLoading (~1209 tok)
- `AdminHalqat.tsx` — EMPTY_FORM — renders form, modal (~3700 tok)
- `AdminKpis.tsx` — RATING_TONE — renders table (~562 tok)
- `AdminMasajid.tsx` — OVERLAY — renders modal (~2685 tok)
- `AdminParents.tsx` — EMPTY_ADD — renders table (~5192 tok)
- `AdminRegister.tsx` — schema — renders form (~3078 tok)
- `AdminReports.tsx` — REPORTS — renders chart (~419 tok)
- `AdminSpecialTracks.tsx` — STATUS_TONE — renders form, modal (~9559 tok)
- `AdminStudents.tsx` — PATH_TONE — renders table (~5093 tok)
- `AdminTeachers.tsx` — EMPTY_FORM — renders form, table, modal (~4599 tok)

## quran-hifz/src/quran/pages/parent/

- `ParentAttendance.tsx` — STATUS_TONE — renders table (~780 tok)
- `ParentDashboard.tsx` — NOTIFICATIONS (~1180 tok)
- `ParentHomeworkView.tsx` — ParentHomeworkView (~1020 tok)
- `ParentMessages.tsx` — ParentMessages (~545 tok)
- `ParentRecordings.tsx` — ParentRecordings — renders table (~570 tok)
- `ParentTimeline.tsx` — STATUS_COLOR (~1012 tok)

## quran-hifz/src/quran/pages/student/

- `StudentAttendance.tsx` — STATUS_TONE — renders table (~793 tok)
- `StudentDashboard.tsx` — getName (~1636 tok)
- `StudentHifz.tsx` — tone — renders table (~1059 tok)
- `StudentHomework.tsx` — AR_DIGITS — uses useState, useEffect (~1000 tok)
- `StudentMessages.tsx` — StudentMessages (~758 tok)
- `StudentPoints.tsx` — MY_POINTS (~1302 tok)
- `StudentSchedule.tsx` — getId (~836 tok)
- `StudentStore.tsx` — MY_POINTS (~874 tok)

## quran-hifz/src/quran/pages/teacher/

- `TeacherAttendance.tsx` — getName — renders table (~1138 tok)
- `TeacherDashboard.tsx` — getName — renders table (~1300 tok)
- `TeacherEvaluate.tsx` — STUDENTS (~1006 tok)
- `TeacherGroupHomework.tsx` — STUDENTS (~2396 tok)
- `TeacherHalqa.tsx` — getName (~793 tok)
- `TeacherHomework.tsx` — getName — renders table (~1011 tok)
- `TeacherPlans.tsx` — ROWS — renders table (~436 tok)
- `TeacherRecordLesson.tsx` — LESSON_TYPES (~4027 tok)
- `TeacherReports.tsx` — TeacherReports — renders chart (~172 tok)
- `TeacherStudents.tsx` — HW_TONE — renders table (~2053 tok)

## quran-hifz/src/quran/router/

- `pageRegistry.ts` — Exports PAGE_REGISTRY (~1091 tok)

## quran-hifz/src/routes/

- `__root.tsx` — Root: SEO head (Arabic OG, Twitter card, JSON-LD, favicon, lang=ar dir=rtl), RootShell, error/404 components (~1611 tok)
- `index.tsx` — Landing page route with per-page Arabic SEO head overrides (~200 tok)
- `README.md` — Project documentation (~207 tok)
- `sitemap[.]xml.ts` — API route: serves /sitemap.xml dynamically from request origin (~159 tok)
