import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { HalqaRow } from "../../components/common/HalqaRow";
import { SkeletonCard } from "../../components/common/Skeleton";
import { useStudent } from "../../api/students";
import { useTrack, type TrackTeacher } from "../../api/tracks";

function getId(v: unknown): string {
  if (v && typeof v === "object" && "_id" in v) return (v as { _id: string })._id;
  if (typeof v === "string") return v;
  return "";
}
function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "—";
}
function teacherNames(teachers: (TrackTeacher | string)[] | undefined): string {
  if (!teachers || teachers.length === 0) return "—";
  return teachers.map((t) => (typeof t === "object" ? t.name : t)).join(" · ");
}

export function StudentSchedule() {
  const { user } = usePortal();
  const { data: student } = useStudent(user?.profileId);
  const trackId = student ? getId(student.track) : undefined;
  const { data: track, isLoading } = useTrack(trackId);

  useTopbar("ti-clock", "مواعيد مساري");

  if (isLoading) {
    return <SkeletonCard lines={4} />;
  }

  const days = track?.daysPerWeek?.split(/[،,]/).map((d) => d.trim()).filter(Boolean) ?? [];

  return (
    <>
      <Card icon="ti-calendar-event" title={track?.title ?? "مساري"}>
        {days.length > 0 && (
          <div
            className="grid-collapse"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(days.length, 3)}, 1fr)`,
              gap: 12,
              marginBottom: 16,
            }}
          >
            {days.map((day) => (
              <div
                key={day}
                style={{
                  background: "var(--green-pale)",
                  borderRadius: 8,
                  padding: 14,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}>{day}</div>
                {track?.timeSlot && (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                      بعد صلاة الفجر
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2, fontWeight: 600 }} dir="ltr">
                      {track.timeSlot}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <HalqaRow label="الموقع" value={getName(track?.masjid)} />
        <HalqaRow label="المعلم" value={teacherNames(track?.teachers)} />
        <HalqaRow
          label="الموعد القادم"
          value="الثلاثاء — بعد غد"
          valueStyle={{ color: "var(--green)", fontWeight: 700 }}
        />
      </Card>
      <div style={{ marginTop: 14 }}>
        <Alert tone="info" icon="ti-bell">
          سيصلك تذكير على الواتساب قبل كل جلسة بساعة.
        </Alert>
      </div>
    </>
  );
}
