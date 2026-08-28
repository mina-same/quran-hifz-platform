import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PortalType, PortalUser, NavGroup } from '@/lib/types/portal';
import type { ThemeMode } from '@/lib/theme';
import { PORTALS } from '@/lib/constants/portals';
import { get as apiGet, post as apiPost, setUnauthorizedHandler } from '@/lib/api';
import { getToken, setToken, clearToken } from '@/lib/auth-storage';
import { setHapticsEnabled as applyHapticsEnabled } from '@/lib/haptics';

const THEME_MODE_KEY = 'qh_theme_mode';
const ONBOARDED_KEY = 'qh_onboarded';
const BIOMETRIC_ENABLED_KEY = 'qh_biometric_enabled';
const HAPTICS_ENABLED_KEY = 'qh_haptics_enabled';

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
  /** Whether the user opted into Face ID/Touch ID re-auth (Account Settings). Persisted. */
  biometricEnabled: boolean;
  /** Whether presses vibrate (Account Settings). Persisted, default on. */
  hapticsEnabled: boolean;
  /** False until the onboarding slides have been seen once. Persisted. */
  hasOnboarded: boolean;
  /** Set when a request came back 401 and the session was dropped — the login
   * screen shows a "session ended" notice instead of silently reappearing. */
  sessionExpired: boolean;
  /** True right after a token-based (re)hydrate when biometricEnabled is on — gates the
   * app behind a lock screen until unlock() succeeds, even though authUser is already set. */
  isLocked: boolean;

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
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  unlock: () => void;
  /** Drops the session after a 401. Token is already cleared by the API layer. */
  handleUnauthorized: () => void;
  clearSessionExpired: () => void;
}

export const usePortalStore = create<PortalStore>()((set, get) => ({
  authUser: null,
  isHydrating: true,
  selectedChildId: null,
  themeMode: 'light',
  biometricEnabled: false,
  hapticsEnabled: true,
  hasOnboarded: false,
  sessionExpired: false,
  isLocked: false,
  portal: null,
  user: null,
  navGroups: [],
  topbar: { icon: 'home', title: 'لوحة التحكم', actionsKey: '' },

  hydrate: async () => {
    const [token, storedMode, storedBiometric, storedOnboarded, storedHaptics] = await Promise.all([
      getToken().catch(() => null),
      AsyncStorage.getItem(THEME_MODE_KEY).catch(() => null),
      AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY).catch(() => null),
      AsyncStorage.getItem(ONBOARDED_KEY).catch(() => null),
      AsyncStorage.getItem(HAPTICS_ENABLED_KEY).catch(() => null),
    ]);
    const themeMode: ThemeMode = storedMode === 'dark' ? 'dark' : 'light';
    const biometricEnabled = storedBiometric === '1';
    const hasOnboarded = storedOnboarded === '1';
    // Opt-out, not opt-in: only an explicit '0' turns haptics off.
    const hapticsEnabled = storedHaptics !== '0';
    applyHapticsEnabled(hapticsEnabled);

    if (!token) {
      set({ isHydrating: false, themeMode, biometricEnabled, hapticsEnabled, hasOnboarded });
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
      // A stored session resuming silently is exactly what biometric lock guards against —
      // gate behind isLocked so the lock screen must clear before any portal screen renders.
      set({
        authUser, isHydrating: false, themeMode, biometricEnabled, hapticsEnabled, hasOnboarded,
        isLocked: biometricEnabled,
        ...enterPortal(authUser.role, authUser),
      });
    } catch {
      await clearToken();
      set({ authUser: null, isHydrating: false, themeMode, biometricEnabled, hapticsEnabled, hasOnboarded });
    }
  },

  login: async (email, password) => {
    set({ sessionExpired: false });
    const res = await apiPost<LoginResponse>('/auth/login', { email, password });
    const authUser: AuthUser = {
      id: res.user.id,
      name: res.user.name,
      role: res.user.role,
      profileId: res.user.profileId,
    };
    await setToken(res.token).catch(() => {});
    // A fresh password login already proves identity — no extra lock screen needed.
    set({ authUser, isLocked: false, ...enterPortal(authUser.role, authUser) });
  },

  logout: async () => {
    await clearToken();
    set({ authUser: null, portal: null, user: null, navGroups: [], selectedChildId: null, isLocked: false });
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
    set({ hasOnboarded: true });
  },

  setBiometricEnabled: async (enabled) => {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? '1' : '0').catch(() => {});
    set({ biometricEnabled: enabled });
  },

  setHapticsEnabled: async (enabled) => {
    // Apply before persisting so the toggle's own feedback matches the new state.
    applyHapticsEnabled(enabled);
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, enabled ? '1' : '0').catch(() => {});
    set({ hapticsEnabled: enabled });
  },

  unlock: () => set({ isLocked: false }),

  handleUnauthorized: () => {
    if (!get().authUser) return; // already signed out — nothing to drop
    set({
      authUser: null, portal: null, user: null, navGroups: [],
      selectedChildId: null, isLocked: false, sessionExpired: true,
    });
  },

  clearSessionExpired: () => set({ sessionExpired: false }),

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

// The API layer signals a dead token; the store owns what that means.
setUnauthorizedHandler(() => usePortalStore.getState().handleUnauthorized());
