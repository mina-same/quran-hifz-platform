import type { ComponentType } from "react";
import type { PortalKey } from "../config/portals";

import { AdminDashboard }     from "../pages/admin/AdminDashboard";
import { AdminStudents }      from "../pages/admin/AdminStudents";
import { AdminRegister }      from "../pages/admin/AdminRegister";
import { AdminTeachers }      from "../pages/admin/AdminTeachers";
import { AdminHalqat }        from "../pages/admin/AdminHalqat";
import { AdminMasajid }       from "../pages/admin/AdminMasajid";
import { AdminKpis }          from "../pages/admin/AdminKpis";
import { AdminReports }       from "../pages/admin/AdminReports";
import { AdminSpecialTracks } from "../pages/admin/AdminSpecialTracks";
import { AdminParents }       from "../pages/admin/AdminParents";

import { TeacherDashboard }      from "../pages/teacher/TeacherDashboard";
import { TeacherHalqa }          from "../pages/teacher/TeacherHalqa";
import { TeacherStudents }       from "../pages/teacher/TeacherStudents";
import { TeacherAttendance }     from "../pages/teacher/TeacherAttendance";
import { TeacherHomework }       from "../pages/teacher/TeacherHomework";
import { TeacherPlans }          from "../pages/teacher/TeacherPlans";
import { TeacherPlanForm }       from "../pages/teacher/TeacherPlanForm";
import { TeacherPlanDetail }     from "../pages/teacher/TeacherPlanDetail";
import { TeacherReports }        from "../pages/teacher/TeacherReports";
import { TeacherRecordLesson }   from "../pages/teacher/TeacherRecordLesson";
import { TeacherGroupHomework }  from "../pages/teacher/TeacherGroupHomework";
import { TeacherSpecialTracks }  from "../pages/teacher/TeacherSpecialTracks";
import { TeacherTrackDetail }    from "../pages/teacher/TeacherTrackDetail";

import { StudentDashboard }      from "../pages/student/StudentDashboard";
import { StudentHifz }           from "../pages/student/StudentHifz";
import { StudentHomework }       from "../pages/student/StudentHomework";
import { StudentAttendance }     from "../pages/student/StudentAttendance";
import { StudentSchedule }       from "../pages/student/StudentSchedule";
import { StudentMessages }       from "../pages/student/StudentMessages";
import { StudentPoints }         from "../pages/student/StudentPoints";
import { StudentStore }          from "../pages/student/StudentStore";
import { StudentSpecialTracks }  from "../pages/student/StudentSpecialTracks";

import { ParentDashboard }    from "../pages/parent/ParentDashboard";
import { ParentTimeline }     from "../pages/parent/ParentTimeline";
import { ParentRecordings }   from "../pages/parent/ParentRecordings";
import { ParentAttendance }   from "../pages/parent/ParentAttendance";
import { ParentMessages }     from "../pages/parent/ParentMessages";
import { ParentHomeworkView } from "../pages/parent/ParentHomeworkView";

export const PAGE_REGISTRY: Record<PortalKey, Record<string, ComponentType>> = {
  admin: {
    dashboard:      AdminDashboard,
    students:       AdminStudents,
    register:       AdminRegister,
    teachers:       AdminTeachers,
    halqat:         AdminHalqat,
    masajid:        AdminMasajid,
    kpis:           AdminKpis,
    reports:        AdminReports,
    special_tracks: AdminSpecialTracks,
    parents:        AdminParents,
  },
  teacher: {
    dashboard:     TeacherDashboard,
    myhalqa:       TeacherHalqa,
    students:      TeacherStudents,
    attendance:    TeacherAttendance,
    homework:      TeacherHomework,
    plans:         TeacherPlans,
    planform:      TeacherPlanForm,
    plandetail:    TeacherPlanDetail,
    reports:       TeacherReports,
    recordlesson:  TeacherRecordLesson,
    grouphomework: TeacherGroupHomework,
    specialtracks: TeacherSpecialTracks,
    trackdetail:   TeacherTrackDetail,
  },
  student: {
    dashboard:     StudentDashboard,
    myhifz:        StudentHifz,
    homework:      StudentHomework,
    attendance:    StudentAttendance,
    schedule:      StudentSchedule,
    messages:      StudentMessages,
    points:        StudentPoints,
    store:         StudentStore,
    specialtracks: StudentSpecialTracks,
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
