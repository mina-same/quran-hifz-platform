import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import ScopeTabs from '@/components/ui/ScopeTabs';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { useRankings, ADMIN_PERIOD_LABEL, type AdminRankPeriod } from '@/lib/queries/rankings';
import { sharePdf } from '@/lib/pdf';
import { promoReportHtml, PROMO_REPORT_CSS } from '@/lib/promoReportPdf';

type Target = 'male' | 'female' | 'both';
const PERIODS: AdminRankPeriod[] = ['week', 'month', 'all'];
const TARGETS: [Target, string][] = [
  ['male', 'قسم البنين'],
  ['female', 'قسم البنات'],
  ['both', 'القسمان معاً'],
];

/**
 * The «تقرير الإنجاز والتميّز (PDF)» part of web ReportsDashboard's «تصدير» menu
 * (admin only): period chips, then one PDF per available section, or both
 * sections back-to-back in one file. Mounted only for admins so teachers never
 * request /rankings.
 */
export default function ReportPromoPdfExport() {
  const theme = useAppTheme();
  const s = useMemo(() => StyleSheet.create({
    wrap: { gap: 8, marginTop: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
    head: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
  }), [theme]);
  const [period, setPeriod] = useState<AdminRankPeriod>('month');
  const [making, setMaking] = useState<Target | null>(null);
  const rankings = useRankings(period);
  const data = rankings.data;

  async function make(target: Target) {
    if (!data || making) return;
    setMaking(target);
    // Web's toast lifecycle: loading → success / error on the same toast id.
    const toastId = toast.loading('جارٍ تجهيز التقرير…');
    try {
      const body = (['male', 'female'] as const)
        .filter((g) => data.sections[g] && (target === 'both' || target === g))
        .map((g) => promoReportHtml({ section: g, data: data.sections[g]!, period: data.period, from: data.from, to: data.to }))
        .join('');
      const label = target === 'both' ? 'القسمان' : target === 'male' ? 'البنين' : 'البنات';
      await sharePdf(`تقرير-الإنجاز-${label}-${data.to}`, body, PROMO_REPORT_CSS);
      toast.success('تم تنزيل التقرير', { id: toastId });
    } catch {
      toast.error('تعذّر إنشاء ملف PDF', { id: toastId });
    } finally {
      setMaking(null);
    }
  }

  const targets = TARGETS.filter(([g]) =>
    g === 'both' ? !!(data?.sections.male && data?.sections.female) : !!data?.sections[g],
  );

  return (
    <View style={s.wrap}>
      <Text style={s.head}>تقرير الإنجاز والتميّز (PDF)</Text>
      <ScopeTabs
        options={PERIODS.map((p) => ({ value: p, label: ADMIN_PERIOD_LABEL[p] }))}
        value={period}
        onChange={(v) => setPeriod(v as AdminRankPeriod)}
      />
      {rankings.isLoading ? (
        <SkeletonRows count={2} />
      ) : (
        targets.map(([g, label]) => (
          <Button
            key={g}
            label={`PDF — ${label}`}
            variant="outline"
            size="sm"
            onPress={() => make(g)}
            loading={making === g}
            disabled={!!making || rankings.isFetching}
            fullWidth
          />
        ))
      )}
    </View>
  );
}
