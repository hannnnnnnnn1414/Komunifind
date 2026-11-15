"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { issueToken } from "@/lib/auth";
import { getSessionUser, homeForRole, SESSION_COOKIE } from "@/lib/session";
import { sendMail } from "@/lib/mailer";
import { storeErrorToMessage } from "@/lib/store/errors";
import { getCommunityByOrganizer, updateCommunity, createCommunity, assignOrganizer } from "@/lib/store/communities";
import {
  createEvent,
  getEventPublic,
  getEvent,
  updateEvent,
  setEventStatus,
} from "@/lib/store/events";
import {
  cancelRegistrationsForEvent,
  approveRegistration,
  rejectRegistration,
  createRegistration,
  cancelRegistration,
} from "@/lib/store/registrations";
import type { EventInput } from "@/lib/store/events";
import { upsertGoogleUser } from "@/lib/store/users";
import { saveImage } from "@/lib/storage";
import type { Role, SessionUser } from "@/lib/types";

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
  return storeErrorToMessage(err);
}

function jakartaISO(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function requireActionUser(back: string, roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  if (roles && !roles.includes(user.role) && user.role !== "admin") {
    redirect(homeForRole(user.role));
  }
  return user;
}

async function requireOrganizerEvent(userId: number, eventId: number): Promise<void> {
  const community = await getCommunityByOrganizer(userId);
  const event = await getEvent(eventId);
  if (event.communityId !== community.id) {
    throw new Error("Event bukan milik komunitasmu");
  }
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}

export async function devLoginAction(fd: FormData): Promise<void> {
  const rawEmail = text(fd, "email");
  const email = rawEmail.trim().toLowerCase();
  let target = "/me";
  try {
    if (process.env.DEV_LOGIN !== "true") {
      throw new Error("Dev login tidak aktif");
    }
    if (!email.includes("@")) {
      throw new Error("Email tidak valid");
    }
    const name = email.split("@")[0];
    const user = await upsertGoogleUser(`dev:${email}`, email, name, "");
    const token = await issueToken(user.id, user.role, user.communityId);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
    target = homeForRole(user.role);
  } catch (err) {
    redirect(withMsg("/login", "err", errorMessage(err)));
  }
  redirect(target);
}

export async function registerForEventAction(fd: FormData): Promise<void> {
  const eventId = Number(text(fd, "eventId"));
  const back = safeBack(text(fd, "redirectTo"), `/events/${eventId}`);
  const user = await requireActionUser(back);

  let registeredStatus = "pending";
  try {
    const reg = await createRegistration(eventId, user.id);
    registeredStatus = reg.status;
    try {
      const event = await getEventPublic(eventId);
      await sendMail({
        template: "registration_received",
        to: user.email,
        name: user.name,
        eventTitle: event.title,
        communityName: event.communityName ?? "",
        userId: user.id,
      });
    } catch {
    }
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "ok", registeredStatus === "pending" ? "Pendaftaran terkirim, menunggu persetujuan panitia." : "Pendaftaran berhasil."));
}

export async function cancelRegistrationAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "registrationId"));
  const back = safeBack(text(fd, "redirectTo"), "/me");
  const user = await requireActionUser(back);
  try {
    await cancelRegistration(id, user.id);
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath(back);
  redirect(withMsg(back, "ok", "Pendaftaran dibatalkan."));
}

export async function organizerUpdateCommunityAction(fd: FormData): Promise<void> {
  const back = "/dashboard/community";
  const user = await requireActionUser(back, ["organizer"]);
  try {
    const community = await getCommunityByOrganizer(user.id);
    const logo = file(fd, "logo");
    const banner = file(fd, "banner");
    const logoKey = logo ? await saveImage(logo, "community", 512) : undefined;
    const bannerKey = banner ? await saveImage(banner, "community", 1600) : undefined;

    const socials: Record<string, string> = {};
    for (const key of ["instagram", "whatsapp", "website"]) {
      const v = text(fd, key);
      if (v) socials[key] = v;
    }

    await updateCommunity(community.id, {
      name: text(fd, "name"),
      tagline: text(fd, "tagline"),
      description: text(fd, "description"),
      category: text(fd, "category"),
      city: text(fd, "city"),
      socials,
      ...(logoKey ? { logoKey } : {}),
      ...(bannerKey ? { bannerKey } : {}),
      ...(text(fd, "clearLogo") === "1" ? { logoKey: "" } : {}),
      ...(text(fd, "clearBanner") === "1" ? { bannerKey: "" } : {}),
    });
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Profil komunitas tersimpan."));
}

function eventInputFromForm(fd: FormData, posterKey?: string | null): EventInput {
  const input: EventInput = {
    title: text(fd, "title"),
    description: text(fd, "description"),
    startsAt: jakartaISO(text(fd, "startsAt")) ?? "",
    endsAt: jakartaISO(text(fd, "endsAt")),
    locationName: text(fd, "locationName"),
    locationUrl: nullableText(fd, "locationUrl"),
    capacity: integer(fd, "capacity"),
    posterKey: posterKey ?? null,
    externalUrl: nullableText(fd, "externalUrl"),
    externalLabel: text(fd, "externalLabel") || "Kunjungi Instagram",
  };
  return input;
}

export async function organizerCreateEventAction(fd: FormData): Promise<void> {
  const back = "/dashboard/events/new";
  const user = await requireActionUser(back, ["organizer"]);
  let createdId = 0;
  try {
    const community = await getCommunityByOrganizer(user.id);
    const poster = file(fd, "poster");
    const posterKey = poster ? await saveImage(poster, "event", 1600) : null;
    const created = await createEvent(community.id, user.id, eventInputFromForm(fd, posterKey));
    createdId = created.id;
    if (text(fd, "publishNow") === "1") {
      await setEventStatus(createdId, "published");
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
  const user = await requireActionUser(back, ["organizer"]);
  try {
    await requireOrganizerEvent(user.id, id);
    const poster = file(fd, "poster");
    const posterKey = poster ? await saveImage(poster, "event", 1600) : null;
    const patch = eventInputFromForm(fd, posterKey);
    if (text(fd, "clearPoster") === "1") patch.posterKey = "";
    await updateEvent(id, patch);
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Event tersimpan."));
}

export async function organizerPublishEventAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "eventId"));
  const back = safeBack(text(fd, "redirectTo"), `/dashboard/events/${id}`);
  const user = await requireActionUser(back, ["organizer"]);
  try {
    await requireOrganizerEvent(user.id, id);
    await setEventStatus(id, "published");
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Event diterbitkan."));
}

export async function organizerCancelEventAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "eventId"));
  const back = safeBack(text(fd, "redirectTo"), `/dashboard/events/${id}`);
  const user = await requireActionUser(back, ["organizer"]);
  try {
    await requireOrganizerEvent(user.id, id);
    const participants = await cancelRegistrationsForEvent(id);
    const event = await setEventStatus(id, "cancelled");

    for (const p of participants ?? []) {
      await sendMail({
        template: "event_cancelled",
        to: p.email,
        name: p.name,
        eventTitle: p.eventTitle,
        communityName: event.communityName ?? "",
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
  const user = await requireActionUser(back, ["organizer"]);
  try {
    const reg =
      decision === "approve"
        ? await approveRegistration(id, user.id)
        : await rejectRegistration(id, user.id);
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
  await requireActionUser(back, ["admin"]);
  let createdId = 0;
  try {
    const name = text(fd, "name");
    if (!name) {
      throw new Error("Nama komunitas wajib diisi");
    }
    const rawSlug = text(fd, "slug");
    const slug = normalizeSlug(rawSlug || name);
    if (!slug) {
      throw new Error("Slug tidak valid");
    }
    const logo = file(fd, "logo");
    const banner = file(fd, "banner");
    const logoKey = logo ? await saveImage(logo, "community", 512) : null;
    const bannerKey = banner ? await saveImage(banner, "community", 1600) : null;
    const socials: Record<string, string> = {};
    for (const key of ["instagram", "whatsapp", "website"]) {
      const v = text(fd, key);
      if (v) socials[key] = v;
    }
    const created = await createCommunity({
      slug,
      name,
      tagline: text(fd, "tagline"),
      description: text(fd, "description"),
      category: text(fd, "category"),
      city: text(fd, "city"),
      socials,
      logoKey,
      bannerKey,
      status: "published",
    });
    createdId = created.id;
    const organizerEmail = text(fd, "organizerEmail");
    if (organizerEmail) {
      await assignOrganizer(createdId, organizerEmail);
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
  await requireActionUser(back, ["admin"]);
  try {
    const organizerEmail = text(fd, "organizerEmail");
    await updateCommunity(id, {
      name: text(fd, "name"),
      tagline: text(fd, "tagline"),
      description: text(fd, "description"),
      category: text(fd, "category"),
      city: text(fd, "city"),
      status: text(fd, "status"),
    });
    if (organizerEmail) {
      await assignOrganizer(id, organizerEmail);
    }
  } catch (err) {
    redirect(withMsg(back, "err", errorMessage(err)));
  }
  revalidatePath("/", "layout");
  redirect(withMsg(back, "ok", "Komunitas diperbarui."));
}
