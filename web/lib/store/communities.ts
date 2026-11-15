import { getPool, withTx } from "../db";
import type { Community, ListResult } from "../types";
import { StoreError, asISO, asNumber } from "./errors";

const COMMUNITY_COLS = `id, slug, name, tagline, description, logo_key, banner_key,
  category, city, socials, organizer_id, status, created_at, updated_at`;

type CommunityRow = {
  id: string | number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logo_key: string | null;
  banner_key: string | null;
  category: string;
  city: string;
  socials: unknown;
  organizer_id: string | number | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function decodeSocials(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, string>;
  return {};
}

function toCommunity(row: CommunityRow): Community {
  return {
    id: asNumber(row.id),
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    logoKey: row.logo_key,
    bannerKey: row.banner_key,
    category: row.category,
    city: row.city,
    socials: decodeSocials(row.socials),
    organizerId: row.organizer_id === null ? null : asNumber(row.organizer_id),
    status: row.status,
    createdAt: asISO(row.created_at),
    updatedAt: asISO(row.updated_at),
  };
}

function clampPagination(page: number, perPage: number): [number, number] {
  if (!page || page < 1) page = 1;
  if (!perPage || perPage < 1) perPage = 12;
  if (perPage > 48) perPage = 48;
  return [Math.floor(page), Math.floor(perPage)];
}

const LIST_WHERE = `WHERE status = 'published'
  AND ($1 = '' OR lower(name) LIKE '%' || lower($1) || '%' OR lower(tagline) LIKE '%' || lower($1) || '%')
  AND ($2 = '' OR category = $2)
  AND ($3 = '' OR city = $3)`;

export async function listPublicCommunities(
  q: string,
  category: string,
  city: string,
  page: number,
  perPage: number,
): Promise<ListResult<Community>> {
  const [safePage, safePerPage] = clampPagination(page, perPage);
  const needle = q.trim();

  const totalRes = await getPool().query(
    `SELECT count(*) AS total FROM communities ${LIST_WHERE}`,
    [needle, category, city],
  );
  const total = parseInt(totalRes.rows[0].total as string, 10);

  const res = await getPool().query<CommunityRow>(
    `SELECT ${COMMUNITY_COLS} FROM communities ${LIST_WHERE}
     ORDER BY name ASC LIMIT $4 OFFSET $5`,
    [needle, category, city, safePerPage, (safePage - 1) * safePerPage],
  );
  return {
    items: res.rows.map(toCommunity),
    total,
    page: safePage,
    perPage: safePerPage,
  };
}

export async function communityFacets(): Promise<{ categories: string[]; cities: string[] }> {
  const catRes = await getPool().query(
    `SELECT DISTINCT category FROM communities WHERE status = 'published' AND category <> '' ORDER BY category`,
  );
  const cityRes = await getPool().query(
    `SELECT DISTINCT city FROM communities WHERE status = 'published' AND city <> '' ORDER BY city`,
  );
  return {
    categories: catRes.rows.map((row) => row.category as string),
    cities: cityRes.rows.map((row) => row.city as string),
  };
}

export async function getCommunityBySlug(slug: string): Promise<Community> {
  const res = await getPool().query<CommunityRow>(
    `SELECT ${COMMUNITY_COLS} FROM communities WHERE slug = $1`,
    [slug],
  );
  if (res.rowCount === 0) throw new StoreError("not_found", "not found");
  return toCommunity(res.rows[0]);
}

export async function getCommunityById(id: number): Promise<Community> {
  const res = await getPool().query<CommunityRow>(
    `SELECT ${COMMUNITY_COLS} FROM communities WHERE id = $1`,
    [id],
  );
  if (res.rowCount === 0) throw new StoreError("not_found", "not found");
  return toCommunity(res.rows[0]);
}

export async function getCommunityByOrganizer(organizerId: number): Promise<Community> {
  const res = await getPool().query<CommunityRow>(
    `SELECT ${COMMUNITY_COLS} FROM communities WHERE organizer_id = $1`,
    [organizerId],
  );
  if (res.rowCount === 0) throw new StoreError("not_found", "not found");
  return toCommunity(res.rows[0]);
}

export type CommunityInput = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logoKey: string | null;
  bannerKey: string | null;
  category: string;
  city: string;
  socials: Record<string, string>;
  status: string;
};

export async function createCommunity(input: CommunityInput): Promise<Community> {
  const res = await getPool().query<CommunityRow>(
    `INSERT INTO communities (slug, name, tagline, description, logo_key, banner_key, category, city, socials, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING ${COMMUNITY_COLS}`,
    [
      input.slug,
      input.name,
      input.tagline,
      input.description,
      input.logoKey,
      input.bannerKey,
      input.category,
      input.city,
      JSON.stringify(input.socials ?? {}),
      input.status || "published",
    ],
  );
  return toCommunity(res.rows[0]);
}

export type CommunityPatch = {
  name?: string;
  tagline?: string;
  description?: string;
  logoKey?: string | null;
  bannerKey?: string | null;
  category?: string;
  city?: string;
  socials?: Record<string, string>;
  status?: string;
};

export async function updateCommunity(id: number, patch: CommunityPatch): Promise<Community> {
  const current = await getCommunityById(id);

  const merged: Community = { ...current };
  if (patch.name != null) merged.name = patch.name;
  if (patch.tagline != null) merged.tagline = patch.tagline;
  if (patch.description != null) merged.description = patch.description;
  if (patch.logoKey != null) merged.logoKey = patch.logoKey;
  if (patch.bannerKey != null) merged.bannerKey = patch.bannerKey;
  if (patch.category != null) merged.category = patch.category;
  if (patch.city != null) merged.city = patch.city;
  if (patch.socials != null) merged.socials = patch.socials;
  if (patch.status != null) merged.status = patch.status;
  if (merged.logoKey === "") merged.logoKey = null;
  if (merged.bannerKey === "") merged.bannerKey = null;

  const res = await getPool().query<CommunityRow>(
    `UPDATE communities SET name=$2, tagline=$3, description=$4, logo_key=$5, banner_key=$6,
       category=$7, city=$8, socials=$9, status=$10, updated_at=now()
     WHERE id=$1
     RETURNING ${COMMUNITY_COLS}`,
    [
      id,
      merged.name,
      merged.tagline,
      merged.description,
      merged.logoKey,
      merged.bannerKey,
      merged.category,
      merged.city,
      JSON.stringify(merged.socials ?? {}),
      merged.status,
    ],
  );
  return toCommunity(res.rows[0]);
}

export async function assignOrganizer(communityId: number, email: string): Promise<Community> {
  const normalized = email.trim().toLowerCase();
  const userRes = await getPool().query(`SELECT id FROM users WHERE lower(email) = $1`, [normalized]);
  if (userRes.rowCount === 0) {
    throw new StoreError("not_found", "user dengan email tersebut belum pernah login");
  }
  const userId = asNumber(userRes.rows[0].id as string | number);

  await withTx(async (client) => {
    const locked = await client.query(`SELECT organizer_id FROM communities WHERE id = $1 FOR UPDATE`, [
      communityId,
    ]);
    if (locked.rowCount === 0) {
      throw new StoreError("not_found", "not found");
    }
    await client.query(
      `UPDATE communities SET organizer_id = NULL, updated_at = now() WHERE organizer_id = $1 AND id <> $2`,
      [userId, communityId],
    );
    await client.query(`UPDATE communities SET organizer_id = $2, updated_at = now() WHERE id = $1`, [
      communityId,
      userId,
    ]);
    await client.query(`UPDATE users SET role = 'organizer', updated_at = now() WHERE id = $1 AND role = 'user'`, [
      userId,
    ]);
  });

  return getCommunityById(communityId);
}

export async function countUnassignedCommunities(): Promise<number> {
  const res = await getPool().query(
    `SELECT count(*) AS total FROM communities WHERE organizer_id IS NULL`,
  );
  return parseInt(res.rows[0].total as string, 10);
}

export async function listAllCommunitiesPaged(
  page: number,
  perPage: number,
): Promise<ListResult<Community>> {
  const [safePage, safePerPage] = clampPagination(page, perPage);
  const totalRes = await getPool().query(`SELECT count(*) AS total FROM communities`);
  const total = parseInt(totalRes.rows[0].total as string, 10);
  const res = await getPool().query<CommunityRow>(
    `SELECT ${COMMUNITY_COLS} FROM communities ORDER BY name ASC LIMIT $1 OFFSET $2`,
    [safePerPage, (safePage - 1) * safePerPage],
  );
  return {
    items: res.rows.map(toCommunity),
    total,
    page: safePage,
    perPage: safePerPage,
  };
}
