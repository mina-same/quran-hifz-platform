export type PortalKey = "student" | "teacher" | "admin" | "parent";

export type NavItem = {
  id: string;
  icon: string;
  label: string;
  dot?: boolean;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export type PortalConfig = {
  badge: string;
  user: { name: string; role: string; initials: string };
  nav: NavGroup[];
};

export const PORTALS: Record<PortalKey, PortalConfig> = {
  student: {
    badge: "بوابة الطالب",
    user: { name: "عبدالله الحميداني", role: "طالب — حلقة عمر بن الخطاب", initials: "عح" },
    nav: [
      { group: "الرئيسية", items: [
        { id: "dashboard", icon: "ti-home", label: "لوحتي" },
        { id: "myhifz", icon: "ti-book", label: "خطة حفظي" },
      ]},
      { group: "الأنشطة", items: [
        { id: "homework", icon: "ti-microphone", label: "تسجيل الواجب", dot: true },
        { id: "attendance", icon: "ti-calendar-check", label: "الحضور والغياب" },
        { id: "schedule", icon: "ti-clock", label: "مواعيد حلقتي" },
      ]},
      { group: "التواصل والتحفيز", items: [
        { id: "messages", icon: "ti-message", label: "الرسائل" },
        { id: "points",   icon: "ti-star", label: "نقاطي والمتصدرون" },
        { id: "store",    icon: "ti-gift", label: "متجر المكافآت" },
      ]},
    ],
  },
  teacher: {
    badge: "بوابة المعلم",
    user: { name: "ناصر الحميداني", role: "معلم — حلقة عمر بن الخطاب", initials: "نح" },
    nav: [
      { group: "الرئيسية", items: [
        { id: "dashboard", icon: "ti-layout-dashboard", label: "لوحة التحكم" },
      ]},
      { group: "الحلقات", items: [
        { id: "myhalqa",    icon: "ti-school", label: "حلقاتي" },
        { id: "students",   icon: "ti-users", label: "طلابي" },
        { id: "attendance", icon: "ti-calendar-check", label: "الحضور اليومي", dot: true },
      ]},
      { group: "التقييم", items: [
        { id: "homework",      icon: "ti-microphone", label: "مراجعة الواجبات", dot: true },
        { id: "evaluate",      icon: "ti-star", label: "تقييم الجلسة" },
        { id: "recordlesson",  icon: "ti-video", label: "تسجيل الدرس" },
        { id: "grouphomework", icon: "ti-list-check", label: "واجب جماعي" },
        { id: "plans",         icon: "ti-target", label: "الخطط الفردية" },
        { id: "reports",       icon: "ti-chart-bar", label: "تقارير الطلاب" },
      ]},
    ],
  },
  admin: {
    badge: "بوابة الإدارة",
    user: { name: "إدارة الجمعية", role: "مدير النظام", initials: "إد" },
    nav: [
      { group: "الرئيسية", items: [
        { id: "dashboard", icon: "ti-layout-dashboard", label: "لوحة التحكم" },
      ]},
      { group: "الطلاب والمعلمون", items: [
        { id: "students", icon: "ti-users", label: "إدارة الطلاب" },
        { id: "register", icon: "ti-user-plus", label: "تسجيل طالب جديد" },
        { id: "teachers", icon: "ti-chalkboard", label: "المعلمون" },
      ]},
      { group: "الحلقات والمساجد", items: [
        { id: "halqat",  icon: "ti-school", label: "الحلقات" },
        { id: "masajid", icon: "ti-building-arch", label: "المساجد" },
      ]},
      { group: "التقارير والبرامج", items: [
        { id: "kpis",           icon: "ti-target", label: "مؤشرات الأداء" },
        { id: "reports",        icon: "ti-chart-bar", label: "التقارير" },
        { id: "special_tracks", icon: "ti-calendar-event", label: "المسارات الاستثنائية", dot: true },
      ]},
    ],
  },
  parent: {
    badge: "بوابة ولي الأمر",
    user: { name: "عبدالحميد الحميداني", role: "ولي أمر — عبدالله الحميداني", initials: "عح" },
    nav: [
      { group: "الرئيسية", items: [
        { id: "dashboard", icon: "ti-home", label: "لوحتي" },
      ]},
      { group: "متابعة الطالب", items: [
        { id: "timeline",      icon: "ti-timeline", label: "مسيرة الحفظ" },
        { id: "recordings",    icon: "ti-microphone", label: "الدروس المسجّلة", dot: true },
        { id: "homework_view", icon: "ti-list-check", label: "واجبات ابني", dot: true },
        { id: "attendance",    icon: "ti-calendar-check", label: "سجل الحضور" },
      ]},
      { group: "التواصل", items: [
        { id: "messages", icon: "ti-message", label: "الرسائل" },
      ]},
    ],
  },
};
