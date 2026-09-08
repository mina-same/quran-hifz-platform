import type { PortalConfig } from "@/lib/types/portal";

export const PORTALS: Record<string, PortalConfig> = {
  student: {
    badge: "بوابة الطالب",
    user: {
      name: "عبدالله الحميداني",
      role: "طالب — مسار عمر بن الخطاب",
      initials: "عح",
    },
    nav: [
      {
        group: "الرئيسية",
        items: [
          {
            id: "dashboard",
            icon: "home",
            label: "لوحتي",
            desc: "نظرة عامة على يومك",
          },
          {
            id: "myhifz",
            icon: "book",
            label: "خطة حفظي",
            desc: "خطتك في الحفظ والمراجعة",
          },
        ],
      },
      {
        group: "الأنشطة",
        items: [
          {
            id: "homework",
            icon: "microphone",
            label: "تسجيل الواجب",
            desc: "سجّل تلاوتك وأرسلها",
            dot: true,
          },
          {
            id: "attendance",
            icon: "calendar-check",
            label: "الحضور والغياب",
            desc: "سجل حضورك في المسار",
          },
          {
            id: "schedule",
            icon: "clock",
            label: "مواعيد مساري",
            desc: "أوقات مسارك الأسبوعية",
          },
          {
            id: "tracks",
            icon: "calendar-event",
            label: "مساراتي",
            desc: "المسارات المسجَّل بها",
          },
        ],
      },
      {
        group: "التواصل والتحفيز",
        items: [
          {
            id: "messages",
            icon: "message",
            label: "الرسائل",
            desc: "رسائلك مع المعلم",
          },
          {
            id: "points",
            icon: "star",
            label: "نقاطي والمتصدرون",
            desc: "نقاطك وترتيبك بين الطلاب",
          },
          {
            id: "store",
            icon: "gift",
            label: "متجر المكافآت",
            desc: "استبدل نقاطك بمكافآت",
          },
        ],
      },
      {
        group: "الحساب",
        items: [
          {
            id: "settings",
            icon: "user-circle",
            label: "الملف الشخصي",
            desc: "تعديل بياناتك الشخصية",
          },
        ],
      },
    ],
  },
  teacher: {
    badge: "بوابة المعلم",
    user: {
      name: "ناصر الحميداني",
      role: "معلم — مسار عمر بن الخطاب",
      initials: "نح",
    },
    nav: [
      {
        group: "الرئيسية",
        items: [
          {
            id: "dashboard",
            icon: "layout-dashboard",
            label: "لوحة التحكم",
            desc: "نظرة عامة على مساراتك",
          },
        ],
      },
      {
        group: "المسارات",
        items: [
          {
            id: "tracks",
            icon: "school",
            label: "مساراتي",
            desc: "إدارة مساراتك ومواعيدها",
          },
          {
            id: "students",
            icon: "users",
            label: "طلابي",
            desc: "متابعة طلاب مساراتك",
          },
          {
            id: "attendance",
            icon: "calendar-check",
            label: "الحضور اليومي",
            desc: "تسجيل حضور اليوم",
            dot: true,
          },
        ],
      },
      {
        group: "التقييم",
        items: [
          {
            id: "homework",
            icon: "microphone",
            label: "مراجعة الواجبات",
            desc: "الاستماع للتلاوات وتقييمها",
            dot: true,
          },
          {
            id: "evaluate",
            icon: "star",
            label: "تقييم الجلسة",
            desc: "قيم جلسة المراجعة",
          },
          {
            id: "recordlesson",
            icon: "video",
            label: "تسجيل الدرس",
            desc: "سجل دروسك الصوتية",
          },
          {
            id: "grouphomework",
            icon: "list-check",
            label: "واجب جماعي",
            desc: "متابعة واجبات المجموعة",
          },
          {
            id: "plans",
            icon: "target",
            label: "الخطط الفردية",
            desc: "تحديد أهدافك اليومية",
          },
          {
            id: "reports",
            icon: "chart-bar",
            label: "تقارير الطلاب",
            desc: "عرض أداء الطلاب",
          },
        ],
      },
      {
        group: "الحساب",
        items: [
          {
            id: "settings",
            icon: "user-circle",
            label: "الملف الشخصي",
            desc: "تعديل بياناتك الشخصية",
          },
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
          {
            id: "dashboard",
            icon: "layout-dashboard",
            label: "لوحة التحكم",
            desc: "نظرة عامة على الجمعية",
          },
        ],
      },
      {
        group: "الطلاب والمعلمون",
        items: [
          {
            id: "students",
            icon: "users",
            label: "إدارة الطلاب",
            desc: "بيانات الطلاب ومساراتهم",
          },
          {
            id: "register",
            icon: "user-plus",
            label: "تسجيل طالب جديد",
            desc: "إضافة طالب إلى مسار",
          },
          {
            id: "teachers",
            icon: "chalkboard",
            label: "المعلمون",
            desc: "بيانات المعلمين ومساراتهم",
          },
          {
            id: "parents",
            icon: "user-heart",
            label: "أولياء الأمور",
            desc: "حسابات أولياء الأمور وربطها",
          },
        ],
      },
      {
        group: "المسارات والمساجد",
        items: [
          {
            id: "tracks",
            icon: "school",
            label: "المسارات",
            desc: "إدارة المسارات ومواعيدها",
          },
          {
            id: "masajid",
            icon: "building-arch",
            label: "المساجد",
            desc: "إدارة المساجد ومقارها",
          },
        ],
      },
      {
        group: "التقارير والبرامج",
        items: [
          {
            id: "kpis",
            icon: "target",
            label: "مؤشرات الأداء",
            desc: "مؤشرات أداء الجمعية",
          },
          {
            id: "reports",
            icon: "chart-bar",
            label: "التقارير",
            desc: "تقارير الحفظ والحضور",
          },
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
          {
            id: "dashboard",
            icon: "home",
            label: "لوحتي",
            desc: "نظرة عامة على ابنك",
          },
        ],
      },
      {
        group: "متابعة الطالب",
        items: [
          {
            id: "timeline",
            icon: "timeline",
            label: "مسيرة الحفظ",
            desc: "تقدم ابنك في الحفظ",
          },
          {
            id: "recordings",
            icon: "microphone",
            label: "الدروس المسجّلة",
            desc: "استمع لتلاوات ابنك",
            dot: true,
          },
          {
            id: "homework_view",
            icon: "list-check",
            label: "واجبات ابني",
            desc: "متابعة واجبات ابنك",
            dot: true,
          },
          {
            id: "attendance",
            icon: "calendar-check",
            label: "سجل الحضور",
            desc: "سجل حضور ابنك",
          },
        ],
      },
      {
        group: "التواصل",
        items: [
          {
            id: "messages",
            icon: "message",
            label: "الرسائل",
            desc: "رسائلك مع المعلم",
          },
        ],
      },
    ],
  },
};

export const PORTAL_ROUTES: Record<string, string> = {
  student: "/(portal)/student/dashboard",
  teacher: "/(portal)/teacher/dashboard",
  admin: "/(portal)/admin/dashboard",
  parent: "/(portal)/parent/dashboard",
};
