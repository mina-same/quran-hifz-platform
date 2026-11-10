import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { usePortal } from "../../context/PortalContext";
import { useRankings, PERIOD_LABEL, type RankPeriod, type RankStudent } from "../../api/rankings";
import { useMasajid } from "../../api/masajid";
import { useTracks } from "../../api/tracks";
import { todayKey } from "../../lib/dailyReport";
import { downloadPagesPdf } from "../../lib/pdfPages";
import { PromoReport } from "./PromoReport";
import { StudentPointsModal } from "./StudentPointsModal";
import { ScopeTabs } from "./ScopeTabs";
import { toAr } from "../../../lib/format";

type SectionKey = "all" | "male" | "female";
const SECTION_TABS = [
  { value: "all", label: "الكل", icon: "ti-users" },
  { value: "male", label: "قسم البنين", icon: "ti-user" },
  { value: "female", label: "قسم البنات", icon: "ti-user-heart" },
] as const;

/**
 * «تقرير الإنجاز والتميّز»: pick the section, period, masjid and halqa. The
 * report shows as ordinary cards on the page; the A4 PDF pages are drawn
 * off-screen only while «تنزيل PDF» is making the file.
 */
export function PromoReportSection() {
  const { genderScope } = usePortal();
  const [period, setPeriod] = useState<RankPeriod>("month");
  // Follows the sidebar's النطاق by default: الكل / بنين / بنات.
  const [section, setSection] = useState<SectionKey>(
    genderScope === "female" ? "female" : genderScope === "male" ? "male" : "all",
  );
  const today = todayKey();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [masjid, setMasjid] = useState("");
  const [track, setTrack] = useState("");
  const [making, setMaking] = useState(false);
  const [detail, setDetail] = useState<RankStudent | null>(null);
  const { data: masajid = [] } = useMasajid();
  const { data: tracks = [] } = useTracks();
  const rankings = useRankings(period, true, { from, to, masjid, track, withAll: section === "all" });

  // Sections come from the masajid this user can see (a supervisor: their own).
  const hasMale = masajid.some((m) => m.gender === "male");
  const hasFemale = masajid.some((m) => m.gender === "female");
  const available = SECTION_TABS.filter((t) =>
    t.value === "all" ? hasMale && hasFemale : t.value === "male" ? hasMale : hasFemale,
  );
  const active: SectionKey | undefined = available.some((t) => t.value === section)
    ? section
    : available[0]?.value;
  // Masajid of the chosen section only (a masjid belongs to one section).
  const sectionMasajid = masajid
    .filter((m) => active === "all" || m.gender === active)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const masjidName = masajid.find((m) => m._id === masjid)?.name;
  // Halaqat (المسارات) of the chosen masjid, or of the whole section grouped by masjid.
  const masjidOf = (t: (typeof tracks)[number]) => (typeof t.masjid === "string" ? t.masjid : t.masjid?._id);
  const trackGroups = sectionMasajid
    .filter((m) => !masjid || m._id === masjid)
    .map((m) => ({
      masjid: m,
      tracks: tracks
        .filter((t) => masjidOf(t) === m._id)
        .sort((a, b) => a.title.localeCompare(b.title, "ar")),
    }))
    .filter((g) => g.tracks.length > 0);
  const trackCount = trackGroups.reduce((n, g) => n + g.tracks.length, 0);
  const trackName = tracks.find((t) => t._id === track)?.title;
  const scopeName = trackName ?? masjidName;
  const data = rankings.data;
  const sectionData = active ? data?.sections[active] : undefined;
  const invalidRange = period === "custom" && (!from || !to || from > to);

  async function download() {
    if (!data || !sectionData || making) return;
    const toastId = toast.loading("جارٍ تجهيز التقرير… ٠٪");
    try {
      // Draw the A4 pages off-screen, capture them, then drop them again.
      flushSync(() => setMaking(true));
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const pages = Array.from(document.querySelectorAll<HTMLElement>(".prs-offscreen .pr-page"));
      await downloadPagesPdf(
        pages,
        `تقرير-الإنجاز-${scopeName ?? (active === "male" ? "البنين" : active === "female" ? "البنات" : "الكل")}-${data.to}`,
        (done) =>
          toast.loading(`جارٍ تجهيز التقرير… ${toAr(Math.round((done / pages.length) * 100))}٪`, {
            id: toastId,
          }),
      );
      toast.success("تم تنزيل التقرير", { id: toastId });
    } catch (e) {
      toast.error((e as Error)?.message || "تعذّر إنشاء ملف PDF", { id: toastId });
    } finally {
      setMaking(false);
    }
  }

  return (
    <section className="prs">
      <div className="prs-head">
        <div>
          <h3>
            <i className="ti ti-award" /> تقرير الإنجاز والتميّز
          </h3>
          <p>أوائل الطلاب والحلقات والمعلمين — قابل للتنزيل والمشاركة PDF</p>
        </div>
        <button
          type="button"
          className="topbar-btn btn-primary"
          onClick={download}
          disabled={making || rankings.isFetching || !sectionData || invalidRange}
        >
          <i className={`ti ${making ? "ti-loader-2 lp-spin" : "ti-file-type-pdf"}`} />{" "}
          {making ? "جارٍ التجهيز…" : "تنزيل PDF"}
        </button>
      </div>
      <div className="card prs-bar">
        <div className="prs-filters">
          {available.length > 1 && (
            <ScopeTabs
              value={active ?? "male"}
              onChange={(v) => {
                setSection(v as SectionKey);
                setMasjid("");
                setTrack("");
              }}
              options={available.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
            />
          )}
          <ScopeTabs
            value={period}
            onChange={(v) => setPeriod(v as RankPeriod)}
            options={(["week", "month", "lastMonth", "all", "custom"] as const).map((p) => ({
              value: p,
              label: PERIOD_LABEL[p],
              icon: p === "custom" ? "ti-calendar-search" : "ti-calendar",
            }))}
          />
          {period === "custom" && (
            <div className="prs-range">
              <label>
                من{" "}
                <input className="form-input" type="date" value={from} max={to}
                  onChange={(e) => e.target.value && setFrom(e.target.value)} />
              </label>
              <label>
                إلى{" "}
                <input className="form-input" type="date" value={to} min={from} max={today}
                  onChange={(e) => e.target.value && setTo(e.target.value)} />
              </label>
            </div>
          )}
          {sectionMasajid.length > 1 && (
            <select className="form-input prs-masjid" value={masjid}
              onChange={(e) => { setMasjid(e.target.value); setTrack(""); }} aria-label="المسجد">
              <option value="">{active === "female" ? "كل الدور" : active === "all" ? "كل المساجد والدور" : "كل المساجد"}</option>
              {sectionMasajid.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          )}
          {trackCount > 1 && (
            <select className="form-input prs-masjid" value={track}
              onChange={(e) => setTrack(e.target.value)} aria-label="المسار">
              <option value="">كل المسارات</option>
              {masjid
                ? trackGroups[0]?.tracks.map((t) => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))
                : trackGroups.map((g) => (
                    <optgroup key={g.masjid._id} label={g.masjid.name}>
                      {g.tracks.map((t) => (
                        <option key={t._id} value={t._id}>{t.title}</option>
                      ))}
                    </optgroup>
                  ))}
            </select>
          )}
        </div>
      </div>

      {rankings.isError && <p className="prs-error">{(rankings.error as Error).message}</p>}
      {rankings.isLoading ? (
        <div className="prw-skel" aria-label="جارٍ التحميل">
          {[0, 1, 2].map((i) => (
            <span key={i} className="skl" />
          ))}
        </div>
      ) : data && sectionData && active ? (
        <div className={`prw-wrap ${rankings.isFetching ? "is-fetching" : ""}`} aria-busy={rankings.isFetching}>
          {rankings.isFetching && (
            <span className="prw-loading">
              <i className="ti ti-loader-2 lp-spin" /> جارٍ التحديث…
            </span>
          )}
          <PromoReport
            web
            section={active}
            data={sectionData}
            period={data.period}
            from={data.from}
            to={data.to}
            scopeName={scopeName}
            onStudent={setDetail}
          />
        </div>
      ) : null}

      {making && data && sectionData && active && (
        <div className="prs-offscreen" aria-hidden="true">
          <PromoReport
            section={active}
            data={sectionData}
            period={data.period}
            from={data.from}
            to={data.to}
            scopeName={scopeName}
          />
        </div>
      )}
      {data && (
        <StudentPointsModal student={detail} from={data.from} to={data.to} onClose={() => setDetail(null)} />
      )}
    </section>
  );
}
