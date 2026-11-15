import { getPool, withTx } from "../db";
import type { Registration } from "../types";
import { StoreError, asISO, asNumber } from "./errors";

const JOIN_COLS = `r.id, r.event_id, r.user_id, r.status, r.decided_at, r.created_at,
  e.title AS event_title, e.starts_at AS event_starts_at,
  c.slug AS community_slug, c.name AS community_name,
  u.name AS user_name, u.email AS user_email`;

const JOIN = `FROM registrations r
  JOIN events e ON e.id = r.event_id
  JOIN communities c ON c.id = e.community_id
  JOIN users u ON u.id = r.user_id`;

type RegistrationRow = {
  id: string | number;
  event_id: string | number;
  user_id: string | number;
  status: Registration["status"];
  decided_at: Date | string | null;
  created_at: Date | string;
  event_title: string;
  event_starts_at: Date | string;
  community_slug: string;
  community_name: string;
  user_name: string;
  user_email: string;
};

function toRegistration(row: RegistrationRow): Registration {
  return {
    id: asNumber(row.id),
    eventId: asNumber(row.event_id),
    userId: asNumber(row.user_id),
    status: row.status,
    decidedAt: row.decided_at === null ? null : asISO(row.decided_at),
    createdAt: asISO(row.created_at),
    eventTitle: row.event_title,
    startsAt: asISO(row.event_starts_at),
    communitySlug: row.community_slug,
    communityName: row.community_name,
    userName: row.user_name,
    userEmail: row.user_email,
  };
}

export async function createRegistration(eventId: number, userId: number): Promise<Registration> {
  const regId = await withTx(async (client) => {
    const eventRes = await client.query(
      `SELECT status, starts_at > now() AS not_started, capacity FROM events WHERE id = $1`,
      [eventId],
    );
    if (eventRes.rowCount === 0) {
      throw new StoreError("not_found", "not found");
    }
    const eventStatus = eventRes.rows[0].status as string;
    const notStarted = eventRes.rows[0].not_started as boolean;
    const capacity = eventRes.rows[0].capacity as string | number | null;

    if (eventStatus !== "published") {
      throw new StoreError("invalid_state", "invalid state");
    }
    if (!notStarted) {
      throw new StoreError("event_started", "event started");
    }

    if (capacity !== null) {
      const approvedRes = await client.query(
        `SELECT count(*) AS approved FROM registrations WHERE event_id = $1 AND status = 'approved'`,
        [eventId],
      );
      const approved = parseInt(approvedRes.rows[0].approved as string, 10);
      if (approved >= asNumber(capacity)) {
        throw new StoreError("quota_full", "quota full");
      }
    }

    const upsert = await client.query(
      `INSERT INTO registrations (event_id, user_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (event_id, user_id) DO UPDATE
       SET status = 'pending', decided_by = NULL, decided_at = NULL, updated_at = now()
       WHERE registrations.status IN ('cancelled', 'rejected')
       RETURNING id`,
      [eventId, userId],
    );
    if (upsert.rowCount === 0) {
      throw new StoreError("conflict", "conflict");
    }
    return asNumber(upsert.rows[0].id as string | number);
  });

  return getRegistration(regId);
}

export async function getRegistration(id: number): Promise<Registration> {
  const res = await getPool().query<RegistrationRow>(
    `SELECT ${JOIN_COLS} ${JOIN} WHERE r.id = $1`,
    [id],
  );
  if (res.rowCount === 0) throw new StoreError("not_found", "not found");
  return toRegistration(res.rows[0]);
}

export async function listRegistrationsByUser(userId: number): Promise<Registration[]> {
  const res = await getPool().query<RegistrationRow>(
    `SELECT ${JOIN_COLS} ${JOIN} WHERE r.user_id = $1 ORDER BY e.starts_at DESC`,
    [userId],
  );
  return res.rows.map(toRegistration);
}

export async function listRegistrationsByEvent(eventId: number): Promise<Registration[]> {
  const res = await getPool().query<RegistrationRow>(
    `SELECT ${JOIN_COLS} ${JOIN}
     WHERE r.event_id = $1
     ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, r.created_at ASC`,
    [eventId],
  );
  return res.rows.map(toRegistration);
}

export async function approveRegistration(regId: number, actorId: number): Promise<Registration> {
  await withTx(async (client) => {
    const eventRes = await client.query(
      `SELECT e.capacity FROM events e
       WHERE e.id = (SELECT event_id FROM registrations WHERE id = $1)
       FOR UPDATE OF e`,
      [regId],
    );
    if (eventRes.rowCount === 0) {
      throw new StoreError("not_found", "not found");
    }
    const capacity = eventRes.rows[0].capacity as string | number | null;

    const regRes = await client.query(
      `SELECT r.event_id, r.status, c.organizer_id
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       JOIN communities c ON c.id = e.community_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [regId],
    );
    if (regRes.rowCount === 0) {
      throw new StoreError("not_found", "not found");
    }
    const eventId = asNumber(regRes.rows[0].event_id as string | number);
    const status = regRes.rows[0].status as string;
    const organizerId = regRes.rows[0].organizer_id as string | number | null;

    if (organizerId === null || asNumber(organizerId) !== actorId) {
      throw new StoreError("forbidden", "forbidden");
    }
    if (status !== "pending") {
      throw new StoreError("invalid_state", "invalid state");
    }

    if (capacity !== null) {
      const approvedRes = await client.query(
        `SELECT count(*) AS approved FROM registrations WHERE event_id = $1 AND status = 'approved'`,
        [eventId],
      );
      const approved = parseInt(approvedRes.rows[0].approved as string, 10);
      if (approved >= asNumber(capacity)) {
        throw new StoreError("quota_full", "quota full");
      }
    }

    await client.query(
      `UPDATE registrations SET status = 'approved', decided_by = $2, decided_at = now(), updated_at = now()
       WHERE id = $1`,
      [regId, actorId],
    );
  });

  return getRegistration(regId);
}

export async function rejectRegistration(regId: number, actorId: number): Promise<Registration> {
  await withTx(async (client) => {
    const regRes = await client.query(
      `SELECT r.status, c.organizer_id
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       JOIN communities c ON c.id = e.community_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [regId],
    );
    if (regRes.rowCount === 0) {
      throw new StoreError("not_found", "not found");
    }
    const status = regRes.rows[0].status as string;
    const organizerId = regRes.rows[0].organizer_id as string | number | null;

    if (organizerId === null || asNumber(organizerId) !== actorId) {
      throw new StoreError("forbidden", "forbidden");
    }
    if (status !== "pending") {
      throw new StoreError("invalid_state", "invalid state");
    }

    await client.query(
      `UPDATE registrations SET status = 'rejected', decided_by = $2, decided_at = now(), updated_at = now()
       WHERE id = $1`,
      [regId, actorId],
    );
  });

  return getRegistration(regId);
}

export async function cancelRegistration(regId: number, userId: number): Promise<Registration> {
  await withTx(async (client) => {
    const regRes = await client.query(
      `SELECT r.user_id, r.status, e.starts_at > now() AS not_started
       FROM registrations r JOIN events e ON e.id = r.event_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [regId],
    );
    if (regRes.rowCount === 0) {
      throw new StoreError("not_found", "not found");
    }
    const ownerId = asNumber(regRes.rows[0].user_id as string | number);
    const status = regRes.rows[0].status as string;
    const notStarted = regRes.rows[0].not_started as boolean;

    if (ownerId !== userId) {
      throw new StoreError("forbidden", "forbidden");
    }
    if (status !== "pending" && status !== "approved") {
      throw new StoreError("invalid_state", "invalid state");
    }
    if (!notStarted) {
      throw new StoreError("event_started", "event started");
    }

    await client.query(
      `UPDATE registrations SET status = 'cancelled', decided_by = $2, decided_at = now(), updated_at = now()
       WHERE id = $1`,
      [regId, userId],
    );
  });

  return getRegistration(regId);
}

export async function countPendingByOrganizer(
  organizerId: number,
): Promise<{ total: number; perEvent: Map<number, number> }> {
  const res = await getPool().query(
    `SELECT r.event_id, count(*) AS pending
     FROM registrations r
     JOIN events e ON e.id = r.event_id
     JOIN communities c ON c.id = e.community_id
     WHERE c.organizer_id = $1 AND r.status = 'pending'
     GROUP BY r.event_id`,
    [organizerId],
  );
  const perEvent = new Map<number, number>();
  let total = 0;
  for (const row of res.rows) {
    const count = parseInt(row.pending as string, 10);
    perEvent.set(asNumber(row.event_id as string | number), count);
    total += count;
  }
  return { total, perEvent };
}

export type PendingItem = {
  registrationId: number;
  eventId: number;
  eventTitle: string;
  eventStartsAt: string;
  userName: string;
  createdAt: string;
};

export async function listPendingForOrganizer(
  organizerId: number,
  limit: number,
): Promise<PendingItem[]> {
  const safeLimit = !limit || limit < 1 || limit > 50 ? 10 : Math.floor(limit);
  const res = await getPool().query(
    `SELECT r.id AS registration_id, r.event_id, e.title AS event_title,
       e.starts_at AS event_starts_at, u.name AS user_name, r.created_at
     FROM registrations r
     JOIN events e ON e.id = r.event_id
     JOIN communities c ON c.id = e.community_id
     JOIN users u ON u.id = r.user_id
     WHERE c.organizer_id = $1 AND r.status = 'pending'
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [organizerId, safeLimit],
  );
  return res.rows.map((row) => ({
    registrationId: asNumber(row.registration_id as string | number),
    eventId: asNumber(row.event_id as string | number),
    eventTitle: row.event_title as string,
    eventStartsAt: asISO(row.event_starts_at as Date | string),
    userName: row.user_name as string,
    createdAt: asISO(row.created_at as Date | string),
  }));
}

export type CancelledParticipant = {
  userId: number;
  email: string;
  name: string;
  eventId: number;
  eventTitle: string;
};

export async function cancelRegistrationsForEvent(eventId: number): Promise<CancelledParticipant[]> {
  const res = await getPool().query(
    `UPDATE registrations AS r
     SET status = 'cancelled', decided_at = now(), updated_at = now()
     FROM users u, events e
     WHERE r.event_id = $1 AND r.status IN ('pending', 'approved')
       AND u.id = r.user_id AND e.id = r.event_id
     RETURNING r.user_id, u.email, u.name, r.event_id, e.title`,
    [eventId],
  );
  return res.rows.map((row) => ({
    userId: asNumber(row.user_id as string | number),
    email: row.email as string,
    name: row.name as string,
    eventId: asNumber(row.event_id as string | number),
    eventTitle: row.title as string,
  }));
}
