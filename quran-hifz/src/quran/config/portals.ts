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
        { id: "dashboard", icon: "ti-home",           label: "لوحتي" },
        { id: "myhifz",   icon: "ti-book",            label: "خطة حفظي" },
      ]},
      { group: "الأنشطة", items: [
        { id: "attendance",    icon: "ti-calendar-check",  label: "الحضور والغياب" },
        { id: "schedule",      icon: "ti-clock",           label: "مواعيد حلقتي" },
        { id: "specialtracks", icon: "ti-calendar-event",  label: "مساراتي" },
      ]},
      { group: "النقاط والمكافآت", items: [
        { id: "points", icon: "ti-star",          label: "نقاطي" },
        { id: "store",  icon: "ti-shopping-cart", label: "متجر المكافآت" },
      ]},
      { group: "التواصل", items: [
        { id: "messages", icon: "ti-message", label: "الرسائل" },
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
        { id: "myhalqa",       icon: "ti-school",          label: "حلقاتي" },
        { id: "specialtracks", icon: "ti-calendar-event",  label: "مساراتي" },
        { id: "students",      icon: "ti-users",           label: "طلابي" },
        { id: "attendance",    icon: "ti-calendar-check",  label: "الحضور والتقييم",    dot: true },
        { id: "recordlesson",  icon: "ti-player-record",   label: "سجّل درس الحلقة",   dot: true },
        { id: "grouphomework", icon: "ti-list-check",      label: "واجبات الحلقة" },
      ]},
      { group: "التقييم", items: [
        { id: "homework", icon: "ti-microphone", label: "مراجعة الواجبات", dot: true },
        { id: "plans",    icon: "ti-target",     label: "الخطط القرآنية" },
        { id: "reports",  icon: "ti-chart-bar",  label: "تقارير الطلاب" },
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
        { id: "students", icon: "ti-users",        label: "إدارة الطلاب" },
        { id: "register", icon: "ti-user-plus",    label: "تسجيل طالب جديد" },
        { id: "teachers", icon: "ti-chalkboard",   label: "المعلمون" },
        { id: "parents",  icon: "ti-user-heart",   label: "أولياء الأمور" },
      ]},
      { group: "الحلقات والمساجد", items: [
        { id: "halqat",         icon: "ti-school",          label: "الحلقات" },
        { id: "masajid",        icon: "ti-building-arch",   label: "المساجد" },
        { id: "special_tracks", icon: "ti-calendar-event",  label: "المسارات", dot: true },
      ]},
      { group: "التقارير", items: [
        { id: "kpis",    icon: "ti-target",    label: "مؤشرات الأداء" },
        { id: "reports", icon: "ti-chart-bar", label: "التقارير" },
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
