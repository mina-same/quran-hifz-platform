import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { IconPencil, IconTrash } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import IconButton from '@/components/ui/IconButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useTeachers, useDeleteTeacher } from '@/lib/queries/teachers';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const ratingVariant = (r: string) =>
  r === 'ممتاز' ? 'green' : r === 'جيد جداً' ? 'gold' : r === 'جيد' ? 'blue' : 'gray';

export default function AdminTeachers() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { data: teachers = [], isLoading, isError, isRefetching, refetch } = useTeachers();

  const deleteTeacher = useDeleteTeacher();
  const router = useRouter();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteTeacher.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Pressable style={s.addBtn} onPress={() => router.push('/(portal)/admin/teacher-form' as any)}>
          <Text style={s.addBtnText}>+ إضافة معلم</Text>
        </Pressable>

        <Card noPadding>
          <CardHeader title={`المعلمون (${teachers.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {isError && <Text style={s.error}>تعذّر تحميل بيانات المعلمين</Text>}
            {!isLoading && teachers.length === 0 && <Text style={s.muted}>لا يوجد معلمون مسجلون بعد</Text>}

            {teachers.map((t, i) => (
              <View key={t._id} style={[s.row, i > 0 && s.rowBorder]}>
                <View style={s.rowHead}>
                  <Text style={s.name} numberOfLines={1}>{t.name}</Text>
                  <Badge label={t.status === 'active' ? 'نشط' : 'غير نشط'} variant={t.status === 'active' ? 'green' : 'gray'} />
                </View>

                <View style={s.chips}>
                  <View style={s.chip}><Text style={s.chipText} numberOfLines={1}>التخصص: {t.specialty || '—'}</Text></View>
                  <View style={s.chip}><Text style={s.chipText}>الحلقات: {t.halqatCount ?? 0}</Text></View>
                  <View style={s.chip}><Text style={s.chipText}>الطلاب: {t.studentCount ?? 0}</Text></View>
                </View>

                {!!t.phone && <Text style={s.contact} numberOfLines={1}>الجوال: {t.phone}</Text>}
                <Text style={s.contact} numberOfLines={1}>
                  {t.email ? t.email : 'لا يوجد حساب بعد'}
                </Text>

                <View style={s.rowFoot}>
                  <Badge label={t.rating || '—'} variant={ratingVariant(t.rating) as any} />
                  <View style={s.actions}>
                    <IconButton accessibilityLabel="تعديل" onPress={() => router.push({ pathname: '/(portal)/admin/teacher-form', params: { id: t._id } } as any)}>
                      <IconPencil size={15} color={theme.textMuted} />
                    </IconButton>
                    <IconButton accessibilityLabel="حذف" tone="danger" onPress={() => setDeleteId(t._id)}>
                      <IconTrash size={15} color={theme.red} />
                    </IconButton>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={!!deleteId}
        title="حذف المعلم"
        message="سيتم حذف المعلم نهائياً. هذا الإجراء لا يمكن التراجع عنه."
        pending={deleteTeacher.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },

    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: theme.tone.gray.bg, borderRadius: theme.radiusSm, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 1, maxWidth: '100%' },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.tone.gray.text },
    contact: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    rowFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8 },


    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    error: { fontSize: 13, color: theme.red, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
  });
}
