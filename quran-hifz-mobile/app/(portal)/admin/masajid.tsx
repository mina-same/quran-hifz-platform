import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { IconBuildingArch, IconPencil, IconTrash } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import IconButton from '@/components/ui/IconButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import MasjidAccordion from '@/components/domain/MasjidAccordion';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useMasajid, useDeleteMasjid } from '@/lib/queries/masajid';
import { useHalqat } from '@/lib/queries/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

function masjidIdOf(v: { _id: string } | string | undefined): string | undefined {
  if (v && typeof v === 'object') return v._id;
  if (typeof v === 'string') return v;
  return undefined;
}

export default function AdminMasajid() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { data: masajid = [], isLoading: loadingMasajid, isError, isRefetching: refetchingMasajid, refetch: refetchMasajid } = useMasajid();
  const { data: halqat = [], isLoading: loadingHalqat, isRefetching: refetchingHalqat, refetch: refetchHalqat } = useHalqat();

  const deleteMasjid = useDeleteMasjid();
  const router = useRouter();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isLoading = loadingMasajid || loadingHalqat;
  const isRefreshing = refetchingMasajid || refetchingHalqat;
  const onRefresh = () => { refetchMasajid(); refetchHalqat(); };

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMasjid.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Pressable style={s.addBtn} onPress={() => router.push('/(portal)/admin/masjid-form' as any)}>
          <Text style={s.addBtnText}>+ مسجد جديد</Text>
        </Pressable>

        <Card>
          <CardHeader title="المساجد والحلقات" />
          {isLoading && <SkeletonRows count={3} rowHeight={56} />}
          {isError && <Text style={s.error}>تعذّر تحميل المساجد</Text>}

          {!isLoading && masajid.length === 0 && (
            <View style={s.empty}>
              <IconBuildingArch size={30} color={theme.textMuted} />
              <Text style={s.muted}>لا توجد مساجد مسجلة بعد</Text>
            </View>
          )}

          {masajid.map((masjid) => (
            <MasjidAccordion
              key={masjid._id}
              masjid={masjid}
              halqat={halqat.filter((h) => masjidIdOf(h.masjid) === masjid._id)}
              actions={
                <>
                  <IconButton accessibilityLabel="تعديل" onPress={() => router.push({ pathname: '/(portal)/admin/masjid-form', params: { id: masjid._id } } as any)}>
                    <IconPencil size={15} color={theme.textMuted} />
                  </IconButton>
                  <IconButton accessibilityLabel="حذف" tone="danger" onPress={() => setDeleteId(masjid._id)}>
                    <IconTrash size={15} color={theme.red} />
                  </IconButton>
                </>
              }
            />
          ))}
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={!!deleteId}
        title="حذف المسجد"
        message="سيتم حذف المسجد نهائياً. هذا الإجراء لا يمكن التراجع عنه."
        pending={deleteMasjid.isPending}
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
  });
}
