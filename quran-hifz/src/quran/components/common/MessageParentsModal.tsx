import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { useSendToParents } from "../../api/messages";
import { toAr } from "../../../lib/format";

const MAX = 1000;

/** «مراسلة أولياء الأمور» — a teacher writes once to the parents of the whole
 *  halqa or of one student. One-way: it lands in each parent's «الرسائل». */
export function MessageParentsModal({
  open,
  onClose,
  trackId,
  students,
}: {
  open: boolean;
  onClose: () => void;
  trackId: string;
  students: { _id: string; name: string }[];
}) {
  const [target, setTarget] = useState<"all" | "one">("all");
  const [studentId, setStudentId] = useState("");
  const [body, setBody] = useState("");
  const send = useSendToParents();

  const canSend = body.trim().length > 0 && (target === "all" || !!studentId) && !send.isPending;

  function close() {
    setTarget("all");
    setStudentId("");
    setBody("");
    onClose();
  }

  async function submit() {
    try {
      const { notified, unnotified } = await send.mutateAsync({
        track: trackId,
        ...(target === "one" ? { students: [studentId] } : {}),
        body: body.trim(),
      });
      if (notified > 0) toast.success(`تم إرسال الرسالة إلى ${toAr(notified)} من أولياء الأمور`);
      if (unnotified.length) {
        toast.warning(`لا يوجد ولي أمر مرتبط بـ: ${unnotified.map((u) => u.name).join("، ")}`);
      }
      if (notified > 0) close();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="مراسلة أولياء الأمور"
      maxWidth={520}
      footer={
        <button
          type="button"
          className="topbar-btn btn-primary"
          disabled={!canSend}
          onClick={submit}
        >
          <i className={`ti ${send.isPending ? "ti-loader-2 lp-spin" : "ti-send"}`} /> إرسال
        </button>
      }
    >
      <div className="mp-form">
        <div className="mp-targets" role="radiogroup" aria-label="المرسل إليهم">
          <label>
            <input type="radio" checked={target === "all"} onChange={() => setTarget("all")} /> كل
            أولياء أمور الحلقة ({toAr(students.length)})
          </label>
          <label>
            <input type="radio" checked={target === "one"} onChange={() => setTarget("one")} /> ولي
            أمر طالب محدد
          </label>
        </div>
        {target === "one" && (
          <select
            className="form-input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            aria-label="الطالب"
          >
            <option value="">— اختر الطالب —</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <textarea
          className="form-input mp-body"
          rows={5}
          maxLength={MAX}
          placeholder="اكتب رسالتك لأولياء الأمور…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="نص الرسالة"
        />
        <div className="mp-count">
          {toAr(body.length)}/{toAr(MAX)}
        </div>
      </div>
    </Modal>
  );
}
