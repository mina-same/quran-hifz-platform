import type { PortalConfig } from "@/lib/types/portal";

export const PORTALS: Record<string, PortalConfig> = {
  student: {
    badge: "بوابة الطالب",
    user: {
      name: "عبدالله الحميداني",
      role: "طالب — مسار الإتقان",
      initials: "عح",
    },
    nav: [
      {
        group: "الرئيسية",
        items: [
          { id: "dashboard", icon: "home", label: "لوحتي", desc: "نظرة عامة على يومك" },
          { id: "myhifz", icon: "book", label: "خطة حفظي", desc: "خطتك في الحفظ والمراجعة" },
        ],
      },
      {
        group: "الأنشطة",
        items: [
          { id: "attendance", icon: "calendar-check", label: "الحضور والغياب", desc: "سجل حضورك في المسار" },
          { id: "schedule", icon: "clock", label: "مواعيد حلقتي", desc: "أوقات مسارك الأسبوعية" },
          { id: "tracks", icon: "calendar-event", label: "مساري", desc: "المسار المسجَّل به" },
        ],
      },
      {
        group: "النقاط والمكافآت",
        items: [
          { id: "points", icon: "star", label: "نقاطي", desc: "نقاطك وترتيبك بين الطلاب" },
          { id: "leaderboard", icon: "trophy", label: "لوحة الشرف", desc: "ترتيبك في حلقتك وبين كل الحلقات" },
          { id: "store", icon: "gift", label: "متجر المكافآت", desc: "استبدل نقاطك بمكافآت" },
        ],
      },
      {
        group: "التواصل",
        items: [
          { id: "messages", icon: "message", label: "الرسائل", desc: "رسائلك مع المعلم" },
        ],
      },
      {
        group: "الحساب",
        items: [
          { id: "settings", icon: "user-circle", label: "الملف الشخصي", desc: "تعديل بياناتك الشخصية" },
        ],
      },
    ],
  },
  teacher: {
    badge: "بوابة المعلم",
    user: {
      name: "ناصر الحميداني",
      role: "معلم — مسار الإتقان",
      initials: "نح",
    },
    nav: [
      {
        group: "الرئيسية",
        items: [
          { id: "dashboard", icon: "layout-dashboard", label: "لوحة التحكم", desc: "نظرة عامة على مساراتك" },
        ],
      },
      {
        group: "المسارات",
        items: [
          { id: "tracks", icon: "calendar-event", label: "مساراتي", desc: "المسارات المسجَّل بها" },
          { id: "students", icon: "users", label: "طلابي", desc: "متابعة طلاب مساراتك" },
          { id: "attendance", icon: "calendar-check", label: "الحضور والتقييم", desc: "تسجيل حضور اليوم وتقييمه", dot: true },
          { id: "dailyreport", icon: "report", label: "التقرير اليومي", desc: "إرسال تقرير الحلقة اليومي" },
          { id: "recordlesson", icon: "video", label: "سجّل درس المسار", desc: "سجل دروسك الصوتية", dot: true },
          { id: "grouphomework", icon: "list-check", label: "واجبات المسار", desc: "متابعة واجبات المسار" },
        ],
      },
      {
        group: "التقييم",
        items: [
          { id: "homework", icon: "microphone", label: "مراجعة الواجبات", desc: "الاستماع للتلاوات وتقييمها", dot: true },
          { id: "plans", icon: "target", label: "الخطط القرآنية", desc: "خطط الحفظ والمراجعة" },
          { id: "reports", icon: "chart-bar", label: "تقارير الطلاب", desc: "عرض أداء الطلاب" },
        ],
      },
      {
        group: "التواصل",
        items: [
          { id: "messages", icon: "message", label: "الرسائل", desc: "محادثاتك مع أولياء الأمور" },
        ],
      },
      {
        group: "الحساب",
        items: [
          { id: "settings", icon: "user-circle", label: "الملف الشخصي", desc: "تعديل بياناتك الشخصية" },
        ],
      },
    ],
  },
  admin: {
    badge: "بوابة الإدارة",
    user: { name: "إدارة الجمعية", role: "مدير النظام", initials: "إد" },
    nav: [
      {
        group: "الرئيسية",
        items: [
          { id: "dashboard", icon: "layout-dashboard", label: "لوحة التحكم", desc: "نظرة عامة على الجمعية" },
        ],
      },
      {
        group: "الطلاب والمعلمون",
        items: [
          { id: "students", icon: "users", label: "إدارة الطلاب", desc: "بيانات الطلاب ومساراتهم" },
          { id: "register", icon: "user-plus", label: "تسجيل طالب جديد", desc: "إضافة طالب إلى مسار" },
          { id: "teachers", icon: "chalkboard", label: "المعلمون", desc: "بيانات المعلمين ومساراتهم" },
          { id: "parents", icon: "user-heart", label: "أولياء الأمور", desc: "حسابات أولياء الأمور وربطها" },
          { id: "supervisors", icon: "shield-check", label: "المشرفون", desc: "حسابات المشرفين وصلاحياتهم" },
        ],
      },
      {
        group: "المساجد والمسارات",
        items: [
          { id: "masajid", icon: "building-arch", label: "المساجد والدور النسائية", desc: "إدارة المساجد والدور النسائية ومقارها" },
          { id: "tracks", icon: "calendar-event", label: "المسارات", desc: "إدارة المسارات", dot: true },
        ],
      },
      {
        group: "التقارير",
        items: [
          { id: "dailyreports", icon: "report", label: "التقارير اليومية", desc: "تقارير الحلقات اليومية" },
          { id: "kpis", icon: "target", label: "مؤشرات الأداء", desc: "مؤشرات أداء الجمعية" },
          { id: "reports", icon: "chart-bar", label: "التقارير", desc: "تقارير الحفظ والحضور" },
        ],
      },
      {
        group: "التواصل",
        items: [
          { id: "messages", icon: "message", label: "الرسائل", desc: "ملاحظات الطلاب الواردة" },
        ],
      },
    ],
  },
  parent: {
    badge: "بوابة ولي الأمر",
    user: {
      name: "عبدالحميد الحميداني",
      role: "ولي أمر — عبدالله الحميداني",
      initials: "عح",
    },
    nav: [
      {
        group: "الرئيسية",
        items: [
          { id: "dashboard", icon: "home", label: "لوحتي", desc: "نظرة عامة على ابنك" },
        ],
      },
      {
        group: "متابعة الطالب",
        items: [
          { id: "timeline", icon: "timeline", label: "مسيرة الحفظ", desc: "تقدم ابنك في الحفظ" },
          { id: "recordings", icon: "microphone", label: "الدروس المسجّلة", desc: "استمع لتلاوات ابنك", dot: true },
          { id: "homework_view", icon: "list-check", label: "واجبات ابني", desc: "متابعة واجبات ابنك", dot: true },
          { id: "attendance", icon: "calendar-check", label: "سجل الحضور", desc: "سجل حضور ابنك" },
        ],
      },
      {
        group: "التواصل",
        items: [
          { id: "messages", icon: "message", label: "الرسائل", desc: "رسائلك مع المعلم" },
        ],
      },
    ],
  },
};

// Supervisor reuses admin's own screens (see app/(portal)/_layout.tsx), so its
// nav mirrors admin's nav minus the two admin-only items: "register" (a
// pure-create page with no read-only view of itself) and "supervisors"
// (managing other supervisors is admin-only, out of scope for a supervisor).
const SUPERVISOR_EXCLUDED_NAV_IDS = new Set(["register", "supervisors"]);
PORTALS.supervisor = {
  badge: "بوابة الإشراف",
  user: { name: "مشرف", role: "مشرف — اطلاع فقط", initials: "مش" },
  nav: PORTALS.admin.nav
    .map((g) => ({ ...g, items: g.items.filter((i) => !SUPERVISOR_EXCLUDED_NAV_IDS.has(i.id)).map(({ dot: _dot, ...i }) => i) }))
    .filter((g) => g.items.length > 0),
};

export const PORTAL_ROUTES: Record<string, string> = {
  student: "/(portal)/student/dashboard",
  teacher: "/(portal)/teacher/dashboard",
  admin: "/(portal)/admin/dashboard",
  parent: "/(portal)/parent/dashboard",
  // Reuses the admin path group's screens (same route, same tab layout) — see
  // app/(portal)/_layout.tsx's role→path-group mapping.
  supervisor: "/(portal)/admin/dashboard",
};
