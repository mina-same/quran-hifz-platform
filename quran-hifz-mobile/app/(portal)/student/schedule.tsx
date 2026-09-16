import { useMemo } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from "react-native";
import Text from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "@/components/ui/Card";
import CardHeader from "@/components/ui/CardHeader";
import Alert from "@/components/ui/Alert";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { usePortalStore } from "@/lib/store/portalStore";
import { useStudent } from "@/lib/queries/students";
import { useTrack, type TrackTeacher } from "@/lib/queries/tracks";
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function getId(v: unknown): string | undefined {
  if (v && typeof v === "object" && "_id" in v)
    return (v as { _id: string })._id;
  if (typeof v === "string") return v;
  return undefined;
}
function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v)
    return (v as { name: string }).name;
  return "—";
}
function getTeacherNames(teachers: (TrackTeacher | string)[]): string {
  return teachers.map((t) => (typeof t === "object" ? t.name : t)).join("، ") || "—";
}

export default function StudentSchedule() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const authUser = usePortalStore((s) => s.authUser);
  const studentId = authUser?.profileId;

  const {
    data: student,
    isLoading: studentLoading,
    isError: studentError,
    isRefetching: studentRefetching,
    refetch: refetchStudent,
  } = useStudent(studentId);
  const trackId = student ? getId(student.track) : undefined;
  const {
    data: track,
    isLoading: trackLoading,
    isError: trackError,
    isRefetching: trackRefetching,
    refetch: refetchTrack,
  } = useTrack(trackId);

  const isLoading = studentLoading || (!!trackId && trackLoading);
  const isRefetching = studentRefetching || (!!trackId && trackRefetching);
  const onRefresh = () => {
    refetchStudent();
    if (trackId) refetchTrack();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.page}>
          <SkeletonRows count={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (studentError || trackError) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.page}>
          <Alert variant="error">تعذر تحميل مواعيد المسار</Alert>
        </View>
      </SafeAreaView>
    );
  }

  const sessionDays = new Set(
    (track?.daysPerWeek ?? "")
      .split(/[،,]/)
      .map((d) => d.trim())
      .filter(Boolean),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={[theme.spinner]}
            tintColor={theme.spinner}
          />
        }
      >
        {!track ? (
          <Card>
            <Text style={styles.emptyText}>لا يوجد مسار مسجل بعد</Text>
          </Card>
        ) : (
          <>
            {/* Track info */}
            <Card>
              <CardHeader title="تفاصيل المسار" />
              <View style={styles.grid}>
                {[
                  ["المسار", track.title],
                  ["المعلمون", getTeacherNames(track.teachers)],
                  ["المسجد", getName(track.masjid)],
                  ["الوقت", track.timeSlot || "—"],
                ].map(([k, v]) => (
                  <View key={k} style={styles.gridItem}>
                    <Text style={styles.gridLabel}>{k}</Text>
                    <Text style={styles.gridValue}>{v}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Weekly grid */}
            <Card>
              <CardHeader title="الجدول الأسبوعي" />
              <View style={styles.weekGrid}>
                {DAYS.map((day) => {
                  const isSession = sessionDays.has(day);
                  return (
                    <View
                      key={day}
                      style={[
                        styles.dayCell,
                        isSession
                          ? styles.dayCellActive
                          : styles.dayCellInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayName,
                          isSession && styles.dayNameActive,
                        ]}
                      >
                        {day}
                      </Text>
                      {isSession ? (
                        <Text style={styles.sessionTime}>
                          {track.timeSlot || "—"}
                        </Text>
                      ) : (
                        <Text style={styles.dash}>—</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: theme.greenAccent }]}
                  />
                  <Text style={styles.legendText}>يوم مسار</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: "#F9FAF5",
                        borderWidth: 1,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>يوم عادي</Text>
                </View>
              </View>
            </Card>

            <Alert variant="info">
              سيصلك تذكير على الواتساب قبل كل جلسة بساعة.
            </Alert>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    emptyText: {
      fontSize: 13,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      textAlign: "center",
      paddingVertical: 20,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
    gridItem: { width: "46%", gap: 4 },
    gridLabel: {
      fontSize: 12,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
    gridValue: {
      fontSize: 13,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    weekGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    dayCell: {
      width: "13%",
      borderRadius: theme.radiusSm,
      padding: 6,
      alignItems: "center",
      minWidth: 40,
    },
    dayCellActive: { backgroundColor: theme.greenAccent },
    dayCellInactive: { backgroundColor: "#F9FAF5" },
    dayName: {
      fontSize: 10,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      textAlign: "center",
      marginBottom: 2,
    },
    dayNameActive: { color: theme.white, fontFamily: theme.fontCairoBold },
    sessionTime: {
      fontSize: 9,
      color: "rgba(255,255,255,0.8)",
      fontFamily: theme.fontCairo,
    },
    dash: { fontSize: 10, color: theme.textMuted },
    legend: { flexDirection: "row", gap: 16, marginTop: 10 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 3 },
    legendText: {
      fontSize: 12,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
  });
}
