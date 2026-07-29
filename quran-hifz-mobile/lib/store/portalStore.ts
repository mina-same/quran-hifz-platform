import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PortalType, PortalUser, NavGroup } from '@/lib/types/portal';
import type { ThemeMode } from '@/lib/theme';
import { PORTALS } from '@/lib/constants/portals';
import { get as apiGet, post as apiPost } from '@/lib/api';
import { getToken, setToken, clearToken } from '@/lib/auth-storage';

const THEME_MODE_KEY = 'qh_theme_mode';
const ONBOARDED_KEY = 'qh_onboarded';

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
  themeMode: ThemeMode;

  portal: PortalType | null;
  user: PortalUser | null;
  navGroups: NavGroup[];
  topbar: TopbarState;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedChild: (id: string) => void;
  setTopbar: (icon: string, title: string, actionsKey?: string) => void;
  toggleTheme: () => void;
  completeOnboarding: () => Promise<void>;
  updateUserName: (name: string) => void;
}

export const usePortalStore = create<PortalStore>()((set, get) => ({
  authUser: null,
  isHydrating: true,
  selectedChildId: null,
  themeMode: 'light',
  portal: null,
  user: null,
  navGroups: [],
  topbar: { icon: 'home', title: 'لوحة التحكم', actionsKey: '' },

  hydrate: async () => {
    const [token, storedMode] = await Promise.all([
      getToken().catch(() => null),
      AsyncStorage.getItem(THEME_MODE_KEY).catch(() => null),
    ]);
    const themeMode: ThemeMode = storedMode === 'dark' ? 'dark' : 'light';

    if (!token) {
      set({ isHydrating: false, themeMode });
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
      set({ authUser, isHydrating: false, themeMode, ...enterPortal(authUser.role, authUser) });
    } catch {
      await clearToken();
      set({ authUser: null, isHydrating: false, themeMode });
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
    await setToken(res.token).catch(() => {});
    set({ authUser, ...enterPortal(authUser.role, authUser) });
  },

  logout: async () => {
    await clearToken();
    set({ authUser: null, portal: null, user: null, navGroups: [], selectedChildId: null });
  },

  setSelectedChild: (id) => set({ selectedChildId: id }),

  setTopbar: (icon, title, actionsKey = '') => set({ topbar: { icon, title, actionsKey } }),

  toggleTheme: () => {
    const next: ThemeMode = get().themeMode === 'dark' ? 'light' : 'dark';
    AsyncStorage.setItem(THEME_MODE_KEY, next).catch(() => {});
    set({ themeMode: next });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
  },

  // Keeps the drawer/more-sheet display name in sync right after an
  // account-settings name edit, without a full re-login or /auth/me refetch.
  updateUserName: (name) => {
    const { authUser, user } = get();
    set({
      authUser: authUser ? { ...authUser, name } : authUser,
      user: user ? { ...user, name, initials: initialsOf(name) } : user,
    });
  },
}));
