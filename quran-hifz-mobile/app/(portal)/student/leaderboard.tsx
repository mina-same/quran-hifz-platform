import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconInfoCircle } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import ScopeTabs from '@/components/ui/ScopeTabs';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useMyRanking, PERIOD_LABEL, type MyRankRow, type MyRanking, type RankPeriod } from '@/lib/queries/rankings';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const MEDALS = ['🥇', '🥈', '🥉'];
const PERIODS: RankPeriod[] = ['week', 'month', 'all'];

/** 2.5 → «2٫5» (API-backed numbers stay Western digits on mobile). */
function num(n: number): string {
  return String(Number.isInteger(n) ? n : Number(n.toFixed(1))).replace('.', '٫');
}

/** «نقطة / نقطتان / نقاط / نقطة» — Arabic counted-noun agreement for points. */
function pointsWord(n: number): string {
  if (!Number.isInteger(n)) return 'نقطة';
  if (n === 2) return 'نقطتان';
  return n >= 3 && n <= 10 ? 'نقاط' : 'نقطة';
}

/** A short, encouraging line for where the student stands in their halqa. */
function cheer(r: MyRanking): string {
  const { rankInTrack, points } = r.me;
  if (points === 0) return 'ابدأ رحلتك اليوم — كل يوم تحضر فيه وتُقيَّم يضيف إلى نقاطك 🌱';
  if (rankInTrack === 1) return 'ما شاء الله! أنت في صدارة حلقتك — حافظ على مكانك 🏆';
  if (rankInTrack <= 3) return 'أنت من الثلاثة الأوائل في حلقتك — خطوة واحدة نحو الصدارة 🌟';
  const above = r.track.filter((x) => x.points > points);
  const next = above.length ? Math.min(...above.map((x) => x.points)) : null;
  if (next !== null)
    return `تحتاج ${num(next - points)} ${pointsWord(next - points)} لتتقدّم مركزاً في حلقتك — أنت قادر بإذن الله 💪`;
  return 'واصل التقدّم، فالمنافسة في الخير محمودة 💪';
}

function RankList({ title, rows, mine, s }: {
  title: string;
  rows: MyRankRow[];
  mine: { rank: number; points: number; inList: boolean };
  s: ReturnType<typeof createS>;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <Text style={s.empty}>لا توجد نقاط مسجّلة في هذه الفترة بعد</Text>
      ) : (
        <View>
          {rows.map((r, i) => (
            <View key={`${r.name}-${i}`} style={[s.row, i > 0 && s.rowBorder, r.me && s.rowMe]}>
              <Text style={r.rank <= 3 ? s.medal : s.rank}>{r.rank <= 3 ? MEDALS[r.rank - 1] : num(r.rank)}</Text>
              <View style={s.info}>
                <Text style={[s.name, r.me && s.nameMe]} numberOfLines={1}>
                  {r.name}{r.me ? ' (أنت)' : ''}
                </Text>
                <Text style={s.sub} numberOfLines={1}>{r.trackTitle}</Text>
              </View>
              <Text style={s.points}>
                {num(r.points)}<Text style={s.pointsWord}> {pointsWord(r.points)}</Text>
              </Text>
            </View>
          ))}
          {!mine.inList && (
            <View style={[s.row, s.rowGap, s.rowMe]}>
              <Text style={s.rank}>{num(mine.rank)}</Text>
              <View style={s.info}>
                <Text style={[s.name, s.nameMe]}>أنت</Text>
              </View>
              <Text style={s.points}>
                {num(mine.points)}<Text style={s.pointsWord}> {pointsWord(mine.points)}</Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

/**
 * «لوحة الشرف» for students: their points (sum of daily grades) and rank in
 * their halqa and in their whole section (boys or girls) — web parity.
 */
export default function StudentLeaderboard() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const [period, setPeriod] = useState<RankPeriod>('month');
  const { data, isLoading, isError, error, isRefetching, refetch } = useMyRanking(period);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <ScopeTabs
          value={period}
          onChange={(v) => setPeriod(v as RankPeriod)}
          options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
        />

        {isError && <Alert variant="error">{(error as Error).message}</Alert>}

        {isLoading || !data ? (
          !isError && (
            <>
              <SkeletonRows count={1} rowHeight={150} />
              <SkeletonRows count={6} rowHeight={44} />
            </>
          )
        ) : (
          <>
            <View style={s.hero}>
              <Text style={s.heroPoints}>{num(data.me.points)}</Text>
              <Text style={s.heroLabel}>{pointsWord(data.me.points)} · {PERIOD_LABEL[period]}</Text>
              <Text style={s.cheer}>{cheer(data)}</Text>
              <View style={s.heroRanks}>
                <View style={s.heroRank}>
                  <Text style={s.heroRankValue}>
                    {num(data.me.rankInTrack)}<Text style={s.heroRankOf}> من {num(data.me.trackSize)}</Text>
                  </Text>
                  <Text style={s.heroRankLabel}>ترتيبك في حلقتك</Text>
                </View>
                <View style={s.heroRank}>
                  <Text style={s.heroRankValue}>
                    {num(data.me.rankInSection)}<Text style={s.heroRankOf}> من {num(data.me.sectionSize)}</Text>
                  </Text>
                  <Text style={s.heroRankLabel}>ترتيبك بين كل الحلقات</Text>
                </View>
              </View>
            </View>

            <RankList
              s={s}
              title={`أوائل حلقتك — ${data.me.trackTitle}`}
              rows={data.track}
              mine={{ rank: data.me.rankInTrack, points: data.me.points, inList: data.track.some((r) => r.me) }}
            />
            <RankList
              s={s}
              title="أوائل كل الحلقات"
              rows={data.section}
              mine={{ rank: data.me.rankInSection, points: data.me.points, inList: data.section.some((r) => r.me) }}
            />
            <View style={s.noteRow}>
              <IconInfoCircle size={14} color={theme.textMuted} />
              <Text style={s.note}>
                النقاط = مجموع درجات تقييمك اليومي في الفترة؛ الحضور المنتظم والإتقان يرفعانها.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    hero: {
      backgroundColor: theme.green,
      borderRadius: theme.radius,
      padding: 18,
      alignItems: 'center',
      gap: 4,
    },
    heroPoints: { fontSize: 40, lineHeight: 52, fontFamily: theme.fontCairoBold, color: theme.white },
    heroLabel: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textLight },
    cheer: { fontSize: 13, lineHeight: 21, fontFamily: theme.fontCairo, color: theme.white, textAlign: 'center', marginTop: 6 },
    heroRanks: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 10 },
    heroRank: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: theme.radiusSm,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroRankValue: { fontSize: 20, fontFamily: theme.fontCairoBold, color: theme.white },
    heroRankOf: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textLight },
    heroRankLabel: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textLight },
    empty: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 6 },
    rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    rowGap: { marginTop: 6 },
    rowMe: { backgroundColor: theme.greenPale, borderRadius: theme.radiusSm },
    medal: { width: 28, fontSize: 18, textAlign: 'center' },
    rank: { width: 28, fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.textMuted, textAlign: 'center' },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    nameMe: { color: theme.greenAccent },
    sub: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    points: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    pointsWord: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    note: { flex: 1, fontSize: 12, lineHeight: 19, fontFamily: theme.fontCairo, color: theme.textMuted },
  });
}
