package store

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"komunifind/api/internal/db"
)

var testPool *pgxpool.Pool
var testStore *Store

func TestMain(m *testing.M) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		fmt.Println("store tests skipped: TEST_DATABASE_URL not set")
		os.Exit(0)
	}
	ctx := context.Background()
	pool, err := db.Connect(ctx, url)
	if err != nil {
		panic(err)
	}
	if err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		panic(err)
	}
	testPool = pool
	testStore = New(pool)
	code := m.Run()
	pool.Close()
	os.Exit(code)
}

type fixture struct {
	organizerA       int64
	organizerB       int64
	userC            int64
	userD            int64
	communityA       int64
	communityB       int64
	eventCap1        int64
	eventNoCap       int64
	eventPast        int64
	eventDraft       int64
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	ctx := context.Background()
	if _, err := testPool.Exec(ctx, `TRUNCATE email_logs, registrations, events, communities, users RESTART IDENTITY CASCADE`); err != nil {
		t.Fatalf("truncate: %v", err)
	}

	insertUser := func(sub, email, name, role string) int64 {
		var id int64
		if err := testPool.QueryRow(ctx,
			`INSERT INTO users (google_sub, email, name, role) VALUES ($1,$2,$3,$4) RETURNING id`,
			sub, email, name, role).Scan(&id); err != nil {
			t.Fatalf("insert user: %v", err)
		}
		return id
	}

	f := fixture{
		organizerA: insertUser("a", "a@test.local", "Organizer A", "organizer"),
		organizerB: insertUser("b", "b@test.local", "Organizer B", "organizer"),
		userC:      insertUser("c", "c@test.local", "User C", "user"),
		userD:      insertUser("d", "d@test.local", "User D", "user"),
	}

	insertCommunity := func(slug, name string, organizer int64) int64 {
		var id int64
		if err := testPool.QueryRow(ctx,
			`INSERT INTO communities (slug, name, organizer_id, status) VALUES ($1,$2,$3,'published') RETURNING id`,
			slug, name, organizer).Scan(&id); err != nil {
			t.Fatalf("insert community: %v", err)
		}
		return id
	}
	f.communityA = insertCommunity("community-a", "Community A", f.organizerA)
	f.communityB = insertCommunity("community-b", "Community B", f.organizerB)

	insertEvent := func(community int64, title string, capacity *int, status string, starts time.Time) int64 {
		var id int64
		if err := testPool.QueryRow(ctx,
			`INSERT INTO events (community_id, title, starts_at, capacity, status) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
			community, title, starts, capacity, status).Scan(&id); err != nil {
			t.Fatalf("insert event: %v", err)
		}
		return id
	}

	cap1 := 1
	future := time.Now().Add(48 * time.Hour)
	f.eventCap1 = insertEvent(f.communityA, "Capacity 1", &cap1, "published", future)
	f.eventNoCap = insertEvent(f.communityA, "No cap", nil, "published", future)
	f.eventPast = insertEvent(f.communityA, "Past event", nil, "published", time.Now().Add(-2*time.Hour))
	f.eventDraft = insertEvent(f.communityA, "Draft event", nil, "draft", future)
	return f
}

func TestApproveRespectsCapacity(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	regC, err := testStore.CreateRegistration(ctx, f.eventCap1, f.userC)
	if err != nil {
		t.Fatalf("register C: %v", err)
	}
	regD, err := testStore.CreateRegistration(ctx, f.eventCap1, f.userD)
	if err != nil {
		t.Fatalf("register D: %v", err)
	}

	if _, err := testStore.ApproveRegistration(ctx, regC.ID, f.organizerA); err != nil {
		t.Fatalf("approve C: %v", err)
	}
	if _, err := testStore.ApproveRegistration(ctx, regD.ID, f.organizerA); !errors.Is(err, ErrQuotaFull) {
		t.Fatalf("expected ErrQuotaFull, got %v", err)
	}
}

func TestApproveEnforcesTenant(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	reg, err := testStore.CreateRegistration(ctx, f.eventCap1, f.userC)
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := testStore.ApproveRegistration(ctx, reg.ID, f.organizerB); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
	if _, err := testStore.ApproveRegistration(ctx, reg.ID, f.organizerA); err != nil {
		t.Fatalf("owner approve: %v", err)
	}
}

func TestCancelFreesSlot(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	regC, _ := testStore.CreateRegistration(ctx, f.eventCap1, f.userC)
	regD, _ := testStore.CreateRegistration(ctx, f.eventCap1, f.userD)

	if _, err := testStore.ApproveRegistration(ctx, regC.ID, f.organizerA); err != nil {
		t.Fatalf("approve C: %v", err)
	}
	if _, err := testStore.ApproveRegistration(ctx, regD.ID, f.organizerA); !errors.Is(err, ErrQuotaFull) {
		t.Fatalf("expected quota full, got %v", err)
	}
	if _, err := testStore.CancelRegistration(ctx, regC.ID, f.userC); err != nil {
		t.Fatalf("cancel C: %v", err)
	}
	if _, err := testStore.ApproveRegistration(ctx, regD.ID, f.organizerA); err != nil {
		t.Fatalf("approve D after cancel: %v", err)
	}
}

func TestReRegisterAfterCancelReusesRow(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	first, err := testStore.CreateRegistration(ctx, f.eventCap1, f.userC)
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := testStore.CancelRegistration(ctx, first.ID, f.userC); err != nil {
		t.Fatalf("cancel: %v", err)
	}
	second, err := testStore.CreateRegistration(ctx, f.eventCap1, f.userC)
	if err != nil {
		t.Fatalf("re-register: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("expected same registration row %d, got %d", first.ID, second.ID)
	}
	if second.Status != "pending" {
		t.Fatalf("expected pending, got %s", second.Status)
	}
}

func TestDuplicateActiveRegistrationRejected(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	if _, err := testStore.CreateRegistration(ctx, f.eventCap1, f.userC); err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := testStore.CreateRegistration(ctx, f.eventCap1, f.userC); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
}

func TestApprovedCannotBeRejected(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	reg, _ := testStore.CreateRegistration(ctx, f.eventCap1, f.userC)
	if _, err := testStore.ApproveRegistration(ctx, reg.ID, f.organizerA); err != nil {
		t.Fatalf("approve: %v", err)
	}
	if _, err := testStore.RejectRegistration(ctx, reg.ID, f.organizerA); !errors.Is(err, ErrInvalidState) {
		t.Fatalf("expected ErrInvalidState, got %v", err)
	}
}

func TestCannotRegisterPastOrDraft(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	if _, err := testStore.CreateRegistration(ctx, f.eventPast, f.userC); !errors.Is(err, ErrEventStarted) {
		t.Fatalf("past: expected ErrEventStarted, got %v", err)
	}
	if _, err := testStore.CreateRegistration(ctx, f.eventDraft, f.userC); !errors.Is(err, ErrInvalidState) {
		t.Fatalf("draft: expected ErrInvalidState, got %v", err)
	}
}

func TestCancelForbiddenForOtherUser(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	reg, _ := testStore.CreateRegistration(ctx, f.eventCap1, f.userC)
	if _, err := testStore.CancelRegistration(ctx, reg.ID, f.userD); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestCapacityCannotDropBelowApproved(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	regC, _ := testStore.CreateRegistration(ctx, f.eventNoCap, f.userC)
	regD, _ := testStore.CreateRegistration(ctx, f.eventNoCap, f.userD)
	if _, err := testStore.ApproveRegistration(ctx, regC.ID, f.organizerA); err != nil {
		t.Fatalf("approve C: %v", err)
	}
	if _, err := testStore.ApproveRegistration(ctx, regD.ID, f.organizerA); err != nil {
		t.Fatalf("approve D: %v", err)
	}

	one := 1
	if _, err := testStore.UpdateEvent(ctx, f.eventNoCap, EventPatch{Capacity: &one}); !errors.Is(err, ErrCapacityBelow) {
		t.Fatalf("expected ErrCapacityBelow, got %v", err)
	}
}
