import { useQuery, useMutation } from '@tanstack/react-query';
import { get, put } from '@/lib/api';
import type { PortalType } from '@/lib/types/portal';

export type MeUser = {
  _id: string;
  name: string;
  email: string;
  role: PortalType;
  profileId?: string;
};

type MeResponse = { success: boolean; user: MeUser };
type ProfileResponse = { success: boolean; user: MeUser };

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => get<MeResponse>('/auth/me').then((r) => r.user),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (name: string) => put<ProfileResponse>('/auth/profile', { name }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      put<{ success: boolean; message: string }>('/auth/change-password', body),
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (token: string) => put<{ success: boolean }>('/auth/push-token', { token }),
  });
}
