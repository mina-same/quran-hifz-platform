import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { IconX, IconPencil } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import BottomSheet from '@/components/ui/BottomSheet';
import Pressable from '@/components/ui/Pressable';
import IconButton from '@/components/ui/IconButton';
import Badge from '@/components/ui/Badge';
import type { ScheduleItem } from '@/components/domain/ScheduleSheet';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

/** A student's individual-plan schedule as phone cards, each with the web
 *  row's pencil action (web IndividualPlanPanel's per-row inline edit). */
export default function PlanStudentScheduleSheet({ visible, onClose, title, items, onEdit }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: ScheduleItem[];
  onEdit?: (occurrenceIndex: number) => void;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['85%']} rawContent>
      <View style={{ flex: 1 }}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            <Text style={s.subtitle}>{items.length} يوم</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <IconX size={19} color={theme.text} />
          </Pressable>
        </View>
        <BottomSheetFlatList
          data={items}
          keyExtractor={(it) => it.key}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.idx}><Text style={s.idxText}>{item.index}</Text></View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.topRow}>
                  <Text style={s.date} numberOfLines={1}>{item.date}</Text>
                  <Text style={s.pages}>{item.pages}</Text>
                </View>
                <Text style={s.range}>{item.range}</Text>
                {!!item.strikeRange && <Text style={s.strike}>{item.strikeRange}</Text>}
                {!!item.badge && (
                  <View style={{ flexDirection: 'row' }}>
                    <Badge label={item.badge.label} variant={item.badge.variant} />
                  </View>
                )}
              </View>
              {!!onEdit && <IconButton onPress={() => onEdit(item.index)} accessibilityLabel="تعديل">
                <IconPencil size={15} color={theme.text} />
              </IconButton>}
            </View>
          )}
        />
      </View>
    </BottomSheet>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    subtitle: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    list: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 10, backgroundColor: theme.card },
    idx: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center' },
    idxText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    date: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, flex: 1 },
    pages: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    range: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    strike: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, textDecorationLine: 'line-through' },
  });
}
