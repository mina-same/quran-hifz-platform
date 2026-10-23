import { useRef, useState } from "react";
import { toast } from "sonner";
import { usePortal } from "../../context/PortalContext";
import { useRankings, PERIOD_LABEL, type RankPeriod } from "../../api/rankings";
import { downloadPagesPdf } from "../../lib/pdfPages";
import { PromoReport } from "./PromoReport";
import { ScopeTabs } from "./ScopeTabs";
import { toAr } from "../../../lib/format";

const SECTION_TABS = [
  { value: "male", label: "قسم البنين", icon: "ti-user" },
  { value: "female", label: "قسم البنات", icon: "ti-user-heart" },
] as const;

/**
 * «تقرير الإنجاز والتميّز» on the reports page itself: pick the section
 * (بنين / بنات) and the period, see the report pages as they will print, and
 * download them as a PDF. A supervisor only gets their own section.
 */
export function PromoReportSection() {
  const { genderScope } = usePortal();
  const [period, setPeriod] = useState<RankPeriod>("month");
  const [section, setSection] = useState<"male" | "female">(
    genderScope === "female" ? "female" : "male",
  );
  const [busy, setBusy] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, error } = useRankings(period);

  const available = SECTION_TABS.filter((t) => data?.sections[t.value]);
  const active = data?.sections[section] ? section : available[0]?.value;
  const sectionData = active ? data?.sections[active] : undefined;

  async function download() {
    const pages = Array.from(pagesRef.current?.querySelectorAll<HTMLElement>(".pr-page") ?? []);
    if (!pages.length || !data || !active) return;
    setBusy(true);
    const toastId = toast.loading("جارٍ تجهيز التقرير… ٠٪");
    try {
      await document.fonts.ready;
      await downloadPagesPdf(
        pages,
        `تقرير-الإنجاز-${active === "male" ? "البنين" : "البنات"}-${data.to}`,
        (done) =>
          toast.loading(`جارٍ تجهيز التقرير… ${toAr(Math.round((done / pages.length) * 100))}٪`, {
            id: toastId,
          }),
      );
      toast.success("تم تنزيل التقرير", { id: toastId });
    } catch {
      toast.error("تعذّر إنشاء ملف PDF", { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card prs">
      <div className="prs-head">
        <div>
          <h3>
            <i className="ti ti-award" /> تقرير الإنجاز والتميّز
          </h3>
          <p>أوائل الطلاب والحلقات والمعلمين — قابل للتنزيل والمشاركة</p>
        </div>
        <button
          type="button"
          className="topbar-btn btn-primary"
          onClick={download}
          disabled={busy || !sectionData}
        >
          <i className={`ti ${busy ? "ti-loader-2 lp-spin" : "ti-file-type-pdf"}`} /> تنزيل PDF
        </button>
      </div>

      <div className="prs-filters">
        {available.length > 1 && (
          <ScopeTabs
            value={active ?? "male"}
            onChange={(v) => setSection(v as "male" | "female")}
            options={available.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
          />
        )}
        <ScopeTabs
          value={period}
          onChange={(v) => setPeriod(v as RankPeriod)}
          options={(["week", "month", "all"] as const).map((p) => ({
            value: p,
            label: PERIOD_LABEL[p],
            icon: "ti-calendar",
          }))}
        />
      </div>

      {isError && <p className="prs-error">{(error as Error).message}</p>}
      {isLoading ? (
        <div className="prs-preview" aria-label="جارٍ التحميل">
          {[0, 1, 2].map((i) => (
            <div key={i} className="prs-page-skel skl" />
          ))}
        </div>
      ) : sectionData && data && active ? (
        <div className="prs-preview" ref={pagesRef}>
          <PromoReport
            section={active}
            data={sectionData}
            period={data.period}
            from={data.from}
            to={data.to}
          />
        </div>
      ) : null}
    </section>
  );
}
