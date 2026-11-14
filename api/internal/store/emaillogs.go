package store

import (
	"context"
	"encoding/json"
	"time"
)

type EmailLog struct {
	UserID   *int64         `json:"userId"`
	Template string         `json:"template"`
	Payload  map[string]any `json:"payload"`
	SentAt   *time.Time     `json:"sentAt"`
	Error    string         `json:"error"`
}

func (s *Store) InsertEmailLog(ctx context.Context, in EmailLog) error {
	payload, err := json.Marshal(in.Payload)
	if err != nil {
		payload = []byte("{}")
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO email_logs (user_id, template, payload, sent_at, error)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))`,
		in.UserID, in.Template, payload, in.SentAt, in.Error)
	return err
}
