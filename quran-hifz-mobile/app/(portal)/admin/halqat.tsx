import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { IconPencil, IconSchool, IconTrash } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import HalqaCard from '@/components/domain/HalqaCard';
import IconButton from '@/components/ui/IconButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useHalqat, useDeleteHalqa } from '@/lib/queries/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

export default function AdminHalqat() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { data: halqat = [], isLoading, isError, isRefetching, refetch } = useHalqat();
  const deleteHalqa = useDeleteHalqa();
  const router = useRouter();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteHalqa.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />}
      >
        <Pressable style={s.addBtn} onPress={() => router.push('/(portal)/admin/halqa-form' as any)}>
          <Text style={s.addBtnText}>+ حلقة جديدة</Text>
        </Pressable>

        {isLoading && <SkeletonRows count={4} rowHeight={180} />}
        {isError && <Text style={s.error}>تعذّر تحميل الحلقات</Text>}

        {!isLoading && halqat.length === 0 && (
          <View style={s.empty}>
            <IconSchool size={30} color={theme.textMuted} />
            <Text style={s.muted}>لا توجد حلقات مسجلة بعد</Text>
          </View>
        )}

        {halqat.map((halqa) => (
          <HalqaCard
            key={halqa._id}
            halqa={halqa}
            actions={
              <>
                <IconButton accessibilityLabel="تعديل" style={s.flex1} onPress={() => router.push({ pathname: '/(portal)/admin/halqa-form', params: { id: halqa._id } } as any)}>
                  <View style={s.actionInner}>
                    <IconPencil size={15} color={theme.textMuted} />
                    <Text style={s.actionText}>تعديل</Text>
                  </View>
                </IconButton>
                <IconButton accessibilityLabel="حذف" tone="danger" style={s.flex1} onPress={() => setDeleteId(halqa._id)}>
                  <View style={s.actionInner}>
                    <IconTrash size={15} color={theme.red} />
                    <Text style={[s.actionText, { color: theme.red }]}>حذف</Text>
                  </View>
                </IconButton>
              </>
            }
          />
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={!!deleteId}
        title="حذف الحلقة"
        message="سيتم حذف الحلقة نهائياً. هذا الإجراء لا يمكن التراجع عنه."
        pending={deleteHalqa.isPending}
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
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center' },
    empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
    error: { fontSize: 13, color: theme.red, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
    flex1: { flex: 1 },
    actionInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
  });
}
