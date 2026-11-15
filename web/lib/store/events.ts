import { getPool, withTx } from "../db";
import type { Event } from "../types";
import { StoreError, asISO, asNumber } from "./errors";

const EVENT_COLS = `e.id, e.community_id, e.title, e.description, e.starts_at, e.ends_at,
  e.location_name, e.location_url, e.capacity, e.poster_key, e.external_url, e.external_label,
  e.status, e.price, e.currency, e.created_at,
  (SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved')`;

type EventRow = {
  id: string | number;
  community_id: string | number;
  title: string;
  description: string;
  starts_at: Date | string;
  ends_at: Date | string | null;
  location_name: string;
  location_url: string | null;
  capacity: string | number | null;
  poster_key: string | null;
  external_url: string | null;
  external_label: string;
  status: string;
  price: string | number;
  currency: string;
  created_at: Date | string;
  approved_count: string | number;
  community_slug?: string;
  community_name?: string;
};

function toEvent(row: EventRow, withCommunity: boolean): Event {
  return {
    id: asNumber(row.id),
    communityId: asNumber(row.community_id),
    ...(withCommunity
      ? { communitySlug: row.community_slug as string, communityName: row.community_name as string }
      : {}),
    title: row.title,
    description: row.description,
    startsAt: asISO(row.starts_at),
    endsAt: row.ends_at === null ? null : asISO(row.ends_at),
    locationName: row.location_name,
    locationUrl: row.location_url,
    capacity: row.capacity === null ? null : asNumber(row.capacity),
    posterKey: row.poster_key,
    externalUrl: row.external_url,
    externalLabel: row.external_label,
    status: row.status,
    price: asNumber(row.price),
    currency: row.currency,
    createdAt: asISO(row.created_at),
    approvedCount: asNumber(row.approved_count),
  };
}

export async function listPublicEventsByCommunity(communityId: number): Promise<Event[]> {
  const res = await getPool().query<EventRow>(
    `SELECT ${EVENT_COLS} FROM events e
     WHERE e.community_id = $1 AND e.status = 'published' AND e.starts_at >= now()
     ORDER BY e.starts_at ASC`,
    [communityId],
  );
  return res.rows.map((row) => toEvent(row, false));
}

export async function listPublishedEvents(limit: number): Promise<Event[]> {
  const safeLimit = !limit || limit < 1 || limit > 50 ? 6 : Math.floor(limit);
  const res = await getPool().query<EventRow>(
    `SELECT ${EVENT_COLS}, c.slug AS community_slug, c.name AS community_name
     FROM events e JOIN communities c ON c.id = e.community_id
     WHERE e.status = 'published' AND c.status = 'published' AND e.starts_at >= now()
     ORDER BY e.starts_at ASC LIMIT $1`,
    [safeLimit],
  );
  return res.rows.map((row) => toEvent(row, true));
}

export async function listPublishedEventsPage(
  page: number,
  perPage: number,
): Promise<{ items: Event[]; total: number; page: number; perPage: number }> {
  const safePage = !page || page < 1 ? 1 : Math.floor(page);
  const safePerPage = !perPage || perPage < 1 || perPage > 50 ? 12 : Math.floor(perPage);
  const totalRes = await getPool().query(
    `SELECT count(*) AS total
     FROM events e JOIN communities c ON c.id = e.community_id
     WHERE e.status = 'published' AND c.status = 'published' AND e.starts_at >= now()`,
  );
  const res = await getPool().query<EventRow>(
    `SELECT ${EVENT_COLS}, c.slug AS community_slug, c.name AS community_name
     FROM events e JOIN communities c ON c.id = e.community_id
     WHERE e.status = 'published' AND c.status = 'published' AND e.starts_at >= now()
     ORDER BY e.starts_at ASC LIMIT $1 OFFSET $2`,
    [safePerPage, (safePage - 1) * safePerPage],
  );
  return {
    items: res.rows.map((row) => toEvent(row, true)),
    total: parseInt(totalRes.rows[0].total as string, 10),
    page: safePage,
    perPage: safePerPage,
  };
}

export async function getEventPublic(id: number): Promise<Event> {
  const res = await getPool().query<EventRow>(
    `SELECT ${EVENT_COLS}, c.slug AS community_slug, c.name AS community_name
     FROM events e JOIN communities c ON c.id = e.community_id
     WHERE e.id = $1 AND e.status = 'published' AND c.status = 'published'`,
    [id],
  );
  if (res.rowCount === 0) throw new StoreError("not_found", "not found");
  return toEvent(res.rows[0], true);
}

export async function getEvent(id: number): Promise<Event> {
  const res = await getPool().query<EventRow>(
    `SELECT ${EVENT_COLS}, c.slug AS community_slug, c.name AS community_name
     FROM events e JOIN communities c ON c.id = e.community_id
     WHERE e.id = $1`,
    [id],
  );
  if (res.rowCount === 0) throw new StoreError("not_found", "not found");
  return toEvent(res.rows[0], true);
}

export async function listEventsByCommunity(communityId: number): Promise<Event[]> {
  const res = await getPool().query<EventRow>(
    `SELECT ${EVENT_COLS} FROM events e
     WHERE e.community_id = $1
     ORDER BY e.starts_at DESC`,
    [communityId],
  );
  return res.rows.map((row) => toEvent(row, false));
}

export type EventInput = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string;
  locationUrl: string | null;
  capacity: number | null;
  posterKey: string | null;
  externalUrl: string | null;
  externalLabel: string;
};

export async function createEvent(
  communityId: number,
  createdBy: number,
  input: EventInput,
): Promise<Event> {
  const res = await getPool().query<EventRow>(
    `INSERT INTO events AS e (community_id, title, description, starts_at, ends_at, location_name,
       location_url, capacity, poster_key, external_url, external_label, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${EVENT_COLS}`,
    [
      communityId,
      input.title,
      input.description,
      input.startsAt,
      input.endsAt,
      input.locationName,
      input.locationUrl,
      input.capacity,
      input.posterKey,
      input.externalUrl,
      input.externalLabel || "Kunjungi Instagram",
      createdBy,
    ],
  );
  return toEvent(res.rows[0], false);
}

export type EventPatch = {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string | null;
  locationName?: string;
  locationUrl?: string | null;
  capacity?: number | null;
  posterKey?: string | null;
  externalUrl?: string | null;
  externalLabel?: string;
};

export async function updateEvent(id: number, patch: EventPatch): Promise<Event> {
  return withTx(async (client) => {
    const locked = await client.query(`SELECT capacity FROM events WHERE id = $1 FOR UPDATE`, [id]);
    if (locked.rowCount === 0) {
      throw new StoreError("not_found", "not found");
    }

    if (patch.capacity != null) {
      const approvedRes = await client.query(
        `SELECT count(*) AS approved FROM registrations WHERE event_id = $1 AND status = 'approved'`,
        [id],
      );
      const approved = parseInt(approvedRes.rows[0].approved as string, 10);
      if (patch.capacity < approved) {
        throw new StoreError(
          "capacity_below",
          `capacity below approved: saat ini ${approved} peserta sudah approved`,
        );
      }
    }

    const sets: string[] = [];
    const args: unknown[] = [id];
    const add = (col: string, value: unknown) => {
      args.push(value);
      sets.push(`${col} = $${args.length}`);
    };

    if (patch.title != null) add("title", patch.title);
    if (patch.description != null) add("description", patch.description);
    if (patch.startsAt != null) add("starts_at", patch.startsAt);
    if (patch.endsAt != null) add("ends_at", patch.endsAt);
    if (patch.locationName != null) add("location_name", patch.locationName);
    if (patch.locationUrl != null) add("location_url", patch.locationUrl === "" ? null : patch.locationUrl);
    if (patch.capacity != null) add("capacity", patch.capacity);
    if (patch.posterKey != null) add("poster_key", patch.posterKey === "" ? null : patch.posterKey);
    if (patch.externalUrl != null)
      add("external_url", patch.externalUrl === "" ? null : patch.externalUrl);
    if (patch.externalLabel != null) add("external_label", patch.externalLabel);

    if (sets.length === 0) {
      const current = await client.query<EventRow>(
        `SELECT ${EVENT_COLS} FROM events e WHERE e.id = $1`,
        [id],
      );
      if (current.rowCount === 0) throw new StoreError("not_found", "not found");
      return toEvent(current.rows[0], false);
    }

    const res = await client.query<EventRow>(
      `UPDATE events AS e SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING ${EVENT_COLS}`,
      args,
    );
    return toEvent(res.rows[0], false);
  });
}

export async function setEventStatus(id: number, status: string): Promise<Event> {
  const res = await getPool().query<EventRow>(
    `UPDATE events AS e SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${EVENT_COLS}`,
    [id, status],
  );
  if (res.rowCount === 0) throw new StoreError("not_found", "not found");
  return toEvent(res.rows[0], false);
}

export async function countApproved(eventId: number): Promise<number> {
  const res = await getPool().query(
    `SELECT count(*) AS approved FROM registrations WHERE event_id = $1 AND status = 'approved'`,
    [eventId],
  );
  return parseInt(res.rows[0].approved as string, 10);
}
