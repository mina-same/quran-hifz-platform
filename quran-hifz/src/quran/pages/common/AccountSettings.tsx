import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTopbar } from "../../context/useTopbar";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Skeleton } from "../../components/common/Skeleton";
import { useMe, useUpdateProfile, useChangePassword } from "../../api/account";
import { ApiError } from "../../../lib/api";

const profileSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب (٢ أحرف على الأقل)"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
    newPassword:      z.string().min(6, "كلمة المرور الجديدة يجب أن تكون ٦ أحرف على الأقل"),
    confirmPassword:  z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ color: "var(--red, #c0392b)", fontSize: 12, marginTop: 4 }}>{msg}</div>;
}

export function AccountSettings() {
  useTopbar("ti-user-circle", "الملف الشخصي");

  const { updateUser } = useAuth();
  const { data: me, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (me) resetProfile({ name: me.name });
  }, [me, resetProfile]);

  async function onProfileSubmit(data: ProfileForm) {
    setProfileSaved(false);
    const res = await updateProfile.mutateAsync(data.name);
    updateUser({ name: res.user.name });
    setProfileSaved(true);
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPasswordSaved(false);
    await changePassword.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    resetPassword();
    setPasswordSaved(true);
  }

  if (isLoading) {
    return (
      <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card icon="ti-id-badge" title="البيانات الشخصية">
          <Skeleton height={38} style={{ marginBottom: 14 }} />
          <Skeleton height={38} />
        </Card>
        <Card icon="ti-lock" title="تغيير كلمة المرور">
          <Skeleton height={38} style={{ marginBottom: 14 }} />
          <Skeleton height={38} style={{ marginBottom: 14 }} />
          <Skeleton height={38} />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Card icon="ti-id-badge" title="البيانات الشخصية">
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} noValidate>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input className="form-input" value={me?.email ?? ""} disabled dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">الاسم الكامل <span>*</span></label>
            <input className="form-input" {...registerProfile("name")} />
            <FieldError msg={profileErrors.name?.message} />
          </div>

          <button
            type="submit"
            className="topbar-btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: 11, marginTop: 6 }}
            disabled={profileSubmitting}
          >
            <i className="ti ti-device-floppy" />
            {profileSubmitting ? "جارٍ الحفظ..." : "حفظ الاسم"}
          </button>

          {profileSaved && (
            <div style={{ marginTop: 12 }}>
              <Alert tone="success" icon="ti-circle-check">تم تحديث الاسم بنجاح</Alert>
            </div>
          )}
          {updateProfile.isError && (
            <div style={{ marginTop: 12 }}>
              <Alert tone="warning">{(updateProfile.error as ApiError).message}</Alert>
            </div>
          )}
        </form>
      </Card>

      <Card icon="ti-lock" title="تغيير كلمة المرور">
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} noValidate>
          <div className="form-group">
            <label className="form-label">كلمة المرور الحالية <span>*</span></label>
            <input className="form-input" type="password" dir="ltr" {...registerPassword("currentPassword")} />
            <FieldError msg={passwordErrors.currentPassword?.message} />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور الجديدة <span>*</span></label>
            <input className="form-input" type="password" dir="ltr" placeholder="٦ أحرف على الأقل" {...registerPassword("newPassword")} />
            <FieldError msg={passwordErrors.newPassword?.message} />
          </div>
          <div className="form-group">
            <label className="form-label">تأكيد كلمة المرور الجديدة <span>*</span></label>
            <input className="form-input" type="password" dir="ltr" {...registerPassword("confirmPassword")} />
            <FieldError msg={passwordErrors.confirmPassword?.message} />
          </div>

          <button
            type="submit"
            className="topbar-btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: 11, marginTop: 6 }}
            disabled={passwordSubmitting}
          >
            <i className="ti ti-key" />
            {passwordSubmitting ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
          </button>

          {passwordSaved && (
            <div style={{ marginTop: 12 }}>
              <Alert tone="success" icon="ti-circle-check">تم تغيير كلمة المرور بنجاح</Alert>
            </div>
          )}
          {changePassword.isError && (
            <div style={{ marginTop: 12 }}>
              <Alert tone="warning">{(changePassword.error as ApiError).message}</Alert>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
