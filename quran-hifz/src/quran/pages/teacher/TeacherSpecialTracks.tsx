import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useSpecialTracks, type SpecialTrack, type EnrolledStudent } from "../../api/special-tracks";

const STATUS_LABEL: Record<string, string> = {
  active:   "نشط",
  upcoming: "قادم",
  ended:    "منتهي",
};
const STATUS_TONE: Record<string, "green" | "gold" | "red"> = {
  active:   "green",
  upcoming: "gold",
  ended:    "red",
};
const TYPE_LABEL: Record<string, string> = {
  revision:    "مراجعة مكثّفة",
  tajweed:     "تجويد",
  ijazah:      "إجازة",
  khatmah:     "ختمة مسرّعة",
  ramadan:     "برنامج رمضاني",
  competition: "تحضير مسابقة",
  other:       "أخرى",
};

function getEnrolledName(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v.name : v;
}
function getEnrolledId(v: EnrolledStudent | string): string {
  return typeof v === "object" ? v._id : v;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}

const AVATAR_COLORS = [
  { bg: "var(--green-pale)", fg: "var(--green)" },
  { bg: "var(--gold-pale)",  fg: "#92400e" },
  { bg: "#eff6ff",           fg: "#1d4ed8" },
  { bg: "#fdf0e8",           fg: "#9a3412" },
];

export function TeacherSpecialTracks() {
  useTopbar("ti-calendar-event", "مساراتي الاستثنائية");
  const { user } = usePortal();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: tracks = [], isLoading } = useSpecialTracks(
    undefined,
    user?.profileId as string | undefined,
  );

  const active   = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended    = tracks.filter((t) => t.status === "ended");

  function TrackCard({ track }: { track: SpecialTrack }) {
    const enrolled = track.enrolledStudents.length;
    const pct      = Math.min(100, Math.round((enrolled / track.maxStudents) * 100));
    const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";
    const open     = expandedId === track._id;

    return (
      <div style={{
        border: "1px solid var(--border)", borderRadius: 14,
        overflow: "hidden", background: "var(--surface)",
        transition: "box-shadow .2s",
      }}>
        {/* Card header */}
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <Badge tone={STATUS_TONE[track.status] ?? "gold"}>
                  {STATUS_LABEL[track.status] ?? track.status}
                </Badge>
                <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--cream)", borderRadius: 6, padding: "2px 8px" }}>
                  {TYPE_LABEL[track.type] ?? track.type}
                </span>
                {track.isOnline && (
                  <span style={{ fontSize: 11, color: "#1d4ed8", background: "#eff6ff", borderRadius: 6, padding: "2px 8px" }}>
                    <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
                  </span>
                )}
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                {track.title}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--text2)" }}>
                <span><i className="ti ti-calendar" style={{ marginLeft: 4 }} />{fmtDate(track.startDate)} — {fmtDate(track.endDate)}</span>
                <span><i className="ti ti-clock" style={{ marginLeft: 4 }} />{track.timeSlot}</span>
                <span><i className="ti ti-map-pin" style={{ marginLeft: 4 }} />{track.isOnline ? "أونلاين" : track.location}</span>
              </div>
            </div>
            {/* Enrolled count circle */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
              border: `3px solid ${barColor}`,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: barColor, lineHeight: 1 }}>{enrolled}</span>
              <span style={{ fontSize: 9, color: "var(--text3)" }}>/ {track.maxStudents}</span>
            </div>
          </div>

          {/* Capacity bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 99, transition: "width .4s" }} />
            </div>
          </div>

          {/* Online meet link */}
          {track.isOnline && track.meetLink && (
            <div style={{ marginTop: 10 }}>
              <a
                href={track.meetLink}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, color: "#1d4ed8", textDecoration: "none",
                  background: "#eff6ff", padding: "5px 12px", borderRadius: 8,
                  border: "1px solid rgba(29,78,216,0.2)",
                }}
              >
                <i className="ti ti-video" />
                انضم للجلسة
              </a>
            </div>
          )}

          {/* Expand toggle */}
          {enrolled > 0 && (
            <button
              onClick={() => setExpandedId(open ? null : track._id)}
              style={{
                marginTop: 12, display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, color: "var(--green)", fontWeight: 600, padding: 0,
              }}
            >
              <i className={`ti ti-chevron-${open ? "up" : "down"}`} />
              {open ? "إخفاء الطلاب" : `عرض الطلاب (${enrolled})`}
            </button>
          )}
          {enrolled === 0 && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text3)" }}>
              <i className="ti ti-user-off" style={{ marginLeft: 4 }} />
              لا يوجد طلاب مسجّلون بعد
            </p>
          )}
        </div>

        {/* Expanded students list */}
        {open && enrolled > 0 && (
          <div style={{ borderTop: "1px solid var(--border)", background: "var(--cream)", padding: "12px 18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {track.enrolledStudents.map((s, idx) => {
                const name = getEnrolledName(s);
                const c    = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div
                    key={getEnrolledId(s)}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: c.bg, color: c.fg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>
                      {avatarInitials(name)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  function Section({ title, icon, items }: { title: string; icon: string; items: SpecialTrack[] }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 28 }}>
        <h4 style={{
          margin: "0 0 12px", fontSize: 13, fontWeight: 700,
          color: "var(--text2)", display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`ti ${icon}`} style={{ color: "var(--green)" }} />
          {title}
          <span style={{
            background: "var(--green-pale)", color: "var(--green)",
            borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 700,
          }}>{items.length}</span>
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((t) => <TrackCard key={t._id} track={t} />)}
        </div>
      </div>
    );
  }

  return (
    <Card>
      {isLoading && (
        <div className="page-loading"><i className="ti ti-loader-2" /> جارٍ التحميل...</div>
      )}

      {!isLoading && tracks.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <i className="ti ti-calendar-off" style={{ fontSize: 40, color: "var(--text3)", display: "block", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>لا توجد مسارات استثنائية</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text3)" }}>
            عندما يُعيّنك الإدارة لمسار سيظهر هنا
          </p>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <>
          <Section title="المسارات النشطة"   icon="ti-circle-check"  items={active}   />
          <Section title="المسارات القادمة"  icon="ti-clock"         items={upcoming} />
          <Section title="المسارات المنتهية" icon="ti-circle-x"      items={ended}    />
        </>
      )}
    </Card>
  );
}
