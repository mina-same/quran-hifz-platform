import { useParentChildren } from "../api/parent";
import { useParentContext } from "../context/ParentContext";

/** Header dropdown on every parent page: switch between children directly.
 *  Hidden for a single-child parent. */
export function ParentChildSwitch() {
  const { data: children = [] } = useParentChildren();
  const { activeChild, setActiveChild } = useParentContext();
  if (children.length < 2) return null;
  return (
    <label className="child-switch">
      <i className="ti ti-users" aria-hidden="true" />
      <select
        className="form-input"
        value={activeChild?._id ?? ""}
        onChange={(e) => {
          const next = children.find((c) => c._id === e.target.value);
          if (next) setActiveChild(next);
        }}
        aria-label="تغيير الابن"
      >
        {children.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
