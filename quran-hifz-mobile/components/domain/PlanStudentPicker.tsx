import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconX, IconCheck } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

/** Mirrors web TeacherPlanForm's StudentPicker — shown for a pre-existing
 *  plan that targets an explicit student list. */
export default function PlanStudentPicker({
  students, selected, onChange,
}: {
  students: { _id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  return (
    <View>
      {selected.length > 0 && (
        <View style={s.chips}>
          {selected.map((id) => (
            <Pressable haptic="select" key={id} style={s.chip} onPress={() => toggle(id)}>
              <Text style={s.chipText}>{students.find((x) => x._id === id)?.name ?? '—'}</Text>
              <IconX size={11} color={theme.green} />
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.list}>
        {students.length === 0 && <Text style={s.empty}>لا يوجد طلاب مسجّلون</Text>}
        {students.map((st, i) => {
          const isSel = selected.includes(st._id);
          return (
            <Pressable
              haptic="select"
              key={st._id}
              onPress={() => toggle(st._id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSel }}
              style={[s.row, i < students.length - 1 && s.rowBorder, isSel && s.rowSel]}
            >
              <View style={[s.box, isSel && s.boxOn]}>
                {isSel && <IconCheck size={12} color="#fff" />}
              </View>
              <Text style={[s.name, isSel && s.nameSel]}>{st.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.greenPale, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
    chipText: { fontSize: 12, color: theme.green, fontFamily: theme.fontCairoBold },
    list: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, overflow: 'hidden' },
    empty: { padding: 12, fontSize: 12, color: theme.textMuted, textAlign: 'center', fontFamily: theme.fontCairo },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowSel: { backgroundColor: theme.greenPale },
    box: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    boxOn: { backgroundColor: theme.green, borderColor: theme.green },
    name: { fontSize: 13, color: theme.text, fontFamily: theme.fontCairo },
    nameSel: { color: theme.green, fontFamily: theme.fontCairoBold },
  });
}
