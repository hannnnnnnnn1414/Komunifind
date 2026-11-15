import { getPool } from "../db";
import type { Role, SessionUser, User } from "../types";
import { StoreError, asISO, asNumber } from "./errors";

const USER_COLS = `id, email, name, avatar_url, role, created_at`;

type UserRow = {
  id: string | number;
  email: string;
  name: string;
  avatar_url: string;
  role: Role;
  created_at: Date | string;
};

function toUser(row: UserRow): User {
  return {
    id: asNumber(row.id),
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: asISO(row.created_at),
  };
}

async function communityIdOf(userId: number): Promise<number | null> {
  const res = await getPool().query(`SELECT id FROM communities WHERE organizer_id = $1 LIMIT 1`, [userId]);
  if (res.rowCount === 0) return null;
  return asNumber(res.rows[0].id as string | number);
}

export async function upsertGoogleUser(
  sub: string,
  email: string,
  name: string,
  avatar: string,
): Promise<SessionUser> {
  const res = await getPool().query<UserRow>(
    `INSERT INTO users (google_sub, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_sub) DO UPDATE
     SET email = EXCLUDED.email,
         name = CASE WHEN EXCLUDED.name = '' THEN users.name ELSE EXCLUDED.name END,
         avatar_url = CASE WHEN EXCLUDED.avatar_url = '' THEN users.avatar_url ELSE EXCLUDED.avatar_url END,
         updated_at = now()
     RETURNING ${USER_COLS}`,
    [sub, email, name, avatar],
  );
  const user = toUser(res.rows[0]);
  return { ...user, communityId: await communityIdOf(user.id) };
}

export async function getSessionUser(id: number): Promise<SessionUser> {
  const res = await getPool().query<UserRow>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  if (res.rowCount === 0) {
    throw new StoreError("not_found", "not found");
  }
  const user = toUser(res.rows[0]);
  return { ...user, communityId: await communityIdOf(user.id) };
}

export async function getUserById(id: number): Promise<User> {
  const res = await getPool().query<UserRow>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  if (res.rowCount === 0) {
    throw new StoreError("not_found", "not found");
  }
  return toUser(res.rows[0]);
}

export async function listUsers(
  role: string,
  page: number,
  perPage: number,
): Promise<{ items: User[]; total: number; page: number; perPage: number }> {
  const safePage = !page || page < 1 ? 1 : Math.floor(page);
  const safePerPage = !perPage || perPage < 1 ? 10 : Math.min(Math.floor(perPage), 50);
  const totalRes = await getPool().query(
    `SELECT count(*) AS total FROM users WHERE ($1 = '' OR role = $1)`,
    [role],
  );
  const res = await getPool().query<UserRow>(
    `SELECT ${USER_COLS} FROM users
     WHERE ($1 = '' OR role = $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [role, safePerPage, (safePage - 1) * safePerPage],
  );
  return {
    items: res.rows.map(toUser),
    total: parseInt(totalRes.rows[0].total as string, 10),
    page: safePage,
    perPage: safePerPage,
  };
}
