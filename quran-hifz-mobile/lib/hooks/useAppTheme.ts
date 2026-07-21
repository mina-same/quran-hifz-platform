import { useMemo } from 'react';
import { usePortalStore } from '@/lib/store/portalStore';
import { buildTheme } from '@/lib/theme';

export function useAppTheme() {
  const mode = usePortalStore((s) => s.themeMode);
  return useMemo(() => ({ ...buildTheme(mode), mode }), [mode]);
}
