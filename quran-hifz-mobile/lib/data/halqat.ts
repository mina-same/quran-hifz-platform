import type { Halqa, Masjid, KPI } from '@/lib/types/halqa';

export const HALQAT: Halqa[] = [
  { id: '1', name: 'حلقة عمر بن الخطاب',      teacher: 'ناصر الحميداني',    mosque: 'مسجد الفاروق', days: 'السبت، الاثنين، الخميس', time: '٥:٠٠ م - ٦:٣٠ م', studentCount: 12, capacity: 15, attendancePct: 92, completionPct: 65 },
  { id: '2', name: 'حلقة أبي بكر الصديق',      teacher: 'سعد المالكي',        mosque: 'مسجد النور',   days: 'الأحد، الثلاثاء، الجمعة', time: '٤:٣٠ م - ٦:٠٠ م', studentCount: 10, capacity: 15, attendancePct: 87, completionPct: 72 },
  { id: '3', name: 'حلقة علي بن أبي طالب',     teacher: 'فيصل العتيبي',      mosque: 'مسجد التقوى', days: 'السبت، الاثنين، الأربعاء', time: '٥:٣٠ م - ٧:٠٠ م', studentCount: 14, capacity: 15, attendancePct: 95, completionPct: 58 },
  { id: '4', name: 'حلقة عثمان بن عفان',       teacher: 'محمد الزهراني',     mosque: 'مسجد الفاروق', days: 'الثلاثاء، الخميس، السبت', time: '٤:٠٠ م - ٥:٣٠ م', studentCount: 8,  capacity: 12, attendancePct: 83, completionPct: 80 },
  { id: '5', name: 'حلقة عبدالرحمن بن عوف',   teacher: 'ناصر الحميداني',    mosque: 'مسجد الهدى',  days: 'الأحد، الثلاثاء، الخميس', time: '٦:٠٠ م - ٧:٣٠ م', studentCount: 11, capacity: 15, attendancePct: 90, completionPct: 70 },
];

export const MASAJID: Masjid[] = [
  {
    id: '1',
    name: 'مسجد الفاروق',
    location: 'حي العماير الشمالي',
    halqat: [HALQAT[0], HALQAT[3]],
  },
  {
    id: '2',
    name: 'مسجد النور',
    location: 'حي العماير الجنوبي',
    halqat: [HALQAT[1]],
  },
  {
    id: '3',
    name: 'مسجد التقوى',
    location: 'حي العماير الغربي',
    halqat: [HALQAT[2]],
  },
  {
    id: '4',
    name: 'مسجد الهدى',
    location: 'حي العماير الشرقي',
    halqat: [HALQAT[4]],
  },
];

export const KPIS: KPI[] = [
  { indicator: 'نسبة الحضور الكلية',          target: '٩٠٪',   actual: '٩١٪',   rating: 'ممتاز' },
  { indicator: 'متوسط الصفحات المحفوظة شهرياً', target: '١٥ صفحة', actual: '١٣ صفحة', rating: 'جيد' },
  { indicator: 'نسبة إكمال الواجبات',          target: '٨٥٪',   actual: '٧٨٪',   rating: 'مقبول' },
  { indicator: 'رضا أولياء الأمور',            target: '٩٠٪',   actual: '٩٤٪',   rating: 'ممتاز' },
  { indicator: 'تقييم أداء المعلمين',          target: 'ممتاز',  actual: 'ممتاز',  rating: 'ممتاز' },
  { indicator: 'معدل الاحتفاظ بالطلاب',        target: '٩٥٪',   actual: '٩٢٪',   rating: 'جيد' },
  { indicator: 'معدل إتمام الختمات السنوية',   target: '٦٠٪',   actual: '٤٥٪',   rating: 'ضعيف' },
];
