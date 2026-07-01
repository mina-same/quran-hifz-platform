import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useSpecialTracks, type SpecialTrack, type EnrolledStudent, type TrackTeacher } from "../../api/special-tracks";

/* ─── helpers ─── */
function getEnrolledName(v: EnrolledStudent | string) { return typeof v === "object" ? v.name : v; }
function getEnrolledId(v: EnrolledStudent | string)   { return typeof v === "object" ? v._id  : v; }
function getTeacherName(v: TrackTeacher | string)     { return typeof v === "object" ? v.name : v; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}
const AV = [
  { bg: "var(--green-pale)", fg: "var(--green)" },
  { bg: "var(--gold-pale)",  fg: "#92400e" },
  { bg: "#eff6ff",           fg: "#1d4ed8" },
  { bg: "#fde8f0",           fg: "#9d174d" },
];

const STATUS_CFG = {
  active:   { label: "نشط",   tone: "green" as const, bar: "linear-gradient(90deg,var(--green),var(--green2))", color: "var(--green)" },
  upcoming: { label: "قادم",  tone: "gold"  as const, bar: "linear-gradient(90deg,#f59e0b,#fbbf24)",            color: "#d97706" },
  ended:    { label: "منتهي", tone: "gray"  as const, bar: "var(--border)",                                     color: "var(--text3)" },
};

/* ─── Track card ─── */
function TrackCard({ track }: { track: SpecialTrack }) {
  const [open, setOpen] = useState(track.status === "active");

  const cfg      = STATUS_CFG[track.status];
  const enrolled = track.enrolledStudents.length;
  const pct      = Math.min(100, Math.round((enrolled / track.maxStudents) * 100));
  const barClr   = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 16,
      overflow: "hidden", background: "var(--surface)",
    }}>
      {/* coloured strip */}
      <div style={{ height: 4, background: cfg.bar }} />

      <div style={{ padding: "16px 18px" }}>
        {/* badges + title */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <Badge tone={cfg.tone}>{cfg.label}</Badge>
          <span style={{ fontSize: 11, background: "var(--cream)", color: "var(--text2)", borderRadius: 6, padding: "2px 8px" }}>
            {track.type}
          </span>
          {track.isOnline && (
            <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px" }}>
              <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
            </span>
          )}
        </div>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{track.title}</h3>

        {/* info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", fontSize: 12, marginBottom: 14 }}>
          {[
            { icon: "ti-clock",          label: "الوقت",    val: track.timeSlot },
            { icon: "ti-calendar-repeat",label: "الأيام",   val: track.daysPerWeek },
            { icon: "ti-calendar",       label: "البداية",  val: fmtDate(track.startDate) },
            { icon: "ti-calendar-off",   label: "النهاية",  val: fmtDate(track.endDate) },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{val}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, gridColumn: "1 / -1" }}>
            <i className={`ti ${track.isOnline ? "ti-video" : "ti-map-pin"}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>المكان</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 1 }}>
                {track.isOnline ? "أونلاين" : track.location}
              </div>
            </div>
          </div>
        </div>

        {/* all teachers on this track */}
        {track.teachers.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 6 }}>المعلمون</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {track.teachers.map((tc, i) => {
                const c = AV[i % AV.length];
                return (
                  <div key={getTeacherName(tc) + i} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: c.bg, color: c.fg,
                    borderRadius: 99, padding: "4px 10px 4px 4px", fontSize: 11, fontWeight: 700,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: c.fg, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 800,
                    }}>
                      {avatarInitials(getTeacherName(tc))}
                    </div>
                    {getTeacherName(tc)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* capacity bar */}
        <div style={{ background: "var(--cream)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
              <i className="ti ti-user-check" style={{ marginLeft: 4 }} />الطلاب
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: barClr }}>{enrolled} / {track.maxStudents}</span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
          </div>
        </div>

        {/* meet link */}
        {track.isOnline && track.meetLink && (
          <a
            href={track.meetLink} target="_blank" rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12,
              fontSize: 12, color: "#1d4ed8", background: "#eff6ff",
              padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(29,78,216,0.2)",
              textDecoration: "none", fontWeight: 600,
            }}
          >
            <i className="ti ti-video" /> انضم للجلسة
          </a>
        )}

        {/* students toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
            borderRadius: 10, cursor: "pointer", background: open ? "var(--green-pale)" : "var(--cream)",
            color: open ? "var(--green)" : "var(--text2)", fontWeight: 700, fontSize: 13,
            transition: "all .15s",
          }}
        >
          <span>
            <i className="ti ti-users" style={{ marginLeft: 6 }} />
            طلاب هذا المسار
            <span style={{
              marginRight: 8, background: open ? "var(--green)" : "var(--border2)",
              color: open ? "#fff" : "var(--text2)",
              borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 700,
            }}>{enrolled}</span>
          </span>
          <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 14 }} />
        </button>

        {/* students list */}
        {open && (
          <div style={{
            marginTop: 8, border: "1px solid var(--border)", borderRadius: 10,
            overflow: "hidden", background: "var(--surface)",
          }}>
            {enrolled === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <i className="ti ti-user-off" style={{ fontSize: 24, color: "var(--text3)", display: "block", marginBottom: 6 }} />
                <p style={{ margin: 0, fontSize: 12, color: "var(--text3)" }}>لا يوجد طلاب مسجّلون بعد</p>
              </div>
            ) : (
              track.enrolledStudents.map((s, idx) => {
                const name = getEnrolledName(s);
                const c    = AV[idx % AV.length];
                return (
                  <div
                    key={getEnrolledId(s)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      borderBottom: idx < enrolled - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: c.bg, color: c.fg, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800,
                    }}>
                      {avatarInitials(name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{name}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>طالب #{idx + 1}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
export function TeacherSpecialTracks() {
  useTopbar("ti-calendar-event", "مساراتي الاستثنائية");
  const { user } = usePortal();

  const { data: tracks = [], isLoading } = useSpecialTracks(
    undefined,
    user?.profileId as string | undefined,
  );

  const active   = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended    = tracks.filter((t) => t.status === "ended");

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
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((t) => <TrackCard key={t._id} track={t} />)}
        </div>
      </div>
    );
  }

  return (
    <Card>
      {isLoading && <div className="page-loading"><i className="ti ti-loader-2" /> جارٍ التحميل...</div>}

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
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>لا توجد مسارات مُسنَدة إليك</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text3)" }}>
            عندما تُعيّنك الإدارة لمسار سيظهر هنا تلقائياً
          </p>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <>
          <Section title="المسارات النشطة"   color="var(--green)" items={active}   />
          <Section title="المسارات القادمة"  color="#d97706"      items={upcoming} />
          <Section title="المسارات المنتهية" color="var(--text3)" items={ended}    />
        </>
      )}
    </Card>
  );
}
