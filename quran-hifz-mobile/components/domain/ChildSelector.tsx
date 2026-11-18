import { useMemo, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { useParentChildren } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

/**
 * Child picker for the parent portal (web: ParentChildSwitch in the topbar of
 * every parent page) — rendered at the top of each child-scoped parent screen;
 * the choice lives in portalStore's `selectedChildId`.
 *
 * - No valid selection: first child auto-selected; one child: no picker UI.
 * - Multiple children: horizontal pill picker.
 * - Zero children / loading / error: lightweight inline states.
 */
export default function ChildSelector() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { data: children, isLoading, isError } = useParentChildren();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const setSelectedChild = usePortalStore((s) => s.setSelectedChild);

  useEffect(() => {
    // Web gates the parent portal behind a child pick; here we default to the
    // first child so every screen shows the same child the pills highlight.
    if (children?.length && !children.some((c) => c._id === selectedChildId)) {
      setSelectedChild(children[0]._id);
    }
  }, [children, selectedChildId, setSelectedChild]);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.green} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>تعذّر تحميل قائمة الأبناء.</Text>
      </View>
    );
  }

  if (!children || children.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>لا يوجد طلاب مرتبطون بحسابك.</Text>
      </View>
    );
  }

  // Single child: auto-selected above, no picker needed.
  if (children.length === 1) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {children.map((child) => {
        const active = child._id === selectedChildId;
        return (
          <Pressable
            haptic="select"
            key={child._id}
            accessibilityLabel="تغيير الابن"
            onPress={() => setSelectedChild(child._id)}
            style={[s.pill, active && s.pillActive]}
          >
            <Text style={[s.pillText, active && s.pillTextActive]}>{child.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
    center: { paddingVertical: 10, alignItems: 'center' },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radiusFull,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    pillActive: {
      backgroundColor: theme.greenAccent,
      borderColor: theme.green,
    },
    pillText: {
      fontSize: 12,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    pillTextActive: {
      color: theme.white,
    },
    errorText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.red },
    emptyText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  });
}
