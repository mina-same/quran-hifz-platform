import { create } from 'zustand';
import type { PortalType, PortalUser, NavGroup } from '@/lib/types/portal';
import { PORTALS } from '@/lib/constants/portals';
import { get as apiGet, post as apiPost } from '@/lib/api';
import { getToken, setToken, clearToken } from '@/lib/auth-storage';

interface TopbarState {
  icon: string;
  title: string;
  actionsKey: string;
}

export interface AuthUser {
  id: string;
  name: string;
  role: PortalType;
  profileId?: string;
}

const ROLE_LABELS: Record<PortalType, string> = {
  student: 'طالب',
  teacher: 'معلم',
  admin: 'مدير النظام',
  parent: 'ولي أمر',
};

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');
}

function enterPortal(role: PortalType, authUser: AuthUser) {
  const cfg = PORTALS[role];
  const displayUser: PortalUser = {
    name: authUser.name,
    role: ROLE_LABELS[role],
    initials: initialsOf(authUser.name),
  };
  return { portal: role, user: displayUser, navGroups: cfg.nav };
}

type LoginResponse = {
  success: boolean;
  token: string;
  user: { id: string; name: string; email: string; role: PortalType; profileId?: string };
};

type MeResponse = {
  success: boolean;
  user: { _id: string; name: string; email: string; role: PortalType; profileId?: string };
};

interface PortalStore {
  authUser: AuthUser | null;
  isHydrating: boolean;
  selectedChildId: string | null;

  portal: PortalType | null;
  user: PortalUser | null;
  navGroups: NavGroup[];
  topbar: TopbarState;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedChild: (id: string) => void;
  setTopbar: (icon: string, title: string, actionsKey?: string) => void;
}

export const usePortalStore = create<PortalStore>()((set) => ({
  authUser: null,
  isHydrating: true,
  selectedChildId: null,
  portal: null,
  user: null,
  navGroups: [],
  topbar: { icon: 'home', title: 'لوحة التحكم', actionsKey: '' },

  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ isHydrating: false });
      return;
    }
    try {
      const res = await apiGet<MeResponse>('/auth/me');
      const authUser: AuthUser = {
        id: res.user._id,
        name: res.user.name,
        role: res.user.role,
        profileId: res.user.profileId,
      };
      set({ authUser, isHydrating: false, ...enterPortal(authUser.role, authUser) });
    } catch {
      await clearToken();
      set({ authUser: null, isHydrating: false });
    }
  },

  login: async (email, password) => {
    const res = await apiPost<LoginResponse>('/auth/login', { email, password });
    const authUser: AuthUser = {
      id: res.user.id,
      name: res.user.name,
      role: res.user.role,
      profileId: res.user.profileId,
    };
    await setToken(res.token);
    set({ authUser, ...enterPortal(authUser.role, authUser) });
  },

  logout: async () => {
    await clearToken();
    set({ authUser: null, portal: null, user: null, navGroups: [], selectedChildId: null });
  },

  setSelectedChild: (id) => set({ selectedChildId: id }),

  setTopbar: (icon, title, actionsKey = '') => set({ topbar: { icon, title, actionsKey } }),
}));
