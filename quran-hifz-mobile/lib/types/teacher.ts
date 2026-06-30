export interface Teacher {
  id: string;
  name: string;
  specialty: string;
  halqatCount: number;
  studentCount: number;
  rating: string;
  status: 'active' | 'inactive';
}

export interface IndividualPlan {
  studentId: string;
  studentName: string;
  annualTarget: number;
  completed: number;
  status: 'متقدم' | 'في الموعد' | 'متأخر';
}

export interface HomeworkReview {
  id: string;
  studentName: string;
  type: string;
  segment: string;
  date: string;
  status: 'مراجع' | 'معلق' | 'متأخر';
  rating: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول';
}
