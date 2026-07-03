import { usePortal } from "../../context/PortalContext";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { HalqaRow } from "../../components/common/HalqaRow";
import { SkeletonCard } from "../../components/common/Skeleton";
import { useStudent } from "../../api/students";
import { useHalqa } from "../../api/halqat";

function getId(v: unknown): string {
  if (v && typeof v === "object" && "_id" in v) return (v as { _id: string })._id;
  if (typeof v === "string") return v;
  return "";
}
function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return "—";
}

export function StudentSchedule() {
  const { user } = usePortal();
  const { data: student } = useStudent(user?.profileId);
  const halqaId = student ? getId(student.halqa) : undefined;
  const { data: halqa, isLoading } = useHalqa(halqaId);

  useTopbar("ti-clock", "مواعيد حلقتي");

  if (isLoading) {
    return <SkeletonCard lines={4} />;
  }

  const days = halqa?.days?.split(/[،,]/).map((d) => d.trim()).filter(Boolean) ?? [];

  return (
    <>
      <Card icon="ti-school" title={halqa?.name ?? "حلقتي"}>
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
                {halqa?.time && (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                      بعد صلاة الفجر
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2, fontWeight: 600 }} dir="ltr">
                      {halqa.time}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <HalqaRow label="الموقع" value={getName(halqa?.masjid)} />
        <HalqaRow label="المعلم" value={getName(halqa?.teacher)} />
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
