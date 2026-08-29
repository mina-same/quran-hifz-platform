import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Text from '@/components/ui/Text';
import FormPage, { useFormPageStyles } from '@/components/ui/FormPage';
import FormInput from '@/components/forms/FormInput';
import { useMasajid, useCreateMasjid, useUpdateMasjid } from '@/lib/queries/masajid';

export default function AdminMasjidForm() {
  const router = useRouter();
  const s = useFormPageStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: masajid = [] } = useMasajid();
  const createMasjid = useCreateMasjid();
  const updateMasjid = useUpdateMasjid();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  // The list query is already cached, so editing needs no extra fetch — but it
  // may resolve after this screen mounts, hence the effect rather than initial state.
  const existing = id ? masajid.find((m) => m._id === id) : undefined;
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setLocation(existing.location);
  }, [existing?._id]);

  async function handleSubmit() {
    if (!name.trim() || !location.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    try {
      setError('');
      const body = { name: name.trim(), location: location.trim() };
      if (id) await updateMasjid.mutateAsync({ id, ...body });
      else await createMasjid.mutateAsync(body);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <FormPage
      title={id ? 'تعديل بيانات المسجد' : 'إضافة مسجد جديد'}
      error={error}
      pending={createMasjid.isPending || updateMasjid.isPending}
      onSubmit={handleSubmit}
    >
      <Text style={s.label}>اسم المسجد *</Text>
      <FormInput placeholder="مسجد النور" value={name} onChangeText={setName} />

      <Text style={s.label}>الموقع *</Text>
      <FormInput placeholder="حي السلام، الرياض" value={location} onChangeText={setLocation} />
    </FormPage>
  );
}
