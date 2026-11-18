import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import Alert from '@/components/ui/Alert';
import Pressable from '@/components/ui/Pressable';

/**
 * Mobile counterpart of the web's sonner `toast` — same call shape
 * (`toast.success(msg)`, `toast.loading(msg)` → id, `toast.success(msg, { id })`
 * to replace a loading toast, `toast.dismiss(id)`), so ported code reads the same.
 * Rendered once by <ToastHost/> in app/_layout.tsx. Tap a toast to dismiss it.
 */
type Kind = 'success' | 'error' | 'warning' | 'info' | 'loading';
type Item = { id: string; kind: Kind; message: string };
type Opts = { id?: string; duration?: number };

const useToasts = create<{ items: Item[] }>(() => ({ items: [] }));
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let seq = 0;

function dismiss(id?: string) {
  const drop = (x: string) => { clearTimeout(timers.get(x)); timers.delete(x); };
  if (id === undefined) {
    timers.forEach((_, x) => drop(x));
    useToasts.setState({ items: [] });
    return;
  }
  drop(id);
  useToasts.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));
}

function show(kind: Kind, message: string, opts: Opts = {}): string {
  const id = opts.id ?? `t${++seq}`;
  useToasts.setState((s) => {
    const rest = s.items.filter((i) => i.id !== id);
    return { items: [...rest, { id, kind, message }].slice(-3) };
  });
  clearTimeout(timers.get(id));
  if (kind !== 'loading') timers.set(id, setTimeout(() => dismiss(id), opts.duration ?? 3500));
  return id;
}

export const toast = {
  success: (m: string, o?: Opts) => show('success', m, o),
  error:   (m: string, o?: Opts) => show('error', m, o),
  warning: (m: string, o?: Opts) => show('warning', m, o),
  info:    (m: string, o?: Opts) => show('info', m, o),
  loading: (m: string, o?: Opts) => show('loading', m, o),
  dismiss,
};

export function ToastHost() {
  const items = useToasts((s) => s.items);
  const insets = useSafeAreaInsets();
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      {items.map((t) => (
        <Pressable key={t.id} onPress={() => dismiss(t.id)}>
          <Alert variant={t.kind === 'loading' ? 'info' : t.kind}>{t.message}</Alert>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, gap: 8, zIndex: 1000, elevation: 1000 },
});
