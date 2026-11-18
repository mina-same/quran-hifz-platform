import { useState } from 'react';
import { View } from 'react-native';
import Button from '@/components/ui/Button';
import IndividualPlanPanel from '@/components/domain/IndividualPlanPanel';
import OpenWardLogSheet from '@/components/domain/OpenWardLogSheet';
import { isOpenPlan, useStudentPlanProgress, type QuranPlan } from '@/lib/queries/quranPlan';

/**
 * Per-student toggle under a roster row (web TeacherAttendance /
 * TeacherTrackDetail): «سجل ورد الطالب» for an open-ward plan, otherwise
 * «عرض الخطة الفردية» / «أنشئ خطة فردية», expanding the panel(s) in place.
 * Hidden when the plan doesn't cover the student (a students-target plan).
 */
export default function TeacherStudentPlanToggle({ plan, studentId, studentName, readOnly }: {
  plan: QuranPlan;
  studentId: string;
  studentName: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const openPlan = isOpenPlan(plan);
  const { data: progress } = useStudentPlanProgress(openPlan ? undefined : plan._id, studentId);

  const covered = plan.targetType !== 'students'
    || (plan.students ?? []).some((s) => (typeof s === 'string' ? s : s._id) === studentId);
  if (!covered) return null;

  const label = open
    ? (openPlan ? 'إخفاء سجل الورد' : 'إخفاء الخطة الفردية')
    : openPlan ? 'سجل ورد الطالب'
    : progress?.progressIsPersisted ? 'عرض الخطة الفردية' : 'أنشئ خطة فردية';

  return (
    <View style={{ gap: 6 }}>
      <Button label={label} variant="ghost" size="sm" onPress={() => setOpen((v) => !v)} />
      {open && (
        openPlan
          ? <OpenWardLogSheet planId={plan._id} studentId={studentId} />
          : plan.segments.length > 1
            ? plan.segments.map((seg) => (
              <IndividualPlanPanel
                key={seg.type}
                planId={plan._id}
                studentId={studentId}
                studentName={studentName}
                basePlan={plan}
                type={seg.type}
                readOnly={readOnly}
              />
            ))
            : (
              <IndividualPlanPanel
                planId={plan._id}
                studentId={studentId}
                studentName={studentName}
                basePlan={plan}
                readOnly={readOnly}
              />
            )
      )}
    </View>
  );
}
