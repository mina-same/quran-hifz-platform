import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PortalType, PortalUser, NavGroup } from '@/lib/types/portal';
import { PORTALS } from '@/lib/constants/portals';

interface TopbarState {
  icon: string;
  title: string;
  actionsKey: string;
}

interface PortalStore {
  portal: PortalType | null;
  user: PortalUser | null;
  navGroups: NavGroup[];
  topbar: TopbarState;
  enter: (portal: PortalType) => void;
  logout: () => void;
  setTopbar: (icon: string, title: string, actionsKey?: string) => void;
}

export const usePortalStore = create<PortalStore>()(
  persist(
    (set) => ({
      portal: null,
      user: null,
      navGroups: [],
      topbar: { icon: 'home', title: 'لوحة التحكم', actionsKey: '' },

      enter: (portal) => {
        const cfg = PORTALS[portal];
        set({ portal, user: cfg.user, navGroups: cfg.nav });
      },

      logout: () => set({ portal: null, user: null, navGroups: [] }),

      setTopbar: (icon, title, actionsKey = '') =>
        set({ topbar: { icon, title, actionsKey } }),
    }),
    {
      name: 'portal-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        portal: state.portal,
        user: state.user,
        navGroups: state.navGroups,
      }),
    }
  )
);
