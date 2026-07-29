import { View, StyleSheet } from 'react-native';
import { SURAHS } from '@/lib/data/surahs';
import { toFlatIndex, type RangePoint } from '@/lib/quranRange';
import FormSelect from '@/components/forms/FormSelect';

interface Props {
  value: RangePoint;
  onChange: (v: RangePoint) => void;
  disabled?: boolean;
  /** When given, restricts BOTH pickers to only the surahs/ayat that fall inside
   * this range — mirrors the web's `CompactSurahAyah` `bounds` prop. Without this,
   * a pick outside the assignment's own range would silently snap back on the
   * next render since every choice must actually stick. */
  bounds?: { lo: RangePoint; hi: RangePoint };
}

/** Bounded surah+ayah picker (bottom-sheet FormSelects) — mobile port of the web's
 * CompactSurahAyah, used for attendance "actual completion", individual-plan range
 * setup, and plan-builder range fields. */
export default function SurahAyahPicker({ value, onChange, disabled, bounds }: Props) {
  const surah = SURAHS.find((s) => s.number === value.surahNumber) ?? SURAHS[0];
  const loFlat = bounds ? toFlatIndex(bounds.lo) : undefined;
  const hiFlat = bounds ? toFlatIndex(bounds.hi) : undefined;

  function ayahsOf(s: typeof surah): number[] {
    const all = Array.from({ length: s.ayahCount }, (_, i) => i + 1);
    if (loFlat == null || hiFlat == null) return all;
    return all.filter((n) => {
      const f = toFlatIndex({ surahNumber: s.number, ayah: n });
      return f >= loFlat && f <= hiFlat;
    });
  }

  const surahs = loFlat == null || hiFlat == null ? SURAHS : SURAHS.filter((s) => ayahsOf(s).length > 0);
  const ayahs = ayahsOf(surah);

  function setSurah(surahNumberStr: string) {
    const surahNumber = Number(surahNumberStr);
    const s = SURAHS.find((x) => x.number === surahNumber) ?? SURAHS[0];
    const opts = ayahsOf(s);
    const ayah = opts.length ? (opts.includes(value.ayah) ? value.ayah : opts[0]) : Math.min(value.ayah, s.ayahCount);
    onChange({ surahNumber, ayah });
  }

  function setAyah(ayahStr: string) {
    const ayah = Number(ayahStr);
    onChange({ ...value, ayah: Math.max(1, Math.min(ayah || 1, surah.ayahCount)) });
  }

  return (
    <View style={styles.row}>
      <View style={styles.surahField}>
        <FormSelect
          value={String(value.surahNumber)}
          onChange={setSurah}
          disabled={disabled}
          options={surahs.map((s) => ({ value: String(s.number), label: `${s.number}. ${s.name}` }))}
        />
      </View>
      <View style={styles.ayahField}>
        <FormSelect
          value={String(value.ayah)}
          onChange={setAyah}
          disabled={disabled}
          options={ayahs.map((n) => ({ value: String(n), label: String(n) }))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  surahField: { flex: 2 },
  ayahField: { flex: 1 },
});
