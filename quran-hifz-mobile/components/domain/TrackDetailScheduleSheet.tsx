import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { IconCheck, IconDatabase, IconPencil, IconRefresh, IconX, IconAlertCircle } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import BottomSheet from '@/components/ui/BottomSheet';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import FormInput from '@/components/forms/FormInput';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import { fractionalPage, surahName, type RangePoint } from '@/lib/quranRange';
import { fmtDayLabel } from '@/lib/date';
import type { QuranPlan } from '@/lib/queries/quranPlan';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type ScheduleEntry = QuranPlan['schedule'][number];

/** A schedule day's page position: a clean page boundary as a plain integer,
 * a partial (mid-page) position with one decimal — web's `pageLabel`. */
function pageLabel(point: RangePoint, edge: 'start' | 'end'): string {
  const { value, isPartial } = fractionalPage(point, edge);
  return isPartial ? value.toFixed(1) : String(value);
}

/** Numeric field that clamps like the web's `Number(v) || 1` inputs, but lets
 * the teacher clear the field while typing (re-synced on blur). */
function ClampedNumber({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <FormInput
      value={text}
      keyboardType="number-pad"
      onChangeText={(t) => {
        setText(t);
        if (t !== '') onChange(Math.max(min, Math.min(max, Number(t) || min)));
      }}
      onBlur={() => setText(String(value))}
      style={{ minWidth: 64 }}
    />
  );
}

export interface DayEditState {
  rangeStart: RangePoint;
  rangeEnd: RangePoint;
  pageStart: number;
  pageEnd: number;
  juz: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: QuranPlan;
  /** Display direction for the من/إلى columns (web's `rangeReversed`). */
  reversed: (entry: ScheduleEntry) => boolean;
  canEdit: boolean;
  generating: boolean;
  onRegenerate: () => void;
  editingDay: ScheduleEntry | null;
  edit: DayEditState;
  onEditChange: (patch: Partial<DayEditState>) => void;
  onStartEdit: (entry: ScheduleEntry) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  dayError: string;
}

/** The track's day-by-day split (web: the "توزيع الأيام" table in the plan tab)
 * as phone cards, with the same per-row edit flow: pencil → juz / من / إلى /
 * pages fields → save (✓) or cancel (✕). */
export default function TrackDetailScheduleSheet({
  visible, onClose, plan, reversed, canEdit, generating, onRegenerate,
  editingDay, edit, onEditChange, onStartEdit, onSave, onCancel, saving, dayError,
}: Props) {
  const theme = useAppTheme();
  const st = useMemo(() => createStyles(theme), [theme]);
  const isEditing = (e: ScheduleEntry) =>
    !!editingDay && editingDay.occurrenceIndex === e.occurrenceIndex && editingDay.type === e.type;

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['90%']} rawContent>
      <View style={st.sheet}>
        <View style={st.header}>
          <Text style={st.title}>توزيع الأيام والصفحات</Text>
          <Pressable onPress={onClose} hitSlop={10} style={st.closeBtn}>
            <IconX size={19} color={theme.text} />
          </Pressable>
        </View>
        <View style={st.statusRow}>
          <View style={st.statusText}>
            {generating ? (
              <ActivityIndicator size="small" color={theme.textMuted} />
            ) : plan.scheduleIsPersisted ? (
              <IconDatabase size={14} color={theme.green} />
            ) : (
              <IconRefresh size={14} color={theme.textMuted} />
            )}
            <Text style={st.muted}>
              {generating
                ? 'جارٍ حفظ التوزيع...'
                : plan.scheduleIsPersisted ? 'توزيع محفوظ في قاعدة البيانات' : 'توزيع محسوب مؤقتًا (غير محفوظ)'}
            </Text>
          </View>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              label={plan.scheduleIsPersisted ? 'إعادة الحفظ من الإعدادات الحالية' : 'حفظ التوزيع في قاعدة البيانات'}
              disabled={generating}
              onPress={onRegenerate}
            />
          )}
        </View>
        {!!editingDay && !!dayError && (
          <View style={st.errorBox}>
            <IconAlertCircle size={16} color={theme.tone.red.text} />
            <Text style={st.errorText}>{dayError}</Text>
          </View>
        )}

        <BottomSheetFlatList
          data={plan.schedule}
          extraData={[editingDay, edit, saving]}
          keyExtractor={(e) => `${e.type ?? ''}-${e.occurrenceIndex}`}
          style={st.list}
          contentContainerStyle={st.listContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          renderItem={({ item: e }) => {
            const rev = reversed(e);
            const date = fmtDayLabel(String(e.date).slice(0, 10));
            if (!isEditing(e)) {
              const from = rev ? { s: e.surahEnd, a: e.ayahEnd } : { s: e.surahStart, a: e.ayahStart };
              const to = rev ? { s: e.surahStart, a: e.ayahStart } : { s: e.surahEnd, a: e.ayahEnd };
              const pages = rev
                ? `${pageLabel({ surahNumber: e.surahEnd, ayah: e.ayahEnd }, 'end')} - ${pageLabel({ surahNumber: e.surahStart, ayah: e.ayahStart }, 'start')}`
                : `${pageLabel({ surahNumber: e.surahStart, ayah: e.ayahStart }, 'start')} - ${pageLabel({ surahNumber: e.surahEnd, ayah: e.ayahEnd }, 'end')}`;
              return (
                <View style={st.card}>
                  <View style={st.idx}><Text style={st.idxText}>{e.occurrenceIndex}</Text></View>
                  <View style={st.body}>
                    <View style={st.topRow}>
                      <Text style={st.date} numberOfLines={1}>{date}</Text>
                      <Badge label={`جزء ${e.juz}`} variant="green" />
                    </View>
                    <Text style={st.range}>من {surahName(from.s)} : {from.a}</Text>
                    <Text style={st.range}>إلى {surahName(to.s)} : {to.a}</Text>
                    <Text style={st.muted}>الصفحات {pages}</Text>
                  </View>
                  {canEdit && plan.scheduleIsPersisted && (
                    <Pressable onPress={() => onStartEdit(e)} hitSlop={8} style={st.iconBtn}>
                      <IconPencil size={16} color={theme.text} />
                    </Pressable>
                  )}
                </View>
              );
            }
            return (
              <View style={[st.card, st.cardEditing]}>
                <View style={st.idx}><Text style={st.idxText}>{e.occurrenceIndex}</Text></View>
                <View style={[st.body, { gap: 8 }]}>
                  <Text style={st.date}>{date}</Text>
                  <View>
                    <Text style={st.label}>الجزء</Text>
                    <ClampedNumber value={edit.juz} min={1} max={30} onChange={(juz) => onEditChange({ juz })} />
                  </View>
                  <View>
                    <Text style={st.label}>من</Text>
                    <SurahAyahPicker value={edit.rangeStart} onChange={(rangeStart) => onEditChange({ rangeStart })} />
                  </View>
                  <View>
                    <Text style={st.label}>إلى</Text>
                    <SurahAyahPicker value={edit.rangeEnd} onChange={(rangeEnd) => onEditChange({ rangeEnd })} />
                  </View>
                  <View>
                    <Text style={st.label}>الصفحات</Text>
                    <View style={st.pagesRow}>
                      <View style={{ flex: 1 }}>
                        <ClampedNumber value={edit.pageStart} min={1} max={604} onChange={(pageStart) => onEditChange({ pageStart })} />
                      </View>
                      <Text style={st.muted}>-</Text>
                      <View style={{ flex: 1 }}>
                        <ClampedNumber value={edit.pageEnd} min={1} max={604} onChange={(pageEnd) => onEditChange({ pageEnd })} />
                      </View>
                    </View>
                  </View>
                  <View style={st.pagesRow}>
                    <Button
                      label="حفظ"
                      size="sm"
                      icon={<IconCheck size={15} color={theme.white} />}
                      loading={saving}
                      disabled={saving}
                      onPress={onSave}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="إلغاء"
                      size="sm"
                      variant="ghost"
                      icon={<IconX size={15} color={theme.text} />}
                      onPress={onCancel}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>
    </BottomSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    sheet: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10,
    },
    title: { flex: 1, fontSize: theme.fontSize.lg, fontFamily: theme.fontCairoBold, color: theme.text },
    closeBtn: {
      width: 38, height: 38, borderRadius: theme.radiusFull, backgroundColor: theme.card,
      borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center',
    },
    statusRow: { paddingHorizontal: 20, gap: 6, paddingBottom: 10 },
    statusText: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    muted: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 10,
      padding: 10, borderRadius: 10, backgroundColor: theme.tone.red.bg,
    },
    errorText: { flex: 1, fontSize: 13, fontFamily: theme.fontCairo, color: theme.tone.red.text },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    card: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, marginBottom: 10,
      backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    },
    cardEditing: { backgroundColor: theme.greenPale },
    idx: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: theme.card,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border,
    },
    idxText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    body: { flex: 1, gap: 2 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    date: { flexShrink: 1, fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    range: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text },
    label: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted, marginBottom: 4 },
    pagesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: {
      width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: theme.border,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
