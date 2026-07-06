import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useSpecialTracks, TRACK_DETAIL_ID_KEY, type SpecialTrack } from "../../api/special-tracks";
import { useQuranPlans } from "../../api/quran-plans";
import { SURAHS } from "../../data/surahs";
import { SkeletonCardGrid } from "../../components/common/Skeleton";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}

const STATUS_CFG = {
  active:   { label: "نشط",   tone: "green" as const, bar: "linear-gradient(90deg,var(--green),var(--green2))" },
  upcoming: { label: "قادم",  tone: "gold"  as const, bar: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
  ended:    { label: "منتهي", tone: "gray"  as const, bar: "var(--border)" },
};

/* ─── simple, click-to-open summary card ─── */
function TrackCard({ track, onOpen }: { track: SpecialTrack; onOpen: (t: SpecialTrack) => void }) {
  const cfg = STATUS_CFG[track.status];
  const enrolled = track.enrolledStudents.length;
  const pct = Math.min(100, Math.round((enrolled / track.maxStudents) * 100));
  const barClr = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";

  // Small "N+1" fetch just for the at-a-glance today's-target teaser — same
  // trade-off already accepted elsewhere in this file (small per-teacher lists).
  const { data: linkedPlans = [] } = useQuranPlans({ specialTrack: track._id });
  const linkedPlan = linkedPlans[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(track)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(track); } }}
      style={{
        background: "var(--surface)", borderRadius: 16,
        border: "2px solid transparent", overflow: "hidden", cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border-color .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
    >
      <div style={{ height: 4, background: cfg.bar }} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "var(--green-pale)", color: "var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>
              <i className="ti ti-calendar-event" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {track.title}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                <Badge tone={cfg.tone}>{cfg.label}</Badge>
                <span style={{ fontSize: 11, background: "var(--cream)", color: "var(--text2)", borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                  {track.type}
                </span>
                {track.isOnline && (
                  <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                    <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
                  </span>
                )}
              </div>
            </div>
          </div>
          <i className="ti ti-chevron-left" style={{ fontSize: 16, color: "var(--text3)", flexShrink: 0, marginTop: 8 }} />
        </div>

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <i className="ti ti-clock" style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>الوقت</div>
              <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{track.timeSlot}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <i className="ti ti-calendar-repeat" style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>الأيام</div>
              <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{track.daysPerWeek}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: linkedPlan?.todayAssignment ? 10 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
              <i className="ti ti-user-check" style={{ marginLeft: 4 }} />الطلاب
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: barClr }}>{enrolled} / {track.maxStudents}</span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
          </div>
        </div>

        {linkedPlan?.todayAssignment && (
          <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--green-pale)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>
              <i className="ti ti-calendar-star" style={{ marginLeft: 4 }} />الجزء المطلوب اليوم
            </div>
            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
              {surahName(linkedPlan.todayAssignment.surahStart)} : {linkedPlan.todayAssignment.ayahStart}
              {" — "}
              {surahName(linkedPlan.todayAssignment.surahEnd)} : {linkedPlan.todayAssignment.ayahEnd}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
export function TeacherSpecialTracks() {
  useTopbar("ti-calendar-event", "مساراتي الاستثنائية");
  const { user, showPage } = usePortal();
  const teacherId = user?.profileId as string | undefined;

  const { data: tracks = [], isLoading } = useSpecialTracks(undefined, teacherId);

  const active = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended = tracks.filter((t) => t.status === "ended");

  function openDetail(track: SpecialTrack) {
    sessionStorage.setItem(TRACK_DETAIL_ID_KEY, track._id);
    showPage("trackdetail");
  }

  function Section({ title, color, items }: { title: string; color: string; items: SpecialTrack[] }) {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "22", color }}>
            {items.length}
          </span>
        </div>
        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
          {items.map((t) => (
            <TrackCard key={t._id} track={t} onOpen={openDetail} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      {isLoading && <SkeletonCardGrid count={3} lines={4} />}

      {!isLoading && tracks.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 0" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "var(--green-pale)", color: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 16px",
          }}>
            <i className="ti ti-calendar-event" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            لا توجد مسارات مُسنَدة إليك
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text3)" }}>
            عندما تُعيّنك الإدارة لمسار سيظهر هنا تلقائياً
          </p>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <>
          <Section title="المسارات النشطة" color="var(--green)" items={active} />
          <Section title="المسارات القادمة" color="#d97706" items={upcoming} />
          <Section title="المسارات المنتهية" color="var(--text3)" items={ended} />
        </>
      )}
    </Card>
  );
}
