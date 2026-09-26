import type { ComponentType } from "react";
import type { RangePoint } from "../../api/quran-plans";
import { toFlatIndex } from "../../lib/quranRange";
import { Badge } from "./Badge";

/** One type's answer to «ماذا حفظ اليوم؟» on an open-ward plan. */
export type OpenWardValue =
  | { status: "recorded"; from: RangePoint; to: RangePoint }
  | { status: "none" };

/** Saving is allowed once the teacher picked a valid range or chose «لم يُسمِّع». */
export function openWardComplete(v?: OpenWardValue): boolean {
  if (!v) return false;
  return v.status === "none" || toFlatIndex(v.from) <= toFlatIndex(v.to);
}

type SurahAyahProps = { value: RangePoint; onChange: (p: RangePoint) => void; disabled?: boolean };

/**
 * «ماذا حفظ اليوم؟» for one type on an open-ward plan: an unbounded من/إلى
 * pair plus a «لم يُسمِّع اليوم» toggle. The surah+ayah control is injected
 * because each page keeps its own CompactSurahAyah copy (file convention).
 */
export function OpenWardPicker({
  type, showType, value, suggestedFrom, onChange, disabled, SurahAyah,
}: {
  type: string;
  showType: boolean;
  value?: OpenWardValue;
  /** Where the student stopped last time + 1 — the default «من». */
  suggestedFrom: RangePoint;
  onChange: (v: OpenWardValue) => void;
  disabled?: boolean;
  SurahAyah: ComponentType<SurahAyahProps>;
}) {
  const none = value?.status === "none";
  const from = value?.status === "recorded" ? value.from : suggestedFrom;
  const to = value?.status === "recorded" ? value.to : suggestedFrom;
  const invalid = value?.status === "recorded" && toFlatIndex(value.from) > toFlatIndex(value.to);

  return (
    <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", display: "block", marginBottom: 6 }}>
        <i className="ti ti-pencil" style={{ marginLeft: 4, color: "var(--green)" }} /> ماذا حفظ الطالب اليوم؟
        {showType && (
          <span style={{ marginRight: 6 }}>
            <Badge tone={type === "حفظ" ? "green" : "gold"}>{type}</Badge>
          </span>
        )}
      </label>

      {none ? (
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
          <i className="ti ti-minus" style={{ marginLeft: 4 }} />لم يُسمِّع اليوم
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text2)" }}>من</span>
          <SurahAyah value={from} disabled={disabled} onChange={(p) => onChange({ status: "recorded", from: p, to })} />
          <span style={{ fontSize: 12, color: "var(--text2)" }}>إلى</span>
          <SurahAyah value={to} disabled={disabled} onChange={(p) => onChange({ status: "recorded", from, to: p })} />
        </div>
      )}

      {!value && !disabled && (
        <div style={{ fontSize: 11, color: "#b45309", marginTop: 6 }}>
          <i className="ti ti-alert-circle" style={{ marginLeft: 3 }} />
          حدّد المقطع أو اختر «لم يُسمِّع اليوم» قبل الحفظ
        </div>
      )}
      {invalid && (
        <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
          <i className="ti ti-alert-triangle" style={{ marginLeft: 3 }} />
          بداية المقطع بعد نهايته في ترتيب المصحف
        </div>
      )}

      {!disabled && (
        <button
          type="button"
          className="topbar-btn btn-ghost"
          style={{ fontSize: 11, padding: "4px 10px", marginTop: 8 }}
          onClick={() => onChange(none
            ? { status: "recorded", from: suggestedFrom, to: suggestedFrom }
            : { status: "none" })}
        >
          {none ? <><i className="ti ti-pencil" /> تسجيل مقطع</> : <><i className="ti ti-minus" /> لم يُسمِّع اليوم</>}
        </button>
      )}
    </div>
  );
}
