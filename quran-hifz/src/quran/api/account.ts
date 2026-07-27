import { useQuery, useMutation } from "@tanstack/react-query";
import { get, put } from "../../lib/api";

export type MeUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student" | "parent";
  profileId?: string;
};

type MeResponse = { success: boolean; user: MeUser };
type ProfileResponse = { success: boolean; user: MeUser };

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => get<MeResponse>("/auth/me").then((r) => r.user),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (name: string) => put<ProfileResponse>("/auth/profile", { name }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      put<{ success: boolean; message: string }>("/auth/change-password", body),
  });
}
