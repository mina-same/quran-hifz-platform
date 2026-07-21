import { SURAHS } from "../../data/surahs";

export type RangePoint = { surahNumber: number; ayah: number };

export function SurahPointFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RangePoint;
  onChange: (v: RangePoint) => void;
}) {
  const surah = SURAHS.find((s) => s.number === value.surahNumber) ?? SURAHS[0];

  function setSurah(surahNumber: number) {
    const s = SURAHS.find((x) => x.number === surahNumber) ?? SURAHS[0];
    onChange({ surahNumber, ayah: Math.min(value.ayah, s.ayahCount) });
  }

  function setAyah(ayah: number) {
    const clamped = Math.max(1, Math.min(ayah || 1, surah.ayahCount));
    onChange({ ...value, ayah: clamped });
  }

  return (
    <div className="form-grid-2">
      <div className="form-group">
        <label className="form-label">{label} — السورة</label>
        <select className="form-input" value={value.surahNumber} onChange={(e) => setSurah(Number(e.target.value))}>
          {SURAHS.map((s) => (
            <option key={s.number} value={s.number}>
              {s.number}. {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">{label} — الآية</label>
        <select className="form-input" value={value.ayah} onChange={(e) => setAyah(Number(e.target.value))}>
          {Array.from({ length: surah.ayahCount }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
