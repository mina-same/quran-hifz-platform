import { useEffect, useState } from "react";
import { parseDecimalText } from "../../lib/decimal";
import { toAr } from "../../../lib/format";

/** A criterion's grade, typed — decimals allowed (2.5), clamped to 0..max.
 * The typed text is kept locally so a half-typed "2." isn't snapped to "2". */
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
  // Follow outside changes (reset, absent → 0), but not our own echo.
  useEffect(() => {
    if (parseDecimalText(text).value !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="eval-score-input">
      <input
        className="form-input"
        type="text"
        inputMode="decimal"
        value={disabled ? "" : text}
        placeholder="٠"
        disabled={disabled}
        aria-label={`درجة ${label} من ${max}`}
        onChange={(e) => {
          const parsed = parseDecimalText(e.target.value);
          const n = Math.min(parsed.value, max);
          setText(n === parsed.value ? parsed.text : String(n));
          onChange(n);
        }}
      />
      <span className="eval-score-max">/ {toAr(max)}</span>
    </span>
  );
}
