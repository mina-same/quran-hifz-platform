import type { Teacher, HomeworkReview, IndividualPlan } from '@/lib/types/teacher';

export const TEACHERS: Teacher[] = [
  { id: '1', name: 'ناصر الحميداني',  specialty: 'حفظ وتجويد', halqatCount: 2, studentCount: 24, rating: 'ممتاز',    status: 'active' },
  { id: '2', name: 'سعد المالكي',     specialty: 'تجويد وقراءات', halqatCount: 1, studentCount: 18, rating: 'جيد جداً', status: 'active' },
  { id: '3', name: 'فيصل العتيبي',    specialty: 'حفظ',          halqatCount: 2, studentCount: 22, rating: 'ممتاز',    status: 'active' },
  { id: '4', name: 'محمد الزهراني',   specialty: 'تفسير وحفظ',   halqatCount: 1, studentCount: 15, rating: 'جيد',      status: 'active' },
  { id: '5', name: 'عبدالرحمن الغامدي', specialty: 'حفظ',       halqatCount: 1, studentCount: 12, rating: 'جيد جداً', status: 'inactive' },
];

export const HOMEWORK_REVIEWS: HomeworkReview[] = [
  { id: '1', studentName: 'عبدالله الحميداني', type: 'حفظ جديد', segment: 'النساء ١-١٥',  date: '١٤٤٥/١٠/٢٠', status: 'مراجع', rating: 'ممتاز' },
  { id: '2', studentName: 'يوسف العمري',       type: 'مراجعة',   segment: 'البقرة ٢-٣٠',  date: '١٤٤٥/١٠/٢٠', status: 'معلق',  rating: 'جيد جداً' },
  { id: '3', studentName: 'سلطان المطيري',     type: 'حفظ جديد', segment: 'النساء ٥-١٢',  date: '١٤٤٥/١٠/١٩', status: 'مراجع', rating: 'جيد' },
  { id: '4', studentName: 'فهد الشمري',        type: 'مراجعة',   segment: 'الفاتحة ١-٧',  date: '١٤٤٥/١٠/١٨', status: 'متأخر', rating: 'مقبول' },
  { id: '5', studentName: 'ماجد القحطاني',     type: 'حفظ جديد', segment: 'الأنعام ١-٦',  date: '١٤٤٥/١٠/٢٠', status: 'مراجع', rating: 'ممتاز' },
  { id: '6', studentName: 'عمر الدوسري',       type: 'مراجعة',   segment: 'الأعراف ١-١٠', date: '١٤٤٥/١٠/٢٠', status: 'مراجع', rating: 'جيد جداً' },
];

export const INDIVIDUAL_PLANS: IndividualPlan[] = [
  { studentId: '1', studentName: 'عبدالله الحميداني', annualTarget: 200, completed: 180, status: 'متقدم' },
  { studentId: '2', studentName: 'يوسف العمري',       annualTarget: 150, completed: 130, status: 'في الموعد' },
  { studentId: '3', studentName: 'سلطان المطيري',     annualTarget: 180, completed: 165, status: 'متقدم' },
  { studentId: '4', studentName: 'فهد الشمري',        annualTarget: 100, completed: 68,  status: 'متأخر' },
  { studentId: '5', studentName: 'ماجد القحطاني',     annualTarget: 200, completed: 175, status: 'في الموعد' },
  { studentId: '6', studentName: 'عمر الدوسري',       annualTarget: 150, completed: 140, status: 'في الموعد' },
];
