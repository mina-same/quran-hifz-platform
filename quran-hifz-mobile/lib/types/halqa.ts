export interface Halqa {
  id: string;
  name: string;
  teacher: string;
  mosque: string;
  days: string;
  time: string;
  studentCount: number;
  capacity: number;
  attendancePct: number;
  completionPct: number;
}

export interface Masjid {
  id: string;
  name: string;
  location: string;
  halqat: Halqa[];
}

export interface KPI {
  indicator: string;
  target: string;
  actual: string;
  rating: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف';
}
