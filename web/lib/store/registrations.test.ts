import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, getPool } from "../db";
import { listAllCommunitiesPaged } from "./communities";
import { getEvent, listPublishedEvents, listPublishedEventsPage, updateEvent } from "./events";
import { getUserById, listUsers } from "./users";
import { StoreError, type StoreErrorCode } from "./errors";
import {
  approveRegistration,
  cancelRegistration,
  createRegistration,
  listPendingForOrganizer,
  rejectRegistration,
} from "./registrations";

const DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!DATABASE_URL)("registrations store", () => {
  beforeAll(async () => {
    if (!DATABASE_URL) return;
    process.env.DATABASE_URL = DATABASE_URL;
    const check = await getPool().query(`SELECT to_regclass('public.users') AS exists`);
    if (!check.rows[0].exists) {
      throw new Error("tabel users tidak ada — jalankan `npm run db:migrate` dulu");
    }
  });

  afterAll(async () => {
    await closePool();
  });

  type Fixture = {
    organizerA: number;
    organizerB: number;
    userC: number;
    userD: number;
    eventCap1: number;
    eventNoCap: number;
    eventPast: number;
    eventDraft: number;
  };

  async function newFixture(): Promise<Fixture> {
    const pool = getPool();
    await pool.query(
      `TRUNCATE email_logs, registrations, events, communities, users RESTART IDENTITY CASCADE`,
    );

    async function insertUser(sub: string, email: string, name: string, role: string): Promise<number> {
      const res = await pool.query(
        `INSERT INTO users (google_sub, email, name, role) VALUES ($1,$2,$3,$4) RETURNING id`,
        [sub, email, name, role],
      );
      return Number(res.rows[0].id);
    }

    const organizerA = await insertUser("a", "a@test.local", "Organizer A", "organizer");
    const organizerB = await insertUser("b", "b@test.local", "Organizer B", "organizer");
    const userC = await insertUser("c", "c@test.local", "User C", "user");
    const userD = await insertUser("d", "d@test.local", "User D", "user");

    async function insertCommunity(slug: string, name: string, organizer: number): Promise<number> {
      const res = await pool.query(
        `INSERT INTO communities (slug, name, organizer_id, status) VALUES ($1,$2,$3,'published') RETURNING id`,
        [slug, name, organizer],
      );
      return Number(res.rows[0].id);
    }
    const communityA = await insertCommunity("community-a", "Community A", organizerA);
    await insertCommunity("community-b", "Community B", organizerB);

    async function insertEvent(
      community: number,
      title: string,
      capacity: number | null,
      status: string,
      starts: Date,
    ): Promise<number> {
      const res = await pool.query(
        `INSERT INTO events (community_id, title, starts_at, capacity, status) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [community, title, starts, capacity, status],
      );
      return Number(res.rows[0].id);
    }

    const future = new Date(Date.now() + 48 * 3600 * 1000);
    const past = new Date(Date.now() - 2 * 3600 * 1000);
    const eventCap1 = await insertEvent(communityA, "Capacity 1", 1, "published", future);
    const eventNoCap = await insertEvent(communityA, "No cap", null, "published", future);
    const eventPast = await insertEvent(communityA, "Past event", null, "published", past);
    const eventDraft = await insertEvent(communityA, "Draft event", null, "draft", future);

    return { organizerA, organizerB, userC, userD, eventCap1, eventNoCap, eventPast, eventDraft };
  }

  async function expectStoreError(promise: Promise<unknown>, code: StoreErrorCode): Promise<void> {
    try {
      await promise;
    } catch (err) {
      expect(err).toBeInstanceOf(StoreError);
      expect((err as StoreError).code).toBe(code);
      return;
    }
    throw new Error(`expected StoreError ${code}`);
  }

  it("approve respects capacity", async () => {
    const f = await newFixture();
    const regC = await createRegistration(f.eventCap1, f.userC);
    const regD = await createRegistration(f.eventCap1, f.userD);

    await approveRegistration(regC.id, f.organizerA);
    await expectStoreError(approveRegistration(regD.id, f.organizerA), "quota_full");
  });

  it("approve enforces tenant", async () => {
    const f = await newFixture();
    const reg = await createRegistration(f.eventCap1, f.userC);

    await expectStoreError(approveRegistration(reg.id, f.organizerB), "forbidden");
    await approveRegistration(reg.id, f.organizerA);
  });

  it("cancel frees slot", async () => {
    const f = await newFixture();
    const regC = await createRegistration(f.eventCap1, f.userC);
    const regD = await createRegistration(f.eventCap1, f.userD);

    await approveRegistration(regC.id, f.organizerA);
    await expectStoreError(approveRegistration(regD.id, f.organizerA), "quota_full");
    await cancelRegistration(regC.id, f.userC);
    await approveRegistration(regD.id, f.organizerA);
  });

  it("re-register after cancel reuses row", async () => {
    const f = await newFixture();
    const first = await createRegistration(f.eventCap1, f.userC);
    await cancelRegistration(first.id, f.userC);
    const second = await createRegistration(f.eventCap1, f.userC);

    expect(second.id).toBe(first.id);
    expect(second.status).toBe("pending");
  });

  it("duplicate active registration rejected", async () => {
    const f = await newFixture();
    await createRegistration(f.eventCap1, f.userC);
    await expectStoreError(createRegistration(f.eventCap1, f.userC), "conflict");
  });

  it("approved cannot be rejected", async () => {
    const f = await newFixture();
    const reg = await createRegistration(f.eventCap1, f.userC);
    await approveRegistration(reg.id, f.organizerA);
    await expectStoreError(rejectRegistration(reg.id, f.organizerA), "invalid_state");
  });

  it("cannot register past or draft events", async () => {
    const f = await newFixture();
    await expectStoreError(createRegistration(f.eventPast, f.userC), "event_started");
    await expectStoreError(createRegistration(f.eventDraft, f.userC), "invalid_state");
  });

  it("cancel forbidden for other user", async () => {
    const f = await newFixture();
    const reg = await createRegistration(f.eventCap1, f.userC);
    await expectStoreError(cancelRegistration(reg.id, f.userD), "forbidden");
  });

  it("joined fields are populated", async () => {
    const f = await newFixture();
    const reg = await createRegistration(f.eventCap1, f.userC);

    expect(reg.eventTitle).toBe("Capacity 1");
    expect(reg.userEmail).toBe("c@test.local");
    expect(reg.userName).toBe("User C");
    expect(reg.communitySlug).toBe("community-a");
    expect(reg.communityName).toBe("Community A");
    expect(new Date(reg.startsAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("pending list milik organizer sendiri dan urut terbaru", async () => {
    const f = await newFixture();
    const first = await createRegistration(f.eventCap1, f.userC);
    const second = await createRegistration(f.eventNoCap, f.userD);

    const items = await listPendingForOrganizer(f.organizerA, 10);
    expect(items).toHaveLength(2);
    expect(items[0].registrationId).toBe(second.id);
    expect(items[0].eventTitle).toBe("No cap");
    expect(items[0].userName).toBe("User D");
    expect(items[1].registrationId).toBe(first.id);

    expect(await listPendingForOrganizer(f.organizerB, 10)).toHaveLength(0);

    expect(await listPendingForOrganizer(f.organizerA, 1)).toHaveLength(1);
  });

  it("capacity cannot drop below approved", async () => {
    const f = await newFixture();
    const regC = await createRegistration(f.eventNoCap, f.userC);
    const regD = await createRegistration(f.eventNoCap, f.userD);
    await approveRegistration(regC.id, f.organizerA);
    await approveRegistration(regD.id, f.organizerA);

    await expectStoreError(updateEvent(f.eventNoCap, { capacity: 1 }), "capacity_below");
  });
});

describe("events store", () => {
  async function newEventFixture(): Promise<{ eventId: number }> {
    const pool = getPool();
    await pool.query(
      `TRUNCATE email_logs, registrations, events, communities, users RESTART IDENTITY CASCADE`,
    );
    const user = await pool.query(
      `INSERT INTO users (google_sub, email, name, role) VALUES ('o','o@test.local','Org','organizer') RETURNING id`,
    );
    const community = await pool.query(
      `INSERT INTO communities (slug, name, organizer_id, status) VALUES ('community-a','Community A',$1,'published') RETURNING id`,
      [Number(user.rows[0].id)],
    );
    const event = await pool.query(
      `INSERT INTO events (community_id, title, starts_at, status) VALUES ($1,'Some Event',$2,'published') RETURNING id`,
      [Number(community.rows[0].id), new Date(Date.now() + 24 * 3600 * 1000)],
    );
    return { eventId: Number(event.rows[0].id) };
  }

  it("joined community fields are populated", async () => {
    const f = await newEventFixture();
    const event = await getEvent(f.eventId);

    expect(event.communitySlug).toBe("community-a");
    expect(event.communityName).toBe("Community A");
    expect(event.title).toBe("Some Event");
  });

  it("published list carries community fields", async () => {
    const f = await newEventFixture();
    const events = await listPublishedEvents(10);
    const found = events.find((e) => e.id === f.eventId);

    expect(found?.communitySlug).toBe("community-a");
    expect(found?.communityName).toBe("Community A");
  });
});

describe("pagination", () => {
  async function seedMany(): Promise<void> {
    const pool = getPool();
    await pool.query(
      `TRUNCATE email_logs, registrations, events, communities, users RESTART IDENTITY CASCADE`,
    );
    for (let i = 1; i <= 12; i++) {
      await pool.query(
        `INSERT INTO users (google_sub, email, name, role) VALUES ($1,$2,$3,'user')`,
        [`u${i}`, `u${i}@test.local`, `User ${i}`],
      );
      const community = await pool.query(
        `INSERT INTO communities (slug, name, status) VALUES ($1,$2,'published') RETURNING id`,
        [`community-${i}`, `Community ${i}`],
      );
      const communityId = Number(community.rows[0].id);
      await pool.query(
        `INSERT INTO events (community_id, title, starts_at, status) VALUES ($1,$2,$3,'published')`,
        [communityId, `Event ${i}`, new Date(Date.now() + i * 3600 * 1000)],
      );
    }
  }

  it("communities: total + halaman 2 + clamp", async () => {
    await seedMany();
    const first = await listAllCommunitiesPaged(1, 10);
    expect(first.total).toBe(12);
    expect(first.items).toHaveLength(10);
    expect(first.page).toBe(1);

    const second = await listAllCommunitiesPaged(2, 10);
    expect(second.items).toHaveLength(2);
    expect(second.items[0].slug).not.toBe(second.items[1].slug);

    const clamped = await listAllCommunitiesPaged(0, 0);
    expect(clamped.page).toBe(1);
  });

  it("users: filter role + halaman + getUserById", async () => {
    await seedMany();
    const page = await listUsers("", 2, 10);
    expect(page.total).toBe(12);
    expect(page.items).toHaveLength(2);

    const onlyMissing = await listUsers("admin", 1, 10);
    expect(onlyMissing.total).toBe(0);
    expect(onlyMissing.items).toHaveLength(0);

    const one = await getUserById(1);
    expect(one.email).toBe("u1@test.local");
    await expect(getUserById(999999)).rejects.toMatchObject({ code: "not_found" });
  });

  it("events: halaman global dengan total", async () => {
    await seedMany();
    const first = await listPublishedEventsPage(1, 12);
    expect(first.total).toBe(12);
    expect(first.items).toHaveLength(12);

    const invalid = await listPublishedEventsPage(-3, 999);
    expect(invalid.page).toBe(1);
    expect(invalid.perPage).toBe(12);
  });
});
