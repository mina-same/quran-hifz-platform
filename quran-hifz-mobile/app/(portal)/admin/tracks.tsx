import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ScrollView, View, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform, Modal, Linking,
} from 'react-native';
import {
  IconArchive, IconBuildingArch, IconCalendar, IconCalendarEvent, IconCalendarRepeat,
  IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconClock, IconFilter,
  IconMapPin, IconPencil, IconSearchOff, IconTarget, IconTrash, IconUser, IconUsers, IconVideo,
  IconWifi, IconX,
} from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import TrackStudentsPanel from '@/components/domain/TrackStudentsPanel';
import {
  useTracks,
  useDeleteOrArchiveTrack,
  type Track,
  type TrackTeacher,
} from '@/lib/queries/tracks';
import { useQuranPlans, segmentReversed, isSlice } from '@/lib/queries/quranPlan';
import { planScheduleDays, planScheduleRange, resolveLinkedPlan, NO_PLAN_SCHEDULE_TEXT } from '@/lib/trackSchedule';
import { SURAHS } from '@/lib/data/surahs';
import { orientSlice } from '@/lib/quranRange';
import { fmtDateShort } from '@/lib/date';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { usePortalStore } from '@/lib/store/portalStore';
import { matchesGenderScope } from '@/lib/constants/genderScope';

type AppTheme = ReturnType<typeof useAppTheme>;
type Styles = ReturnType<typeof createS>;

function getTeacherId(v: TrackTeacher | string) {
  return typeof v === 'object' ? v._id : v;
}
function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function masjidNameOf(t: Track) {
  return typeof t.masjid === 'object' && t.masjid ? t.masjid.name : '';
}
function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? '';
}
/** First letter of the first two words — the same initials the web cards show. */
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}

const STATUS_LABEL: Record<Track['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<Track['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };
const STATUS_ORDER: Track['status'][] = ['active', 'upcoming', 'ended'];
const PAGE_SIZE = 12;
const ARCHIVE_NEEDED_MSG = 'لا يمكن حذف مسار به سجلات تاريخية مرتبطة به';

/** Rotating chip tones for teacher avatars — theme.tone so dark mode holds. */
function avatarTone(theme: AppTheme, i: number) {
  const order = ['green', 'gold', 'blue', 'red'] as const;
  return theme.tone[order[i % order.length]];
}

/** Capacity ink: red once nearly full, amber when filling, green otherwise. */
function capacityColor(theme: AppTheme, pct: number) {
  if (pct >= 90) return theme.red;
  if (pct >= 70) return theme.amber;
  return theme.mode === 'dark' ? theme.greenLight : theme.green;
}

export default function AdminTracks() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const genderScope = usePortalStore((st) => st.genderScope);
  const readOnly = usePortalStore((st) => st.readOnly);
  const { data: allTracks = [], isLoading, isRefetching, refetch } = useTracks();
  const tracks = allTracks.filter((t) => matchesGenderScope(t.masjid, genderScope));

  const deleteTrack = useDeleteOrArchiveTrack();
  const [studentsPanelId, setStudentsPanelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [needsArchive, setNeedsArchive] = useState(false);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');

  function closeDeleteDialog() {
    setDeleteId(null);
    setNeedsArchive(false);
    setArchiveConfirmText('');
  }

  function openAdd() {
    router.push('/(portal)/admin/track-form' as any);
  }
  function openEdit(t: Track) {
    router.push({ pathname: '/(portal)/admin/track-form', params: { id: t._id } } as any);
  }

  /* ── search + filters (same set as web) ── */
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [masjidFilter, setMasjidFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'' | 'online' | 'onsite'>('');
  const [statusFilter, setStatusFilter] = useState<'' | Track['status']>('');

  const options = useMemo(() => {
    const masajid = new Set<string>(), teachers = new Map<string, string>(), types = new Set<string>();
    for (const t of tracks) {
      const m = masjidNameOf(t);
      if (m) masajid.add(m);
      if (t.type) types.add(t.type);
      for (const tc of t.teachers) teachers.set(getTeacherId(tc), getTeacherName(tc));
    }
    const ar = (a: string, b: string) => a.localeCompare(b, 'ar');
    return {
      masajid: [...masajid].sort(ar),
      teachers: [...teachers].sort((a, b) => ar(a[1], b[1])),
      types: [...types].sort(ar),
    };
  }, [tracks]);

  const q = search.trim();
  const filtered = tracks.filter((t) =>
    (!q || [t.title, masjidNameOf(t), ...t.teachers.map(getTeacherName)].some((v) => v?.includes(q)))
    && (!masjidFilter || masjidNameOf(t) === masjidFilter)
    && (!teacherFilter || t.teachers.some((tc) => getTeacherId(tc) === teacherFilter))
    && (!typeFilter || t.type === typeFilter)
    && (!modeFilter || (modeFilter === 'online') === !!t.isOnline)
    && (!statusFilter || t.status === statusFilter));
  const isFiltered = !!(q || masjidFilter || teacherFilter || typeFilter || modeFilter || statusFilter);
  function clearFilters() {
    setSearch(''); setMasjidFilter(''); setTeacherFilter(''); setTypeFilter(''); setModeFilter(''); setStatusFilter('');
  }

  /* ── pagination — over the status-ordered list, then grouped ── */
  const [page, setPage] = useState(1);
  const filterKey = [q, masjidFilter, teacherFilter, typeFilter, modeFilter, statusFilter].join('|');
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) { setLastFilterKey(filterKey); setPage(1); }

  const ordered = STATUS_ORDER.flatMap((st) => filtered.filter((t) => t.status === st));
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount);
  const pageRows = ordered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  function goToPage(p: number) {
    setPage(p);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }
  const countOf = (st: Track['status']) => filtered.filter((t) => t.status === st).length;

  function chip(label: string, active: boolean, onPress: () => void) {
    return (
      <Pressable key={label} haptic="select" style={[s.filterChip, active && s.filterChipActive]} onPress={onPress}>
        <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{label}</Text>
      </Pressable>
    );
  }

  function renderSection(status: Track['status'], label: string, color: string, dimmed?: boolean) {
    const list = pageRows.filter((t) => t.status === status);
    if (list.length === 0) return null;
    return (
      <View style={s.section}>
        <View style={s.sectionHead}>
          <View style={[s.sectionBar, { backgroundColor: color }]} />
          <Text style={s.sectionLabel}>{label}</Text>
          <View style={[s.sectionCount, { backgroundColor: theme.cardAlt }]}>
            <Text style={[s.sectionCountText, { color }]}>{countOf(status)}</Text>
          </View>
        </View>
        <View style={[s.sectionList, dimmed && s.dimmed]}>
          {list.map((t) => (
            <TrackCard
              key={t._id}
              t={t}
              theme={theme}
              s={s}
              readOnly={readOnly}
              onOpen={() => router.push({ pathname: '/(portal)/admin/track-detail', params: { id: t._id } } as any)}
              onManageStudents={() => setStudentsPanelId((cur) => (cur === t._id ? null : t._id))}
              onEdit={() => openEdit(t)}
              onDelete={() => setDeleteId(t._id)}
            >
              {studentsPanelId === t._id && (
                <View style={s.studentsPanel}>
                  <View style={s.panelHead}>
                    <Text style={s.panelTitle}>إدارة طلاب المسار</Text>
                    <Pressable hitSlop={10} onPress={() => setStudentsPanelId(null)}>
                      <IconX size={16} color={theme.textMuted} />
                    </Pressable>
                  </View>
                  <TrackStudentsPanel track={t} />
                  <Button label="إغلاق" variant="ghost" fullWidth onPress={() => setStudentsPanelId(null)} />
                </View>
              )}
            </TrackCard>
          ))}
        </View>
      </View>
    );
  }

  const target = tracks.find((t) => t._id === deleteId);
  const confirmMatches = !!target?.title && archiveConfirmText.trim() === target.title.trim();

  async function runDelete(archive: boolean) {
    if (!deleteId) return;
    try {
      await deleteTrack.mutateAsync({ id: deleteId, archive });
      closeDeleteDialog();
    } catch (e) {
      const message = (e as Error).message;
      if (!archive && message === ARCHIVE_NEEDED_MSG) setNeedsArchive(true);
      else toast.error(message);
    }
  }

  const pageFrom = ordered.length === 0 ? 0 : (curPage - 1) * PAGE_SIZE + 1;
  const pageTo = Math.min(curPage * PAGE_SIZE, ordered.length);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {!readOnly && (
          <Pressable style={s.addBtn} onPress={openAdd}>
            <Text style={s.addBtnText}>+ مسار جديد</Text>
          </Pressable>
        )}

        {isLoading && <SkeletonRows count={4} />}

        {!isLoading && tracks.length === 0 && (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <IconCalendarEvent size={30} color={theme.mode === 'dark' ? theme.greenLight : theme.green} />
            </View>
            <Text style={s.emptyTitle}>لا توجد مسارات بعد</Text>
            <Text style={s.emptySub}>أضف أول مسار</Text>
            {!readOnly && <Button label="+ مسار جديد" onPress={openAdd} />}
          </View>
        )}

        {!isLoading && tracks.length > 0 && (
          <Card>
            <View style={s.searchRow}>
              <View style={s.flex1}>
                <FormInput placeholder="ابحث باسم المسار أو المسجد أو المعلم..." value={search} onChangeText={setSearch} />
              </View>
              <Pressable
                haptic="select"
                style={[s.filterToggle, showFilters && s.filterChipActive]}
                onPress={() => setShowFilters((o) => !o)}
              >
                <IconFilter size={18} color={showFilters ? theme.tone.green.text : theme.textMuted} />
              </Pressable>
            </View>

            {showFilters && (
              <View style={s.filters}>
                <FormSelect
                  value={masjidFilter}
                  onChange={setMasjidFilter}
                  options={[{ value: '', label: 'كل المساجد' }, ...options.masajid.map((m) => ({ value: m, label: m }))]}
                  placeholder="كل المساجد"
                  title="تصفية حسب المسجد"
                />
                <FormSelect
                  value={teacherFilter}
                  onChange={setTeacherFilter}
                  options={[{ value: '', label: 'كل المعلمين' }, ...options.teachers.map(([id, name]) => ({ value: id, label: name }))]}
                  placeholder="كل المعلمين"
                  title="تصفية حسب المعلم"
                  searchable
                />
                <FormSelect
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[{ value: '', label: 'كل الأنواع' }, ...options.types.map((ty) => ({ value: ty, label: ty }))]}
                  placeholder="كل الأنواع"
                  title="تصفية حسب النوع"
                />
                <View style={s.chipRow}>
                  {chip('حضوري وأونلاين', modeFilter === '', () => setModeFilter(''))}
                  {chip('حضوري', modeFilter === 'onsite', () => setModeFilter('onsite'))}
                  {chip('أونلاين', modeFilter === 'online', () => setModeFilter('online'))}
                </View>
                <View style={s.chipRow}>
                  {chip('كل الحالات', statusFilter === '', () => setStatusFilter(''))}
                  {STATUS_ORDER.map((st) => chip(STATUS_LABEL[st], statusFilter === st, () => setStatusFilter(st)))}
                </View>
              </View>
            )}

            {isFiltered && (
              <Pressable haptic="select" style={s.clearBtn} onPress={clearFilters}>
                <IconX size={14} color={theme.textMuted} />
                <Text style={s.clearText}>مسح ({filtered.length} من {tracks.length})</Text>
              </Pressable>
            )}
          </Card>
        )}

        {!isLoading && tracks.length > 0 && filtered.length === 0 && (
          <View style={s.noMatch}>
            <IconSearchOff size={28} color={theme.textMuted} />
            <Text style={s.mutedInline}>لا توجد مسارات مطابقة للبحث</Text>
          </View>
        )}

        {!isLoading && renderSection('active', 'المسارات النشطة', theme.mode === 'dark' ? theme.greenLight : theme.green)}
        {!isLoading && renderSection('upcoming', 'المسارات القادمة', theme.amber)}
        {!isLoading && renderSection('ended', 'المسارات المنتهية', theme.textMuted, true)}

        {!isLoading && pageCount > 1 && (
          <View style={s.pager}>
            <Pressable style={[s.pagerBtn, curPage <= 1 && s.dimmed]} disabled={curPage <= 1} onPress={() => goToPage(curPage - 1)}>
              <IconChevronRight size={18} color={theme.text} />
            </Pressable>
            <Text style={s.pagerInfo}>{pageFrom}–{pageTo} من {ordered.length}</Text>
            <Pressable style={[s.pagerBtn, curPage >= pageCount && s.dimmed]} disabled={curPage >= pageCount} onPress={() => goToPage(curPage + 1)}>
              <IconChevronLeft size={18} color={theme.text} />
            </Pressable>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Plain RN Modal is fine here: no FormSelect inside, only a TextInput. */}
      <Modal visible={!!deleteId} transparent animationType="fade" onRequestClose={closeDeleteDialog}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable haptic="none" style={s.overlay} onPress={closeDeleteDialog}>
          <Pressable haptic="none" style={s.dialog} onPress={() => {}}>
            {!needsArchive ? (
              <>
                <View style={s.dialogIcon}>
                  <IconTrash size={26} color={theme.red} />
                </View>
                <Text style={s.dialogTitle}>حذف المسار</Text>
                <Text style={s.dialogBody}>سيُحذف المسار نهائياً ولا يمكن التراجع.</Text>
              </>
            ) : (
              <>
                <View style={[s.dialogIcon, { backgroundColor: theme.tone.gold.bg }]}>
                  <IconArchive size={26} color={theme.tone.gold.text} />
                </View>
                <Text style={s.dialogTitle}>لا يمكن حذف هذا المسار نهائياً</Text>
                <Text style={s.dialogBody}>
                  يوجد سجلات تاريخية مرتبطة به (حضور، تقييمات، واجبات...). يمكنك بدلاً من ذلك <Text style={s.bold}>أرشفته</Text>: يختفي من كل مكان في التطبيق نهائياً، لكن سجلاته التاريخية تبقى محفوظة. لا يمكن التراجع عن هذا الإجراء.
                </Text>
                <Text style={[s.dialogBody, { marginTop: 10 }]}>
                  للتأكيد، اكتب اسم المسار: <Text style={s.bold}>{target?.title}</Text>
                </Text>
                <View style={s.confirmInput}>
                  <FormInput
                    value={archiveConfirmText}
                    onChangeText={setArchiveConfirmText}
                    placeholder={target?.title}
                    style={{ textAlign: 'center' }}
                  />
                </View>
              </>
            )}
            <View style={s.dialogActions}>
              <View style={s.flex1}>
                {!needsArchive ? (
                  <Button
                    label={deleteTrack.isPending ? 'جارٍ الحذف...' : 'حذف'}
                    variant="danger"
                    fullWidth
                    onPress={() => runDelete(false)}
                    disabled={deleteTrack.isPending}
                  />
                ) : (
                  <Button
                    label={deleteTrack.isPending ? 'جارٍ الأرشفة...' : 'أرشفة نهائياً'}
                    variant="danger"
                    fullWidth
                    onPress={() => runDelete(true)}
                    disabled={!confirmMatches || deleteTrack.isPending}
                  />
                )}
              </View>
              <View style={s.flex1}>
                <Button label="إلغاء" variant="ghost" fullWidth onPress={closeDeleteDialog} />
              </View>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Track card ──────────────────────────────────────────────
 * Its own component so each card can run the `useQuranPlans` lookup for the
 * plan linked to that track — the same per-card query the web page makes.
 * Compact summary by default; «التفاصيل» expands the full block (web parity). */
function TrackCard({
  t, theme, s, readOnly, onOpen, onManageStudents, onEdit, onDelete, children,
}: {
  t: Track;
  theme: AppTheme;
  s: Styles;
  readOnly: boolean;
  onOpen: () => void;
  onManageStudents: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { data: linkedPlans = [] } = useQuranPlans({ track: t._id });
  // A plan keeps its `track` ref after its targetType is switched to
  // "students", so this filter can return several plans for one track. Prefer
  // the one actually targeting the whole track, or this card's "مقرَّر اليوم"
  // disagrees with the track-detail screen for the same track.
  const linkedPlan = resolveLinkedPlan(linkedPlans);
  const scheduleDays = planScheduleDays(linkedPlan);
  const scheduleRange = planScheduleRange(linkedPlan);
  const scheduleRangeLabel = scheduleRange
    ? scheduleRange.endType === 'date'
      ? `${fmtDateShort(scheduleRange.startDate)} – ${fmtDateShort(scheduleRange.endDate)}`
      : `من ${fmtDateShort(scheduleRange.startDate)} · ${scheduleRange.activeDaysCount} يوم نشط`
    : NO_PLAN_SCHEDULE_TEXT;

  const enrolled = t.studentCount ?? 0;
  const pct = Math.min(100, Math.round((enrolled / t.maxStudents) * 100));
  const barClr = capacityColor(theme, pct);
  const statusTone = theme.tone[STATUS_VARIANT[t.status]];
  const stripColor = t.status === 'active'
    ? (theme.mode === 'dark' ? theme.greenLight : theme.green)
    : t.status === 'upcoming' ? theme.amber : theme.border;
  const placeLabel = t.isOnline ? 'أونلاين' : masjidNameOf(t);

  const todayText = (() => {
    const list = linkedPlan?.todayAssignments ?? [];
    if (list.length === 0) return 'لا يوجد جزء مخصص لليوم';
    const multi = list.length > 1;
    // Direction is per segment — read it from the type that is actually due.
    return list.map((entry) => {
      if (!isSlice(entry)) {
        return `${multi ? `مقرَّر اليوم (${entry.type})` : 'مقرَّر اليوم'}: ورد حر — يُسجَّل في الحلقة`;
      }
      const a = orientSlice(entry, segmentReversed(linkedPlan!, entry.type));
      const pages = a.pageEnd !== a.pageStart ? `${a.pageStart} - ${a.pageEnd}` : `${a.pageStart}`;
      const label = multi ? `مقرَّر اليوم (${entry.type})` : 'مقرَّر اليوم';
      return `${label}: ${surahName(a.surahStart)} : ${a.ayahStart} — ${surahName(a.surahEnd)} : ${a.ayahEnd} (صفحة ${pages})`;
    }).join('\n');
  })();

  return (
    <Card noPadding>
      <View style={[s.strip, { backgroundColor: stripColor }]} />
      <View style={s.cardBody}>
      {/* Tapping the card opens the track detail — the students panel sits
          OUTSIDE this Pressable so a stray tap in it doesn't navigate away. */}
      <Pressable haptic="none" style={s.cardMain} onPress={onOpen}>
        <View style={s.chipsRow}>
          <Badge label={STATUS_LABEL[t.status]} variant={STATUS_VARIANT[t.status]} />
          <View style={[s.chip, { backgroundColor: statusTone.bg }]}>
            <Text style={[s.chipText, { color: statusTone.text }]} numberOfLines={1}>{t.type}</Text>
          </View>
          <View style={[s.chip, s.chipIcon, { backgroundColor: t.isOnline ? theme.tone.blue.bg : theme.cardAlt }]}>
            {t.isOnline
              ? <IconWifi size={12} color={theme.tone.blue.text} />
              : <IconBuildingArch size={12} color={theme.textMuted} />}
            <Text style={[s.chipText, { color: t.isOnline ? theme.tone.blue.text : theme.textMuted }]}>
              {t.isOnline ? 'أونلاين' : 'حضوري'}
            </Text>
          </View>
        </View>

        <Text style={s.trackTitle}>{t.title}</Text>

        {/* compact summary */}
        <View style={s.summaryRow}>
          <View style={s.iconLabel}>
            {t.isOnline ? <IconVideo size={13} color={theme.textMuted} /> : <IconMapPin size={13} color={theme.textMuted} />}
            <Text style={s.summaryText}>{placeLabel || '—'}</Text>
          </View>
          {!!t.timeSlot && (
            <View style={s.iconLabel}>
              <IconClock size={13} color={theme.textMuted} />
              <Text style={s.summaryText}>{t.timeSlot}</Text>
            </View>
          )}
          <View style={s.iconLabel}>
            <IconUser size={13} color={theme.textMuted} />
            <Text style={s.summaryText}>{t.teachers.length ? t.teachers.map(getTeacherName).join('، ') : 'لا يوجد معلم'}</Text>
          </View>
        </View>

        {/* capacity */}
        <View style={s.capacityRow}>
          <View style={[s.capacityTrack, s.flex1]}>
            <View style={[s.capacityFill, { width: `${pct}%`, backgroundColor: barClr }]} />
          </View>
          <Text style={[s.capacityValue, { color: barClr }]}>{enrolled} / {t.maxStudents} طالب</Text>
          {linkedPlan?.progress && (
            <View style={s.planPct}><Text style={s.planPctText}>{linkedPlan.progress.percent}%</Text></View>
          )}
        </View>

        <Pressable haptic="select" style={s.expandBtn} onPress={() => setExpanded((o) => !o)}>
          <Text style={s.expandText}>{expanded ? 'إخفاء التفاصيل' : 'التفاصيل'}</Text>
          {expanded ? <IconChevronUp size={14} color={theme.textMuted} /> : <IconChevronDown size={14} color={theme.textMuted} />}
        </Pressable>

        {expanded && (
          <View style={s.cardMain}>
            <View style={s.infoGrid}>
              <InfoItem s={s} icon={<IconClock size={15} color={theme.green} />} label="الوقت" val={t.timeSlot} />
              <InfoItem s={s} icon={<IconCalendarRepeat size={15} color={theme.green} />} label="الأيام" val={linkedPlan ? scheduleDays.join('، ') : NO_PLAN_SCHEDULE_TEXT} />
              <InfoItem s={s} icon={<IconCalendar size={15} color={theme.green} />} label="مدة الخطة" val={scheduleRangeLabel} span />
              <InfoItem
                s={s}
                icon={t.isOnline ? <IconVideo size={15} color={theme.green} /> : <IconMapPin size={15} color={theme.green} />}
                label="المسجد"
                val={placeLabel}
                span
              />
            </View>

            <Text style={s.blockLabel}>المعلمون</Text>
            <View style={s.teacherAvatars}>
              {t.teachers.length === 0 && <Text style={s.mutedInline}>— لا يوجد معلم —</Text>}
              {t.teachers.map((tc, i) => {
                const tone = avatarTone(theme, i);
                const name = getTeacherName(tc);
                return (
                  <View key={getTeacherId(tc)} style={[s.teacherAvatarChip, { backgroundColor: tone.bg }]}>
                    <View style={[s.avatarSm, { backgroundColor: tone.text }]}>
                      <Text style={[s.avatarSmText, { color: tone.bg }]}>{avatarInitials(name)}</Text>
                    </View>
                    <Text style={[s.teacherAvatarText, { color: tone.text }]} numberOfLines={1}>{name}</Text>
                  </View>
                );
              })}
            </View>

            <View style={[s.planBox, !!linkedPlan?.todayAssignments.length && { backgroundColor: theme.greenPale }]}>
              <Pressable haptic="select" disabled={!linkedPlan} onPress={() => setPlanOpen((o) => !o)} style={s.planHead}>
                <View style={s.iconLabel}>
                  <IconTarget size={14} color={linkedPlan?.todayAssignments.length ? theme.green : theme.textMuted} />
                  <Text style={[s.planTitle, !!linkedPlan?.todayAssignments.length && { color: theme.green }]}>الخطة القرآنية</Text>
                  {linkedPlan?.progress && (
                    <View style={s.planPct}>
                      <Text style={s.planPctText}>{linkedPlan.progress.percent}%</Text>
                    </View>
                  )}
                </View>
                {linkedPlan && (planOpen
                  ? <IconChevronUp size={14} color={theme.textMuted} />
                  : <IconChevronDown size={14} color={theme.textMuted} />)}
              </Pressable>

              {!linkedPlan && <Text style={s.planEmpty}>لا توجد خطة حفظ مرتبطة بهذا المسار</Text>}

              {linkedPlan && planOpen && (
                <View style={s.planDetail}>
                  <Text style={s.planName}>{linkedPlan.name}</Text>
                  {linkedPlan.progress && (
                    <>
                      <View style={s.capacityTrack}>
                        <View style={[s.planFill, { width: `${linkedPlan.progress.percent}%` }]} />
                      </View>
                      <Text style={s.planMeta}>
                        {linkedPlan.juzProgress ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء` : ''}
                        {' · '}{linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                      </Text>
                    </>
                  )}
                  <Text style={s.planToday}>{todayText}</Text>
                </View>
              )}
            </View>

            {t.isOnline && !!t.meetLink && (
              <Pressable style={s.joinBtn} onPress={() => Linking.openURL(t.meetLink!)}>
                <IconVideo size={14} color={theme.tone.blue.text} />
                <Text style={s.joinText}>انضم للجلسة</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* actions — web hides the whole group for read-only (supervisor) */}
        {!readOnly && (
          <View style={s.actionsRow}>
            <Pressable style={s.actionBtn} onPress={onManageStudents}>
              <IconUsers size={15} color={theme.green} />
              <Text style={s.actionText}>الطلاب</Text>
              {enrolled > 0 && (
                <View style={s.countPill}><Text style={s.countPillText}>{enrolled}</Text></View>
              )}
            </Pressable>
            <Pressable style={s.actionBtn} onPress={onEdit}>
              <IconPencil size={15} color={theme.textMuted} />
              <Text style={[s.actionText, { color: theme.textMuted }]}>تعديل</Text>
            </Pressable>
            <Pressable haptic="medium" style={[s.actionBtn, s.actionBtnDanger]} onPress={onDelete}>
              <IconTrash size={15} color={theme.red} />
              <Text style={[s.actionText, { color: theme.red }]}>حذف</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
      {children}
      </View>
    </Card>
  );
}

function InfoItem({ s, icon, label, val, span }: { s: Styles; icon: React.ReactNode; label: string; val: string; span?: boolean }) {
  return (
    <View style={[s.infoItem, span && s.infoItemSpan]}>
      {icon}
      <View style={s.flex1}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>{val || '—'}</Text>
      </View>
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16, gap: 14 },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
    mutedInline: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
    flex1: { flex: 1 },
    bold: { fontFamily: theme.fontCairoBold, color: theme.text },

    // ── search / filters ──
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterToggle: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    filters: { gap: 10, marginTop: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    filterChipActive: { backgroundColor: theme.tone.green.bg, borderColor: theme.tone.green.border },
    filterChipText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    filterChipTextActive: { color: theme.tone.green.text, fontFamily: theme.fontCairoBold },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    clearText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    noMatch: { alignItems: 'center', paddingVertical: 30, gap: 8 },

    // ── pagination ──
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    pagerBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    pagerInfo: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },

    // ── sections ──
    section: { gap: 12 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionBar: { width: 4, height: 18, borderRadius: 2 },
    sectionLabel: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    sectionCount: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    sectionCountText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    sectionList: { gap: 14 },
    dimmed: { opacity: 0.75 },

    // ── empty state ──
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: { width: 72, height: 72, borderRadius: 18, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    emptySub: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, marginBottom: 10 },

    // ── track card ──
    strip: { height: 4, borderTopLeftRadius: theme.radius, borderTopRightRadius: theme.radius },
    cardBody: { padding: 16, gap: 10 },
    cardMain: { gap: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    chip: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3, flexShrink: 1, maxWidth: '100%' },
    chipIcon: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chipText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    trackTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, columnGap: 12 },
    summaryText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, flexShrink: 1 },
    capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 6 },
    expandText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexBasis: '46%', flexGrow: 1 },
    infoItemSpan: { flexBasis: '100%' },
    infoLabel: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },

    blockLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    teacherAvatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    teacherAvatarChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, maxWidth: '100%', flexShrink: 1 },
    avatarSm: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    avatarSmText: { fontSize: 9, fontFamily: theme.fontCairoBold },
    teacherAvatarText: { fontSize: 12, fontFamily: theme.fontCairoBold, flexShrink: 1 },

    iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold },
    capacityTrack: { height: 6, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    capacityFill: { height: '100%', borderRadius: 999 },

    planBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12 },
    planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planTitle: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    planPct: { backgroundColor: theme.greenAccent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
    planPctText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },
    planEmpty: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 6 },
    planDetail: { marginTop: 8, gap: 4 },
    planName: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    planFill: { height: '100%', borderRadius: 999, backgroundColor: theme.mode === 'dark' ? theme.greenLight : theme.green },
    planMeta: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    planToday: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.text },

    joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: theme.tone.blue.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    joinText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.tone.blue.text },

    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 9 },
    actionBtnDanger: { borderColor: theme.tone.red.border },
    actionText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
    countPill: { backgroundColor: theme.greenAccent, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
    countPillText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },

    // ── students panel ──
    studentsPanel: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 10 },
    panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    panelTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },

    // ── delete dialog ──
    overlay: { flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 360, backgroundColor: theme.card, borderRadius: 16, padding: 24, alignItems: 'center' },
    dialogIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.tone.red.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    dialogTitle: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 8, textAlign: 'center' },
    dialogBody: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center' },
    confirmInput: { alignSelf: 'stretch', marginTop: 12 },
    dialogActions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
  });
}
