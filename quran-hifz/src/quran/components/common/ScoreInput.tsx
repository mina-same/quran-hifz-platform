import { useEffect, useState } from "react";
import { parseDecimalText } from "../../lib/decimal";
import { toAr } from "../../../lib/format";

/** A criterion's grade, typed — decimals allowed (2.5), clamped to 0..max.
 * The typed text is kept locally so a half-typed "2." isn't snapped to "2",
 * and a grade above the max stays visible (in red) instead of silently
 * turning into the max — only the max itself is passed on. */
export function ScoreInput({
  value,
  max,
  onChange,
  disabled,
  label,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const [text, setText] = useState(String(value));
  const over = !disabled && parseDecimalText(text).value > max;
  // Follow outside changes (reset, absent → 0), but not our own echo.
  useEffect(() => {
    if (Math.min(parseDecimalText(text).value, max) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="eval-score-input">
      <input
        className={`form-input ${over ? "over" : ""}`}
        type="text"
        inputMode="decimal"
        value={disabled ? "" : text}
        placeholder="٠"
        disabled={disabled}
        aria-label={`درجة ${label} من ${max}`}
        aria-invalid={over}
        title={over ? `الحد الأقصى ${toAr(max)}` : undefined}
        onChange={(e) => {
          const parsed = parseDecimalText(e.target.value);
          setText(parsed.text);
          onChange(Math.min(parsed.value, max));
        }}
      />
      <span className={`eval-score-max ${over ? "over" : ""}`}>
        {over ? `الحد الأقصى ${toAr(max)}` : `/ ${toAr(max)}`}
      </span>
    </span>
  );
}
