import type { Student, HifzEntry, AttendanceRecord, Message } from '@/lib/types/student';

export const STUDENTS: Student[] = [
  { id: '1', name: 'عبدالله الحميداني', path: 'حفظ كامل', halqa: 'حلقة عمر بن الخطاب', mosque: 'مسجد الفاروق', attendancePct: 94, progressPct: 68, progressPages: 408, totalPages: 604, guardian: 'محمد الحميداني', guardianPhone: '05XXXXXXXX', lastMemorization: 'البقرة ١-٢٠', status: 'active', homeworkStatus: 'submitted' },
  { id: '2', name: 'يوسف العمري',       path: 'حفظ كامل', halqa: 'حلقة عمر بن الخطاب', mosque: 'مسجد الفاروق', attendancePct: 88, progressPct: 52, progressPages: 314, totalPages: 604, guardian: 'عمر العمري',    guardianPhone: '05XXXXXXXX', lastMemorization: 'آل عمران ١-١٥', status: 'active', homeworkStatus: 'pending' },
  { id: '3', name: 'سلطان المطيري',     path: 'عشرون جزءاً', halqa: 'حلقة أبي بكر',    mosque: 'مسجد النور',   attendancePct: 100, progressPct: 78, progressPages: 235, totalPages: 302, guardian: 'فيصل المطيري',   guardianPhone: '05XXXXXXXX', lastMemorization: 'النساء ٥-١٢',  status: 'active', homeworkStatus: 'submitted' },
  { id: '4', name: 'فهد الشمري',        path: 'عشرة أجزاء',  halqa: 'حلقة أبي بكر',    mosque: 'مسجد النور',   attendancePct: 75, progressPct: 45, progressPages: 68, totalPages: 151,  guardian: 'خالد الشمري',    guardianPhone: '05XXXXXXXX', lastMemorization: 'المائدة ١-٨',  status: 'active', homeworkStatus: 'late' },
  { id: '5', name: 'ماجد القحطاني',     path: 'حفظ كامل', halqa: 'حلقة علي بن أبي طالب', mosque: 'مسجد التقوى', attendancePct: 82, progressPct: 35, progressPages: 211, totalPages: 604, guardian: 'ناصر القحطاني',  guardianPhone: '05XXXXXXXX', lastMemorization: 'الأنعام ١-٦', status: 'active', homeworkStatus: 'submitted' },
  { id: '6', name: 'عمر الدوسري',       path: 'عشرون جزءاً', halqa: 'حلقة علي بن أبي طالب', mosque: 'مسجد التقوى', attendancePct: 91, progressPct: 62, progressPages: 187, totalPages: 302, guardian: 'سعد الدوسري',    guardianPhone: '05XXXXXXXX', lastMemorization: 'الأعراف ١-١٠', status: 'active', homeworkStatus: 'submitted' },
];

export const MY_HIFZ_PLAN: HifzEntry[] = [
  { surah: 'الفاتحة',   status: 'مكتمل', completionDate: '١٤٤٥/٠١/١٠' },
  { surah: 'البقرة',    status: 'مكتمل', completionDate: '١٤٤٥/٠٣/٢٢' },
  { surah: 'آل عمران', status: 'مكتمل', completionDate: '١٤٤٥/٠٦/١٥' },
  { surah: 'النساء',   status: 'جارٍ' },
  { surah: 'المائدة',  status: 'لم يبدأ' },
  { surah: 'الأنعام',  status: 'لم يبدأ' },
  { surah: 'الأعراف',  status: 'لم يبدأ' },
  { surah: 'الأنفال',  status: 'لم يبدأ' },
];

export const MY_ATTENDANCE: AttendanceRecord[] = [
  { date: '١٤٤٥/١٠/٢٠', day: 'السبت',    time: '٥:٠٠ م', status: 'حاضر' },
  { date: '١٤٤٥/١٠/١٨', day: 'الخميس',   time: '٥:٠٠ م', status: 'حاضر' },
  { date: '١٤٤٥/١٠/١٥', day: 'الاثنين',  time: '٥:٠٠ م', status: 'حاضر' },
  { date: '١٤٤٥/١٠/١٣', day: 'السبت',    time: '٥:٠٠ م', status: 'متأخر' },
  { date: '١٤٤٥/١٠/١١', day: 'الخميس',   time: '٥:٠٠ م', status: 'غائب' },
  { date: '١٤٤٥/١٠/٠٨', day: 'الاثنين',  time: '٥:٠٠ م', status: 'حاضر' },
  { date: '١٤٤٥/١٠/٠٦', day: 'السبت',    time: '٥:٠٠ م', status: 'حاضر' },
  { date: '١٤٤٥/١٠/٠٤', day: 'الخميس',   time: '٥:٠٠ م', status: 'حاضر' },
];

export const MY_MESSAGES: Message[] = [
  { id: '1', sender: 'الأستاذ ناصر الحميداني', senderRole: 'معلم', initials: 'نح', preview: 'أحسنت يا عبدالله، الواجب ممتاز اليوم. حافظ على هذا المستوى.', time: 'منذ ساعة', unread: true },
  { id: '2', sender: 'إدارة الجمعية',           senderRole: 'إدارة', initials: 'إد', preview: 'تذكير: موعد الاختبار الشهري يوم الخميس القادم الساعة ٤ م.', time: 'أمس', unread: true },
  { id: '3', sender: 'الأستاذ ناصر الحميداني', senderRole: 'معلم', initials: 'نح', preview: 'الواجب لهذا الأسبوع: مراجعة سورة النساء من آية ١ إلى ٣٠.', time: '٣ أيام', unread: false },
  { id: '4', sender: 'إدارة الجمعية',           senderRole: 'إدارة', initials: 'إد', preview: 'إشعار: تم تحديث جدول الحلقات الأسبوعي. تفضل بمراجعته.', time: 'أسبوع', unread: false },
];
