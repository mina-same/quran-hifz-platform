import type { ComponentType } from "react";
import type { PortalKey } from "../config/portals";

import { AdminDashboard }     from "../pages/admin/AdminDashboard";
import { AdminStudents }      from "../pages/admin/AdminStudents";
import { AdminRegister }      from "../pages/admin/AdminRegister";
import { AdminTeachers }      from "../pages/admin/AdminTeachers";
import { AdminMasajid }       from "../pages/admin/AdminMasajid";
import { AdminKpis }          from "../pages/admin/AdminKpis";
import { AdminReports }       from "../pages/admin/AdminReports";
import { AdminTracks }        from "../pages/admin/AdminTracks";
import { AdminParents }       from "../pages/admin/AdminParents";

import { TeacherDashboard }      from "../pages/teacher/TeacherDashboard";
import { TeacherStudents }       from "../pages/teacher/TeacherStudents";
import { TeacherAttendance }     from "../pages/teacher/TeacherAttendance";
import { TeacherHomework }       from "../pages/teacher/TeacherHomework";
import { TeacherPlans }          from "../pages/teacher/TeacherPlans";
import { TeacherPlanForm }       from "../pages/teacher/TeacherPlanForm";
import { TeacherPlanDetail }     from "../pages/teacher/TeacherPlanDetail";
import { TeacherReports }        from "../pages/teacher/TeacherReports";
import { TeacherRecordLesson }   from "../pages/teacher/TeacherRecordLesson";
import { TeacherGroupHomework }  from "../pages/teacher/TeacherGroupHomework";
import { TeacherTracks }         from "../pages/teacher/TeacherTracks";
import { TeacherTrackDetail }    from "../pages/teacher/TeacherTrackDetail";

import { StudentDashboard }      from "../pages/student/StudentDashboard";
import { StudentHifz }           from "../pages/student/StudentHifz";
import { StudentHomework }       from "../pages/student/StudentHomework";
import { StudentAttendance }     from "../pages/student/StudentAttendance";
import { StudentSchedule }       from "../pages/student/StudentSchedule";
import { StudentMessages }       from "../pages/student/StudentMessages";
import { StudentPoints }         from "../pages/student/StudentPoints";
import { StudentStore }          from "../pages/student/StudentStore";
import { StudentTracks }         from "../pages/student/StudentTracks";

import { AccountSettings }    from "../pages/common/AccountSettings";

import { ParentDashboard }    from "../pages/parent/ParentDashboard";
import { ParentTimeline }     from "../pages/parent/ParentTimeline";
import { ParentRecordings }   from "../pages/parent/ParentRecordings";
import { ParentAttendance }   from "../pages/parent/ParentAttendance";
import { ParentMessages }     from "../pages/parent/ParentMessages";
import { ParentHomeworkView } from "../pages/parent/ParentHomeworkView";

export const PAGE_REGISTRY: Record<PortalKey, Record<string, ComponentType>> = {
  admin: {
    dashboard:   AdminDashboard,
    students:    AdminStudents,
    register:    AdminRegister,
    teachers:    AdminTeachers,
    masajid:     AdminMasajid,
    kpis:        AdminKpis,
    reports:     AdminReports,
    tracks:      AdminTracks,
    parents:     AdminParents,
    // Admin reuses the teacher's track detail (and the pages it navigates to).
    trackdetail: TeacherTrackDetail,
    planform:    TeacherPlanForm,
    attendance:  TeacherAttendance,
  },
  teacher: {
    dashboard:     TeacherDashboard,
    tracks:        TeacherTracks,
    students:      TeacherStudents,
    attendance:    TeacherAttendance,
    homework:      TeacherHomework,
    plans:         TeacherPlans,
    planform:      TeacherPlanForm,
    plandetail:    TeacherPlanDetail,
    reports:       TeacherReports,
    recordlesson:  TeacherRecordLesson,
    grouphomework: TeacherGroupHomework,
    trackdetail:   TeacherTrackDetail,
    account:       AccountSettings,
  },
  student: {
    dashboard: StudentDashboard,
    myhifz:    StudentHifz,
    homework:  StudentHomework,
    attendance: StudentAttendance,
    schedule:  StudentSchedule,
    messages:  StudentMessages,
    points:    StudentPoints,
    store:     StudentStore,
    tracks:    StudentTracks,
    account:   AccountSettings,
  },
  parent: {
    dashboard:    ParentDashboard,
    timeline:     ParentTimeline,
    recordings:   ParentRecordings,
    attendance:   ParentAttendance,
    messages:     ParentMessages,
    homework_view: ParentHomeworkView,
  },
};
