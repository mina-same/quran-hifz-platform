import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useParentChildren } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

/**
 * Post-login child picker for the parent portal — rendered once at the top
 * of the dashboard (reachable from every tab, so selecting there is enough
 * for the rest of the portal to read `selectedChildId` from portalStore).
 *
 * - Exactly one child: auto-selected silently, no picker UI.
 * - Multiple children: horizontal pill picker.
 * - Zero children / loading / error: lightweight inline states.
 */
export default function ChildSelector() {
  const { data: children, isLoading, isError } = useParentChildren();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const setSelectedChild = usePortalStore((s) => s.setSelectedChild);

  useEffect(() => {
    if (children && children.length === 1 && selectedChildId !== children[0]._id) {
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
            key={child._id}
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

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  center: { paddingVertical: 10, alignItems: 'center' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radiusFull,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
  },
  pillActive: {
    backgroundColor: theme.green,
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
