"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import { getToken, homeForRole, SESSION_COOKIE } from "@/lib/session";
import { sendMail } from "@/lib/mailer";
import { saveImage } from "@/lib/upload";
import type { Community, Event, Registration, SessionUser } from "@/lib/types";

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function nullableText(fd: FormData, key: string): string | null {
  const v = text(fd, key);
  return v === "" ? null : v;
}

function integer(fd: FormData, key: string): number | null {
  const v = text(fd, key);
  if (v === "") return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  if (v instanceof File && v.size > 0) return v;
  return null;
}

function safeBack(value: string, fallback: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function withMsg(path: string, key: "ok" | "err", msg: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(msg)}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan";
}

function jakartaISO(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function tokenOrRedirect(back: string): Promise<string> {
  const token = await getToken();
  if (!token) redirect(`/login?next=${encodeURIComponent(back)}`);
  return token;
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}

export async function devLoginAction(fd: FormData): Promise<void> {
  const email = text(fd, "email");
  let target = "/me";
  try {
    const session = await apiFetch<{ token: string; user: SessionUser }>("/api/v1/dev/login", {
      method: "POST",
      internal: true,
      body: { email },
    });
    const store = await cookies();
    store.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
    target = homeForRole(session.user.role);
  } catch (err) {
    redirect(withMsg("/login", "err", errorMessage(err)));
  }
  redirect(target);
}

export async function registerForEventAction(fd: FormData): Promise<void> {
  const eventId = Number(text(fd, "eventId"));
  const back = safeBack(text(fd, "redirectTo"), `/events/${eventId}`);
  const token = await tokenOrRedirect(back);

  try {
    const res = await apiFetch<{ registration: Registration }>(`/api/v1/events/${eventId}/registrations`, {
      method: "POST",
      token,
    });
    try {
      const evRes = await apiFetch<{ event: Event }>(`/api/v1/events/${eventId}`, { token });
      const me = await apiFetch<{ user: SessionUser }>("/api/v1/me", { token });
      await sendMail({
        template: "registration_received",
        to: me.user.email,
        name: me.user.name,
        eventTitle: evRes.event.title,
        communityName: evRes.event.communityName ?? "",
        userId: me.user.id,
      });
    } catch {
      // notification is best-effort
    }
    revalidatePath(back);
    redirect(withMsg(back, "ok", res.registration.status === "pending" ? "Pendaftaran terkirim, menunggu persetujuan panitia." : "Pendaftaran berhasil."));
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
}

export async function cancelRegistrationAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "registrationId"));
  const back = safeBack(text(fd, "redirectTo"), "/me");
  const token = await tokenOrRedirect(back);
  try {
    await apiFetch(`/api/v1/registrations/${id}/cancel`, { method: "POST", token });
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "ok", "Pendaftaran dibatalkan."));
}

export async function organizerUpdateCommunityAction(fd: FormData): Promise<void> {
  const back = "/dashboard/community";
  const token = await tokenOrRedirect(back);
  try {
    const logo = file(fd, "logo");
    const banner = file(fd, "banner");
    const logoKey = logo ? await saveImage(logo, "community", 512) : undefined;
    const bannerKey = banner ? await saveImage(banner, "community", 1600) : undefined;

    const socials: Record<string, string> = {};
    for (const key of ["instagram", "whatsapp", "website"]) {
      const v = text(fd, key);
      if (v) socials[key] = v;
    }

    const body: Record<string, unknown> = {
      name: text(fd, "name"),
      tagline: text(fd, "tagline"),
      description: text(fd, "description"),
      category: text(fd, "category"),
      city: text(fd, "city"),
      socials,
    };
    if (logoKey) body.logoKey = logoKey;
    if (bannerKey) body.bannerKey = bannerKey;
    if (text(fd, "clearLogo") === "1") body.logoKey = "";
    if (text(fd, "clearBanner") === "1") body.bannerKey = "";

    await apiFetch<{ community: Community }>("/api/v1/organizer/community", {
      method: "PATCH",
      token,
      body,
    });
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Profil komunitas tersimpan."));
}

function eventBodyFromForm(fd: FormData, posterKey?: string | null): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: text(fd, "title"),
    description: text(fd, "description"),
    startsAt: jakartaISO(text(fd, "startsAt")),
    endsAt: jakartaISO(text(fd, "endsAt")),
    locationName: text(fd, "locationName"),
    locationUrl: nullableText(fd, "locationUrl"),
    capacity: integer(fd, "capacity"),
    externalUrl: nullableText(fd, "externalUrl"),
    externalLabel: text(fd, "externalLabel") || "Kunjungi Instagram",
  };
  if (posterKey) body.posterKey = posterKey;
  return body;
}

export async function organizerCreateEventAction(fd: FormData): Promise<void> {
  const back = "/dashboard/events/new";
  const token = await tokenOrRedirect(back);
  let createdId = 0;
  try {
    const poster = file(fd, "poster");
    const posterKey = poster ? await saveImage(poster, "event", 1600) : null;
    const res = await apiFetch<{ event: Event }>("/api/v1/organizer/events", {
      method: "POST",
      token,
      body: eventBodyFromForm(fd, posterKey),
    });
    createdId = res.event.id;
    if (text(fd, "publishNow") === "1") {
      await apiFetch(`/api/v1/organizer/events/${createdId}/publish`, { method: "POST", token });
    }
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(`/dashboard/events/${createdId}`, "ok", "Event dibuat."));
}

export async function organizerUpdateEventAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "eventId"));
  const back = `/dashboard/events/${id}`;
  const token = await tokenOrRedirect(back);
  try {
    const poster = file(fd, "poster");
    const posterKey = poster ? await saveImage(poster, "event", 1600) : null;
    const body = eventBodyFromForm(fd, posterKey);
    if (text(fd, "clearPoster") === "1") body.posterKey = "";
    await apiFetch(`/api/v1/organizer/events/${id}`, { method: "PATCH", token, body });
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Event tersimpan."));
}

export async function organizerPublishEventAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "eventId"));
  const back = safeBack(text(fd, "redirectTo"), `/dashboard/events/${id}`);
  const token = await tokenOrRedirect(back);
  try {
    await apiFetch(`/api/v1/organizer/events/${id}/publish`, { method: "POST", token });
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Event diterbitkan."));
}

export async function organizerCancelEventAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "eventId"));
  const back = safeBack(text(fd, "redirectTo"), `/dashboard/events/${id}`);
  const token = await tokenOrRedirect(back);
  try {
    const res = await apiFetch<{
      event: Event;
      cancelledParticipants: { email: string; name: string; eventTitle: string }[];
    }>(`/api/v1/organizer/events/${id}/cancel`, { method: "POST", token });

    for (const p of res.cancelledParticipants ?? []) {
      await sendMail({
        template: "event_cancelled",
        to: p.email,
        name: p.name,
        eventTitle: p.eventTitle,
        communityName: res.event.communityName ?? "",
      });
    }
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Event dibatalkan dan peserta diberi tahu."));
}

async function decideRegistration(fd: FormData, decision: "approve" | "reject"): Promise<void> {
  const id = Number(text(fd, "registrationId"));
  const back = safeBack(text(fd, "redirectTo"), "/dashboard");
  const token = await tokenOrRedirect(back);
  try {
    const res = await apiFetch<{ registration: Registration }>(`/api/v1/registrations/${id}/${decision}`, {
      method: "POST",
      token,
    });
    const reg = res.registration;
    await sendMail({
      template: decision === "approve" ? "registration_approved" : "registration_rejected",
      to: reg.userEmail,
      name: reg.userName,
      eventTitle: reg.eventTitle,
      communityName: reg.communityName,
      userId: reg.userId,
    });
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "ok", decision === "approve" ? "Peserta disetujui." : "Peserta ditolak."));
}

export async function approveRegistrationAction(fd: FormData): Promise<void> {
  await decideRegistration(fd, "approve");
}

export async function rejectRegistrationAction(fd: FormData): Promise<void> {
  await decideRegistration(fd, "reject");
}

export async function adminCreateCommunityAction(fd: FormData): Promise<void> {
  const back = "/admin/communities/new";
  const token = await tokenOrRedirect(back);
  let createdId = 0;
  try {
    const logo = file(fd, "logo");
    const banner = file(fd, "banner");
    const logoKey = logo ? await saveImage(logo, "community", 512) : null;
    const bannerKey = banner ? await saveImage(banner, "community", 1600) : null;
    const socials: Record<string, string> = {};
    for (const key of ["instagram", "whatsapp", "website"]) {
      const v = text(fd, key);
      if (v) socials[key] = v;
    }
    const res = await apiFetch<{ community: Community }>("/api/v1/admin/communities", {
      method: "POST",
      token,
      body: {
        slug: text(fd, "slug"),
        name: text(fd, "name"),
        tagline: text(fd, "tagline"),
        description: text(fd, "description"),
        category: text(fd, "category"),
        city: text(fd, "city"),
        socials,
        logoKey,
        bannerKey,
        status: "published",
      },
    });
    createdId = res.community.id;
    const organizerEmail = text(fd, "organizerEmail");
    if (organizerEmail) {
      await apiFetch(`/api/v1/admin/communities/${createdId}`, {
        method: "PATCH",
        token,
        body: { organizerEmail },
      });
    }
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(`/admin/communities/${createdId}`, "ok", "Komunitas dibuat."));
}

export async function adminUpdateCommunityAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "communityId"));
  const back = `/admin/communities/${id}`;
  const token = await tokenOrRedirect(back);
  try {
    const organizerEmail = text(fd, "organizerEmail");
    const body: Record<string, unknown> = {
      name: text(fd, "name"),
      tagline: text(fd, "tagline"),
      description: text(fd, "description"),
      category: text(fd, "category"),
      city: text(fd, "city"),
      status: text(fd, "status"),
    };
    if (organizerEmail) body.organizerEmail = organizerEmail;
    await apiFetch(`/api/v1/admin/communities/${id}`, { method: "PATCH", token, body });
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Komunitas diperbarui."));
}
