export interface Student {
  id: string;
  name: string;
  path: string;
  halqa: string;
  mosque: string;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  totalPages: number;
  guardian: string;
  guardianPhone: string;
  lastMemorization: string;
  status: 'active' | 'inactive' | 'new';
  homeworkStatus: 'submitted' | 'pending' | 'late';
}

export interface HifzEntry {
  surah: string;
  status: 'مكتمل' | 'جارٍ' | 'لم يبدأ';
  completionDate?: string;
}

export interface AttendanceRecord {
  date: string;
  day: string;
  time: string;
  status: 'حاضر' | 'غائب' | 'متأخر';
}

export interface Message {
  id: string;
  sender: string;
  senderRole: string;
  initials: string;
  preview: string;
  time: string;
  unread: boolean;
}
