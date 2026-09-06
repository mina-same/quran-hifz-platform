import { useState, type CSSProperties } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import {
  useTracks, useDeleteTrack,
  TRACK_DETAIL_ID_KEY, TRACK_FORM_HANDOFF_KEY,
  type Track, type TrackTeacher, type TrackFormHandoff,
} from "../../api/tracks";
import { useQuranPlans, segmentReversed } from "../../api/quran-plans";
import { SURAHS } from "../../data/surahs";
import { isReversedRange, orientSlice } from "../../lib/quranRange";
import { Badge } from "../../components/common/Badge";
import { SkeletonCardGrid } from "../../components/common/Skeleton";
import { TrackStudentsPanel } from "../../components/common/TrackStudentsPanel";
import { AR_LOCALE } from "@/lib/format";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}

/* ─── helpers ─────────────────────────────────────────────── */
function getTeacherId(v: TrackTeacher | string)      { return typeof v === "object" ? v._id  : v; }
function getTeacherName(v: TrackTeacher | string)    { return typeof v === "object" ? v.name : v; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(AR_LOCALE, { year: "numeric", month: "short", day: "numeric" });
}
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}
const AVATAR_COLORS = [
  { bg: "var(--green-pale)", fg: "var(--green)" },
  { bg: "var(--gold-pale)",  fg: "#92400e" },
  { bg: "#eff6ff",           fg: "#1d4ed8" },
  { bg: "#fde8f0",           fg: "#9d174d" },
];

type Modal =
  | null
  | { mode: "students"; item: Track };

/* ─── overlay / dialog styles ─────────────────────────────── */
const OVERLAY: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const DIALOG: CSSProperties = {
  background: "var(--surface)", borderRadius: 16, width: "100%",
  maxHeight: "92vh", overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

/* ─── status config ──────────────────────────────────────── */
const STATUS_CFG = {
  active:   { label: "نشط",    tone: "green" as const, color: "var(--green)",  bg: "var(--green-pale)", bar: "linear-gradient(90deg,var(--green),var(--green2))" },
  upcoming: { label: "قادم",   tone: "gold"  as const, color: "#d97706",       bg: "var(--gold-pale)",  bar: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
  ended:    { label: "منتهي",  tone: "gray"  as const, color: "var(--text3)",  bg: "var(--cream)",      bar: "var(--border)" },
};
/* ════════════════════════════════════════════════════════════ */
export function AdminTracks() {
  const { data: tracks = [], isLoading } = useTracks();

  const deleteTrack    = useDeleteTrack();
  const { showPage }   = usePortal();

  function openDetail(track: Track) {
    sessionStorage.setItem(TRACK_DETAIL_ID_KEY, track._id);
    showPage("trackdetail");
  }

  const [modal,    setModal]    = useState<Modal>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── open helpers ── */
  function openAdd() {
    const handoff: TrackFormHandoff = { mode: "create" };
    sessionStorage.setItem(TRACK_FORM_HANDOFF_KEY, JSON.stringify(handoff));
    showPage("trackform");
  }
  function openEdit(item: Track) {
    const handoff: TrackFormHandoff = { mode: "edit", track: item };
    sessionStorage.setItem(TRACK_FORM_HANDOFF_KEY, JSON.stringify(handoff));
    showPage("trackform");
  }
  function openStudents(item: Track) {
    setModal({ mode: "students", item });
  }

  useTopbar("ti-calendar-event", "المسارات",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> مسار جديد
    </button>,
  );

  /* ── group by status ── */
  const active   = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended    = tracks.filter((t) => t.status === "ended");

  /* ════════════════════ RENDER ════════════════════════════ */
  return (
    <>
      {isLoading && <SkeletonCardGrid count={3} lines={4} />}

      {!isLoading && tracks.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: "var(--green-pale)", color: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>
            <i className="ti ti-calendar-event" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>لا توجد مسارات بعد</p>
          <p style={{ margin: "6px 0 20px", fontSize: 13, color: "var(--text3)" }}>أضف أول مسار</p>
          <button className="topbar-btn btn-primary" style={{ padding: "10px 24px" }} onClick={openAdd}>
            <i className="ti ti-plus" /> مسار جديد
          </button>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {active.length > 0 && (
            <section>
              <SectionHeader label="المسارات النشطة" count={active.length} color="var(--green)" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
                {active.map((t) => (
                  <TrackCard key={t._id} t={t} onManageStudents={openStudents} onEdit={openEdit} onDelete={setDeleteId} onOpen={openDetail} />
                ))}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <SectionHeader label="المسارات القادمة" count={upcoming.length} color="#d97706" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
                {upcoming.map((t) => (
                  <TrackCard key={t._id} t={t} onManageStudents={openStudents} onEdit={openEdit} onDelete={setDeleteId} onOpen={openDetail} />
                ))}
              </div>
            </section>
          )}
          {ended.length > 0 && (
            <section>
              <SectionHeader label="المسارات المنتهية" count={ended.length} color="var(--text3)" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14, opacity: 0.75 }}>
                {ended.map((t) => (
                  <TrackCard key={t._id} t={t} onManageStudents={openStudents} onEdit={openEdit} onDelete={setDeleteId} onOpen={openDetail} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}


      {/* ════════ STUDENTS MODAL — transfer-only, since a student's track is
          exclusive: this panel shows who's currently on the track (a live
          query, not a stored array) and offers "نقل طالب" (moves a student's
          `track` field here), never "add" alongside an existing track. ════════ */}
      {modal?.mode === "students" && (() => {
        const track = tracks.find((t) => t._id === modal.item._id) ?? modal.item;
        const enrolledStudents = allStudents.filter((s) => {
          const tId = typeof s.track === "object" ? s.track._id : s.track;
          return tId === track._id;
        });
        const enrolledCnt = enrolledStudents.length;
        const capPct      = Math.min(100, Math.round((enrolledCnt / track.maxStudents) * 100));
        const barClr      = capPct >= 90 ? "#ef4444" : capPct >= 70 ? "#f59e0b" : "var(--green)";
        const isFull      = enrolledCnt >= track.maxStudents;
        const available   = allStudents.filter((s) => {
          const tId = typeof s.track === "object" ? s.track._id : s.track;
          return tId !== track._id && (!studentsSearch.trim() || s.name.includes(studentsSearch.trim()));
        });

        return (
          <div style={OVERLAY} onClick={() => { setModal(null); setStudentsSearch(""); }}>
            <div style={{ ...DIALOG, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "18px 22px 14px", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--green-pale)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                    <i className="ti ti-users" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text)" }}>إدارة طلاب المسار</h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>{track.title}</p>
                  </div>
                </div>
                <button className="topbar-btn btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setModal(null); setStudentsSearch(""); }}>
                  <i className="ti ti-x" />
                </button>
              </div>

              <div style={{ padding: "16px 22px" }}>
                <div style={{ background: "var(--cream)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
                      <i className="ti ti-user-check" style={{ marginLeft: 4 }} />طاقة المسار
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barClr }}>{enrolledCnt} / {track.maxStudents}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${capPct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
                  </div>
                  {isFull && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#ef4444", fontWeight: 600 }}><i className="ti ti-alert-circle" style={{ marginLeft: 4 }} />وصل المسار للحد الأقصى</p>}
                </div>

                {!isFull && (
                  <div style={{ border: "1.5px dashed var(--border2)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                      <i className="ti ti-user-plus" style={{ marginLeft: 5, color: "var(--green)" }} />نقل طالب إلى هذا المسار
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select className="form-input" style={{ flex: 1, fontSize: 13 }} value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
                        <option value="">— اختر طالباً —</option>
                        {available.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                      <button
                        className="topbar-btn btn-primary"
                        style={{ padding: "0 16px", whiteSpace: "nowrap", fontSize: 13 }}
                        disabled={!addStudentId || assignStudent.isPending}
                        onClick={async () => {
                          if (!addStudentId) return;
                          await assignStudent.mutateAsync({ id: track._id, studentId: addStudentId });
                          setAddStudentId("");
                        }}
                      >
                        {assignStudent.isPending
                          ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
                          : <><i className="ti ti-plus" /> نقل</>}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>الطلاب المسجّلون</span>
                  {enrolledCnt > 0 && (
                    <input className="form-input" style={{ width: 140, fontSize: 12, padding: "5px 10px" }} placeholder="بحث..." value={studentsSearch} onChange={(e) => setStudentsSearch(e.target.value)} />
                  )}
                </div>

                {enrolledCnt === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", background: "var(--cream)", borderRadius: 10 }}>
                    <i className="ti ti-user-off" style={{ fontSize: 28, color: "var(--text3)", display: "block", marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text3)" }}>لا يوجد طلاب مسجّلون بعد</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                    {enrolledStudents
                      .filter((s) => !studentsSearch.trim() || s.name.includes(studentsSearch.trim()))
                      .map((s, idx) => {
                        const c = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        return (
                          <div key={s._id} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "9px 12px", background: "var(--cream)", borderRadius: 10,
                            border: "1px solid var(--border)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: "50%",
                                background: c.bg, color: c.fg,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, flexShrink: 0,
                              }}>{avatarInitials(s.name)}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{s.name}</div>
                                <div style={{ fontSize: 10, color: "var(--text3)" }}>#{idx + 1}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--text3)" }}>
                  <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
                  لإزالة طالب من المسار، انقله إلى مسار آخر من صفحة إدارة الطلاب.
                </p>

                <button
                  className="topbar-btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 16, padding: 10 }}
                  onClick={() => { setModal(null); setStudentsSearch(""); }}
                >إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════ DELETE CONFIRM ════════ */}
      {deleteId && (
        <div style={OVERLAY} onClick={() => setDeleteId(null)}>
          <div style={{ ...DIALOG, maxWidth: 360, padding: "28px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "#fef2f2", color: "#ef4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, margin: "0 auto 14px",
              }}>
                <i className="ti ti-trash" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>حذف المسار</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>سيُحذف المسار نهائياً ولا يمكن التراجع.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", borderColor: "#ef4444", padding: 11 }}
                onClick={async () => { await deleteTrack.mutateAsync(deleteId); setDeleteId(null); }}
                disabled={deleteTrack.isPending}
              >
                <i className="ti ti-trash" />
                {deleteTrack.isPending ? "جارٍ الحذف..." : "حذف"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setDeleteId(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── track card ── */
function TrackCard({
  t, onManageStudents, onEdit, onDelete, onOpen,
}: {
  t: Track;
  onManageStudents: (t: Track) => void;
  onEdit: (t: Track) => void;
  onDelete: (id: string) => void;
  onOpen: (t: Track) => void;
}) {
  const cfg      = STATUS_CFG[t.status];
  const enrolled = t.studentCount ?? 0;
  const pct      = Math.min(100, Math.round((enrolled / t.maxStudents) * 100));
  const barClr   = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";

  const { data: linkedPlans = [] } = useQuranPlans({ track: t._id });
  const linkedPlan = linkedPlans[0];
  const [planOpen, setPlanOpen] = useState(false);

  function getName(v: unknown): string {
    if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
    return typeof v === "string" ? v : "";
  }

  return (
    <div
      className="track-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(t); } }}
      style={{ cursor: "pointer" }}
    >
      <div style={{ height: 4, background: cfg.bar }} />

      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
            <Badge tone={cfg.tone}>{cfg.label}</Badge>
            <span style={{
              fontSize: 11, background: cfg.bg, color: cfg.color,
              borderRadius: 6, padding: "2px 9px", fontWeight: 600,
            }}>{t.type}</span>
            {t.isOnline
              ? <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                  <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
                </span>
              : <span style={{ fontSize: 11, background: "var(--cream)", color: "var(--text2)", borderRadius: 6, padding: "2px 9px" }}>
                  <i className="ti ti-building-arch" style={{ marginLeft: 3 }} />حضوري
                </span>
            }
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12, color: "var(--green)", borderColor: "rgba(26,92,42,0.25)" }}
              onClick={(e) => { e.stopPropagation(); onManageStudents(t); }}
            >
              <i className="ti ti-users" />
              {enrolled > 0 && (
                <span style={{ background: "var(--green)", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px", marginRight: 4 }}>
                  {enrolled}
                </span>
              )}
            </button>
            <button className="topbar-btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
              <i className="ti ti-pencil" />
            </button>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
              onClick={(e) => { e.stopPropagation(); onDelete(t._id); }}
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        <h3 style={{ margin: "10px 0 12px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{t.title}</h3>

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
          <InfoRow icon="ti-clock"    label="الوقت"    val={t.timeSlot} />
          <InfoRow icon="ti-calendar-repeat" label="الأيام" val={t.daysPerWeek} />
          <InfoRow icon="ti-calendar" label="البداية"  val={fmtDate(t.startDate)} />
          <InfoRow icon="ti-calendar-off" label="النهاية" val={fmtDate(t.endDate)} />
          <InfoRow
            icon={t.isOnline ? "ti-video" : "ti-map-pin"}
            label="المسجد"
            val={t.isOnline ? "أونلاين" : getName(t.masjid)}
            span
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>المعلمون</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {t.teachers.map((tc, i) => {
              const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={getTeacherId(tc)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: c.bg, color: c.fg,
                  borderRadius: 99, padding: "4px 10px 4px 4px", fontSize: 12, fontWeight: 600,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: c.fg, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800,
                  }}>
                    {avatarInitials(getTeacherName(tc))}
                  </div>
                  {getTeacherName(tc)}
                </div>
              );
            })}
            {t.teachers.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>— لا يوجد معلم —</span>
            )}
          </div>
        </div>

        <div style={{ background: "var(--cream)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
              <i className="ti ti-user-check" style={{ marginLeft: 4 }} />الطاقة الاستيعابية
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: barClr }}>
              {enrolled} / {t.maxStudents}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
          </div>
        </div>

        <div style={{
          marginTop: 12, borderRadius: 10, padding: "10px 12px",
          background: linkedPlan?.todayAssignments && linkedPlan.todayAssignments.length > 0 ? "var(--green-pale)" : "var(--cream)",
        }}>
          <div
            onClick={(e) => { e.stopPropagation(); linkedPlan && setPlanOpen((o) => !o); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, cursor: linkedPlan ? "pointer" : "default" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: linkedPlan?.todayAssignments && linkedPlan.todayAssignments.length > 0 ? "var(--green)" : "var(--text3)" }}>
              <i className="ti ti-target" />الخطة القرآنية
              {linkedPlan?.progress && (
                <span style={{ background: "var(--green)", color: "#fff", borderRadius: 99, padding: "1px 8px", fontSize: 10 }}>
                  {linkedPlan.progress.percent}%
                </span>
              )}
            </span>
            {linkedPlan && <i className={`ti ti-chevron-${planOpen ? "up" : "down"}`} style={{ fontSize: 13, color: "var(--text3)" }} />}
          </div>

          {linkedPlan && planOpen && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{linkedPlan.name}</div>

              {linkedPlan.progress && (
                <div style={{ margin: "6px 0" }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${linkedPlan.progress.percent}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>
                    {linkedPlan.juzProgress
                      ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء`
                      : ""}
                    {" · "}{linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
                {linkedPlan.todayAssignments.length > 0 ? linkedPlan.todayAssignments.map((entry, idx) => {
                  const a = orientSlice(entry, segmentReversed(linkedPlan, entry.type));
                  return (
                  <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                    مقرَّر اليوم{linkedPlan.todayAssignments.length > 1 ? ` (${entry.type})` : ""}: {surahName(a.surahStart)} : {a.ayahStart}
                    {" — "}
                    {surahName(a.surahEnd)} : {a.ayahEnd}
                    {" "}(صفحة {a.pageStart}
                    {a.pageEnd !== a.pageStart ? ` - ${a.pageEnd}` : ""})
                  </div>
                  );
                }) : "لا يوجد جزء مخصص لليوم"}
              </div>
            </div>
          )}

          {!linkedPlan && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text3)" }}>لا توجد خطة حفظ مرتبطة بهذا المسار</p>
          )}
        </div>

        {t.isOnline && t.meetLink && (
          <a
            href={t.meetLink} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "#1d4ed8", background: "#eff6ff",
              padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(29,78,216,0.2)",
              textDecoration: "none", fontWeight: 600,
            }}
          >
            <i className="ti ti-video" /> انضم للجلسة
          </a>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val, span }: { icon: string; label: string; val: string; span?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, gridColumn: span ? "1 / -1" : undefined }}>
      <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
        <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{val}</div>
      </div>
    </div>
  );
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
        background: color + "22", color,
      }}>{count}</span>
    </div>
  );
}
