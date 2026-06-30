import type { PortalConfig } from '@/lib/types/portal';

export const PORTALS: Record<string, PortalConfig> = {
  student: {
    badge: 'بوابة الطالب',
    user: { name: 'عبدالله الحميداني', role: 'طالب — حلقة عمر بن الخطاب', initials: 'عح' },
    nav: [
      { group: 'الرئيسية', items: [
        { id: 'dashboard', icon: 'home',           label: 'لوحتي' },
        { id: 'myhifz',   icon: 'book',            label: 'خطة حفظي' },
      ]},
      { group: 'الأنشطة', items: [
        { id: 'homework',   icon: 'microphone',     label: 'تسجيل الواجب', dot: true },
        { id: 'attendance', icon: 'calendar-check', label: 'الحضور والغياب' },
        { id: 'schedule',   icon: 'clock',          label: 'مواعيد حلقتي' },
      ]},
      { group: 'التواصل والتحفيز', items: [
        { id: 'messages', icon: 'message',  label: 'الرسائل' },
        { id: 'points',   icon: 'star',     label: 'نقاطي والمتصدرون' },
        { id: 'store',    icon: 'gift',     label: 'متجر المكافآت' },
      ]},
    ],
  },
  teacher: {
    badge: 'بوابة المعلم',
    user: { name: 'ناصر الحميداني', role: 'معلم — حلقة عمر بن الخطاب', initials: 'نح' },
    nav: [
      { group: 'الرئيسية', items: [
        { id: 'dashboard', icon: 'layout-dashboard', label: 'لوحة التحكم' },
      ]},
      { group: 'الحلقات', items: [
        { id: 'myhalqa',    icon: 'school',          label: 'حلقاتي' },
        { id: 'students',   icon: 'users',           label: 'طلابي' },
        { id: 'attendance', icon: 'calendar-check',  label: 'الحضور اليومي', dot: true },
      ]},
      { group: 'التقييم', items: [
        { id: 'homework',      icon: 'microphone',  label: 'مراجعة الواجبات', dot: true },
        { id: 'evaluate',      icon: 'star',        label: 'تقييم الجلسة' },
        { id: 'recordlesson',  icon: 'video',       label: 'تسجيل الدرس' },
        { id: 'grouphomework', icon: 'list-check',  label: 'واجب جماعي' },
        { id: 'plans',         icon: 'target',      label: 'الخطط الفردية' },
        { id: 'reports',       icon: 'chart-bar',   label: 'تقارير الطلاب' },
      ]},
    ],
  },
  admin: {
    badge: 'بوابة الإدارة',
    user: { name: 'إدارة الجمعية', role: 'مدير النظام', initials: 'إد' },
    nav: [
      { group: 'الرئيسية', items: [
        { id: 'dashboard', icon: 'layout-dashboard', label: 'لوحة التحكم' },
      ]},
      { group: 'الطلاب والمعلمون', items: [
        { id: 'students', icon: 'users',       label: 'إدارة الطلاب' },
        { id: 'register', icon: 'user-plus',   label: 'تسجيل طالب جديد' },
        { id: 'teachers', icon: 'chalkboard',  label: 'المعلمون' },
      ]},
      { group: 'الحلقات والمساجد', items: [
        { id: 'halqat',  icon: 'school',        label: 'الحلقات' },
        { id: 'masajid', icon: 'building-arch', label: 'المساجد' },
      ]},
      { group: 'التقارير والبرامج', items: [
        { id: 'kpis',           icon: 'target',         label: 'مؤشرات الأداء' },
        { id: 'reports',        icon: 'chart-bar',      label: 'التقارير' },
        { id: 'special_tracks', icon: 'calendar-event', label: 'المسارات الاستثنائية', dot: true },
      ]},
    ],
  },
  parent: {
    badge: 'بوابة ولي الأمر',
    user: { name: 'عبدالحميد الحميداني', role: 'ولي أمر — عبدالله الحميداني', initials: 'عح' },
    nav: [
      { group: 'الرئيسية', items: [
        { id: 'dashboard', icon: 'home', label: 'لوحتي' },
      ]},
      { group: 'متابعة الطالب', items: [
        { id: 'timeline',      icon: 'timeline',       label: 'مسيرة الحفظ' },
        { id: 'recordings',    icon: 'microphone',     label: 'الدروس المسجّلة', dot: true },
        { id: 'homework_view', icon: 'list-check',     label: 'واجبات ابني', dot: true },
        { id: 'attendance',    icon: 'calendar-check', label: 'سجل الحضور' },
      ]},
      { group: 'التواصل', items: [
        { id: 'messages', icon: 'message', label: 'الرسائل' },
      ]},
    ],
  },
};

export const PORTAL_ROUTES: Record<string, string> = {
  student: '/(portal)/student/dashboard',
  teacher: '/(portal)/teacher/dashboard',
  admin:   '/(portal)/admin/dashboard',
  parent:  '/(portal)/parent/dashboard',
};
