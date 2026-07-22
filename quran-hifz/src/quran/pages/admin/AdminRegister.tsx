import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { pickMasar } from "../../config/masarMap";
import { useCreateStudent } from "../../api/students";
import { useMasajid } from "../../api/masajid";
import { useHalqat } from "../../api/halqat";

const schema = z.object({
  name: z.string().min(2, "الاسم مطلوب (٢ أحرف على الأقل)"),
  age: z.string().min(1, "العمر مطلوب").refine((v) => Number(v) >= 4 && Number(v) <= 80, "العمر بين ٤ و٨٠"),
  guardianPhone: z
    .string()
    .min(1, "جوال ولي الأمر مطلوب")
    .regex(/^05\d{8}$/, "صيغة الجوال: 05XXXXXXXX"),
  level: z.string().min(1, "يرجى اختيار مستوى القراءة"),
  studentLevel: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 1 && Number(v) <= 10), "المستوى بين ١ و١٠"),
  masjid: z.string().min(1, "يرجى اختيار المسجد"),
  halqa: z.string().min(1, "يرجى اختيار الحلقة"),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  password: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Credentials = { email: string; password: string };

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};
const DIALOG: React.CSSProperties = {
  background: "white", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ color: "var(--red, #c0392b)", fontSize: 12, marginTop: 4 }}>{msg}</div>;
}

export function AdminRegister() {
  useTopbar("ti-user-plus", "تسجيل طالب جديد");

  const { data: masajid = [] } = useMasajid();
  const { data: halqat = [] } = useHalqat();
  const createStudent = useCreateStudent();

  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const level = watch("level");
  const age = watch("age");
  const masar = useMemo(
    () => pickMasar(level, age ? parseInt(age) : undefined),
    [level, age],
  );

  async function onSubmit(data: FormData) {
    const body: Record<string, unknown> = {
      name:          data.name,
      guardian:      "",
      guardianPhone: data.guardianPhone,
      halqa:         data.halqa,
      masjid:        data.masjid,
      path:          masar?.path ?? "حفظ كامل",
      status:        "new",
    };
    if (data.studentLevel)  body.level    = Number(data.studentLevel);
    if (data.email?.trim()) body.email    = data.email.trim();
    if (data.password)      body.password = data.password;

    const res = await createStudent.mutateAsync(body);
    reset();
    if (res.credentials) setCredentials(res.credentials);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card icon="ti-id-badge" title="بيانات الطالب">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">الاسم الكامل <span>*</span></label>
              <input className="form-input" placeholder="اسم الطالب رباعياً" {...register("name")} />
              <FieldError msg={errors.name?.message} />
            </div>
            <div className="form-group">
              <label className="form-label">العمر <span>*</span></label>
              <input className="form-input" type="number" placeholder="بالسنوات" min={4} max={80} {...register("age")} />
              <FieldError msg={errors.age?.message} />
            </div>
            <div className="form-group">
              <label className="form-label">جوال ولي الأمر <span>*</span></label>
              <input className="form-input" type="tel" placeholder="05XXXXXXXX" dir="ltr" {...register("guardianPhone")} />
              <FieldError msg={errors.guardianPhone?.message} />
            </div>
          </div>

          <hr className="divider" />

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">مستوى القراءة الحالي <span>*</span></label>
            <select className="form-input" {...register("level")}>
              <option value="">اختر المستوى</option>
              <option value="لم">لم يتعلم الحروف بعد</option>
              <option value="صعوبة">يعرف الحروف لكن يقرأ بصعوبة</option>
              <option value="مقبول">يقرأ بشكل مقبول مع أخطاء تجويدية</option>
              <option value="طلاقة">يقرأ بطلاقة ويرغب بالحفظ</option>
              <option value="حافظ">حافظ لأجزاء ويريد الختم</option>
              <option value="بالغ">بالغ ويريد التصحيح</option>
            </select>
            <FieldError msg={errors.level?.message} />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">المستوى (رقم من ١ إلى ١٠)</label>
            <input className="form-input" type="number" min={1} max={10} placeholder="مثال: ٣" {...register("studentLevel")} />
            <FieldError msg={errors.studentLevel?.message} />
          </div>

          {masar && (
            <div className="masar-result">
              <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>المسار المقترح تلقائياً</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--green)" }}>{masar.name}</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{masar.desc}</div>
              <div style={{ fontSize: 12, color: "var(--green)", marginTop: 8, fontWeight: 600 }}>
                🕌 الحلقة المقترحة: {masar.halqa}
              </div>
            </div>
          )}

          <hr className="divider" />

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">المسجد <span>*</span></label>
              <select className="form-input" {...register("masjid")}>
                <option value="">اختر المسجد</option>
                {masajid.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
              <FieldError msg={errors.masjid?.message} />
            </div>
            <div className="form-group">
              <label className="form-label">الحلقة <span>*</span></label>
              <select className="form-input" {...register("halqa")}>
                <option value="">اختر الحلقة</option>
                {halqat.map((h) => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
              <FieldError msg={errors.halqa?.message} />
            </div>
          </div>

          <hr className="divider" />

          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
              <i className="ti ti-lock" style={{ marginLeft: 4 }} />
              بيانات الدخول (اختياري — لمنح الطالب حساباً في النظام)
            </p>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <input className="form-input" type="email" placeholder="student@example.com" dir="ltr" {...register("email")} />
                <FieldError msg={errors.email?.message} />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور</label>
                <input className="form-input" type="password" placeholder="6 أحرف على الأقل" dir="ltr" {...register("password")} />
                <FieldError msg={errors.password?.message} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              className="topbar-btn btn-primary"
              style={{ flex: 1, padding: 11, justifyContent: "center", fontSize: 14 }}
              disabled={isSubmitting}
            >
              <i className="ti ti-send" />
              {isSubmitting ? "جارٍ الحفظ..." : "حفظ التسجيل"}
            </button>
            <button type="reset" className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => reset()}>
              <i className="ti ti-x" /> إلغاء
            </button>
          </div>
        </Card>
      </form>

      {createStudent.isError && (
        <div style={{ marginTop: 12 }}>
          <Alert tone="warning">{(createStudent.error as Error).message}</Alert>
        </div>
      )}

      {/* Credentials Success Modal */}
      {credentials && (
        <div style={OVERLAY} onClick={() => setCredentials(null)}>
          <div style={DIALOG} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 44, color: "#22c55e", display: "block" }} />
              <h3 style={{ margin: "12px 0 4px", fontSize: 16 }}>تم تسجيل الطالب وإنشاء حسابه</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>
                احتفظ ببيانات الدخول وأرسلها للطالب
              </p>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>البريد الإلكتروني</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, direction: "ltr", textAlign: "left" }}>{credentials.email}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>كلمة المرور</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, direction: "ltr", textAlign: "left" }}>{credentials.password}</p>
              </div>
            </div>
            <button
              className="topbar-btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: 10 }}
              onClick={() => setCredentials(null)}
            >
              <i className="ti ti-check" /> حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
}
