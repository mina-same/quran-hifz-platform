import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Text from '@/components/ui/Text';
import FormPage, { useFormPageStyles } from '@/components/ui/FormPage';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { useHalqat, useCreateHalqa, useUpdateHalqa } from '@/lib/queries/halqat';
import { useTeachers } from '@/lib/queries/teachers';
import { useMasajid } from '@/lib/queries/masajid';
import { useSpecialTracks } from '@/lib/queries/specialTracks';

/** teacher/masjid/specialTrack come back populated ({_id,…}) or as a bare id. */
function refId(ref: { _id: string } | string | null | undefined): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id;
}

export default function AdminHalqaForm() {
  const router = useRouter();
  const s = useFormPageStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: halqat = [] } = useHalqat();
  const { data: teachers = [] } = useTeachers();
  const { data: masajid = [] } = useMasajid();
  const { data: tracks = [] } = useSpecialTracks();
  const createHalqa = useCreateHalqa();
  const updateHalqa = useUpdateHalqa();

  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [masjid, setMasjid] = useState('');
  const [specialTrack, setSpecialTrack] = useState('');
  const [days, setDays] = useState('');
  const [time, setTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState('');

  const existing = id ? halqat.find((h) => h._id === id) : undefined;
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setTeacher(refId(existing.teacher));
    setMasjid(refId(existing.masjid));
    setSpecialTrack(refId(existing.specialTrack));
    setDays(existing.days ?? '');
    setTime(existing.time ?? '');
    setCapacity(existing.capacity ? String(existing.capacity) : '');
  }, [existing?._id]);

  async function handleSubmit() {
    if (!name.trim() || !teacher || !masjid || !specialTrack || !days.trim() || !time.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const body: Record<string, unknown> = {
      name: name.trim(), teacher, masjid, specialTrack,
      days: days.trim(), time: time.trim(),
    };
    if (capacity.trim()) body.capacity = Number(capacity);
    try {
      setError('');
      if (id) await updateHalqa.mutateAsync({ id, ...body });
      else await createHalqa.mutateAsync(body);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <FormPage
      title={id ? 'تعديل بيانات الحلقة' : 'إضافة حلقة جديدة'}
      error={error}
      pending={createHalqa.isPending || updateHalqa.isPending}
      onSubmit={handleSubmit}
    >
      <Text style={s.label}>اسم الحلقة *</Text>
      <FormInput placeholder="حلقة الفجر" value={name} onChangeText={setName} />

      <Text style={s.label}>المعلم *</Text>
      <FormSelect
        value={teacher}
        onChange={setTeacher}
        options={teachers.map((t) => ({ value: t._id, label: t.name }))}
        placeholder="اختر المعلم"
        title="المعلم"
      />

      <Text style={s.label}>المسجد *</Text>
      <FormSelect
        value={masjid}
        onChange={setMasjid}
        options={masajid.map((m) => ({ value: m._id, label: m.name }))}
        placeholder="اختر المسجد"
        title="المسجد"
      />

      {/* Every halqa belongs to a مسار — the server requires it. */}
      <Text style={s.label}>المسار *</Text>
      <FormSelect
        value={specialTrack}
        onChange={setSpecialTrack}
        options={tracks.map((t) => ({ value: t._id, label: t.title }))}
        placeholder="اختر المسار"
        title="المسار"
      />

      <Text style={s.label}>الأيام *</Text>
      <FormInput placeholder="الأحد، الثلاثاء، الخميس" value={days} onChangeText={setDays} />

      <Text style={s.label}>الوقت *</Text>
      <FormInput placeholder="بعد صلاة العصر" value={time} onChangeText={setTime} />

      <Text style={s.label}>السعة</Text>
      <FormInput placeholder="20" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} />
    </FormPage>
  );
}
