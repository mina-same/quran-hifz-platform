import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { SkeletonCardGrid } from "../../components/common/Skeleton";
import { useSpecialTracks, type SpecialTrack, type TrackTeacher } from "../../api/special-tracks";

const STATUS_LABEL: Record<string, string> = {
  active:   "نشط الآن",
  upcoming: "قادم",
  ended:    "منتهي",
};
const STATUS_TONE: Record<string, "green" | "gold" | "red"> = {
  active:   "green",
  upcoming: "gold",
  ended:    "red",
};

const TYPE_LABEL: Record<string, string> = {
  "مراجعة مكثّفة": "مراجعة مكثّفة", "تجويد": "تجويد",
  "إجازة": "إجازة", "ختمة مسرّعة": "ختمة مسرّعة",
  "برنامج رمضاني": "برنامج رمضاني", "تحضير مسابقة": "تحضير مسابقة", "أخرى": "أخرى",
};
const DAYS_LABEL: Record<string, string> = {
  "يومياً": "يومياً", "مرتين أسبوعياً": "مرتين أسبوعياً",
  "ثلاث مرات أسبوعياً": "ثلاث مرات أسبوعياً",
  "عطلة نهاية الأسبوع": "عطلة نهاية الأسبوع",
};

function teacherName(t: TrackTeacher | string): string {
  return typeof t === "object" ? t.name : t;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}
function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

function TrackCard({ track }: { track: SpecialTrack }) {
  const days = daysLeft(track.endDate);

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 16,
      overflow: "hidden", background: "var(--surface)",
    }}>
      {/* Colored top bar */}
      <div style={{
        height: 5,
        background: track.status === "active"
          ? "linear-gradient(90deg, var(--green), var(--green2))"
          : track.status === "upcoming"
          ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
          : "var(--border)",
      }} />

      <div style={{ padding: "18px 20px" }}>
        {/* Badges row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <Badge tone={STATUS_TONE[track.status] ?? "gold"}>
            {STATUS_LABEL[track.status] ?? track.status}
          </Badge>
          <span style={{
            fontSize: 11, background: "var(--cream)", color: "var(--text2)",
            borderRadius: 6, padding: "2px 8px",
          }}>
            {TYPE_LABEL[track.type] ?? track.type}
          </span>
          {track.isOnline && (
            <span style={{
              fontSize: 11, background: "#eff6ff", color: "#1d4ed8",
              borderRadius: 6, padding: "2px 8px",
            }}>
              <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>
          {track.title}
        </h3>

        {/* Info grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px",
          fontSize: 13, color: "var(--text2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--green-pale)", color: "var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0,
            }}>
              <i className="ti ti-user" />
            </span>
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>المعلمون</div>
              <div style={{ fontWeight: 600 }}>{track.teachers.map(teacherName).join(" · ") || "—"}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--gold-pale)", color: "#92400e",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0,
            }}>
              <i className="ti ti-clock" />
            </span>
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>الوقت</div>
              <div style={{ fontWeight: 600 }}>{track.timeSlot}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "#eff6ff", color: "#1d4ed8",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0,
            }}>
              <i className="ti ti-calendar-repeat" />
            </span>
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>الجدول</div>
              <div style={{ fontWeight: 600 }}>{DAYS_LABEL[track.daysPerWeek] ?? track.daysPerWeek}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: track.isOnline ? "#eff6ff" : "var(--green-pale)",
              color: track.isOnline ? "#1d4ed8" : "var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0,
            }}>
              <i className={`ti ${track.isOnline ? "ti-video" : "ti-map-pin"}`} />
            </span>
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>المكان</div>
              <div style={{ fontWeight: 600 }}>{track.isOnline ? "أونلاين" : track.location}</div>
            </div>
          </div>
        </div>

        {/* Date range */}
        <div style={{
          marginTop: 14, padding: "10px 12px",
          background: "var(--cream)", borderRadius: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: "var(--text2)",
        }}>
          <span>
            <i className="ti ti-calendar-event" style={{ marginLeft: 4, color: "var(--green)" }} />
            {fmtDate(track.startDate)} — {fmtDate(track.endDate)}
          </span>
          {track.status !== "ended" && (
            <span style={{ fontWeight: 700, color: days <= 7 ? "#ef4444" : "var(--text2)" }}>
              {days > 0 ? `${days} يوم متبقي` : "ينتهي اليوم"}
            </span>
          )}
        </div>

        {/* Meet link */}
        {track.isOnline && track.meetLink && track.status === "active" && (
          <a
            href={track.meetLink}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 16px", borderRadius: 10, textDecoration: "none",
              background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              color: "#fff", fontWeight: 700, fontSize: 13,
              border: "none",
            }}
          >
            <i className="ti ti-video" />
            انضم للجلسة الآن
          </a>
        )}

        {/* Notes */}
        {track.notes && (
          <div style={{
            marginTop: 12, padding: "10px 12px",
            background: "var(--gold-pale)", borderRadius: 10,
            fontSize: 12, color: "#92400e",
          }}>
            <i className="ti ti-info-circle" style={{ marginLeft: 5 }} />
            {track.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export function StudentSpecialTracks() {
  useTopbar("ti-star", "مساراتي الاستثنائية");
  const { user } = usePortal();

  const { data: tracks = [], isLoading } = useSpecialTracks(
    undefined,
    undefined,
    user?.profileId as string | undefined,
  );

  const active   = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended    = tracks.filter((t) => t.status === "ended");

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
            <i className="ti ti-star" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            لم تُسجَّل في أي مسار استثنائي
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text3)", maxWidth: 280, marginInline: "auto" }}>
            تواصل مع معلمك أو الإدارة للانضمام إلى أحد البرامج الاستثنائية
          </p>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {active.length > 0 && (
            <div>
              <h4 style={{
                margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "var(--text2)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className="ti ti-circle-check" style={{ color: "var(--green)" }} />
                المسارات النشطة
                <span style={{ background: "var(--green-pale)", color: "var(--green)", borderRadius: 99, padding: "1px 8px", fontSize: 11 }}>
                  {active.length}
                </span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {active.map((t) => <TrackCard key={t._id} track={t} />)}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <h4 style={{
                margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "var(--text2)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className="ti ti-clock" style={{ color: "#f59e0b" }} />
                المسارات القادمة
                <span style={{ background: "var(--gold-pale)", color: "#92400e", borderRadius: 99, padding: "1px 8px", fontSize: 11 }}>
                  {upcoming.length}
                </span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {upcoming.map((t) => <TrackCard key={t._id} track={t} />)}
              </div>
            </div>
          )}

          {ended.length > 0 && (
            <div>
              <h4 style={{
                margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "var(--text2)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className="ti ti-circle-x" style={{ color: "var(--text3)" }} />
                المسارات المنتهية
                <span style={{ background: "var(--cream)", color: "var(--text3)", borderRadius: 99, padding: "1px 8px", fontSize: 11 }}>
                  {ended.length}
                </span>
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: 0.7 }}>
                {ended.map((t) => <TrackCard key={t._id} track={t} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
