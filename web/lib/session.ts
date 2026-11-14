import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { apiFetch } from "./api";
import type { Role, SessionUser } from "./types";

export const SESSION_COOKIE = "kf_session";

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await apiFetch<{ user: SessionUser }>("/api/v1/me", { token });
    return res.user;
  } catch {
    return null;
  }
});

export function homeForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "organizer") return "/dashboard";
  return "/me";
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role) && user.role !== "admin") {
    redirect(homeForRole(user.role));
  }
  return user;
}
