import { getPool } from "../db";

export type EmailLogInput = {
  userId: number | null;
  template: string;
  payload: Record<string, unknown>;
  sentAt: string | null;
  error: string;
};

export async function insertEmailLog(input: EmailLogInput): Promise<void> {
  await getPool().query(
    `INSERT INTO email_logs (user_id, template, payload, sent_at, error)
     VALUES ($1, $2, $3, $4, NULLIF($5, ''))`,
    [
      input.userId,
      input.template,
      JSON.stringify(input.payload ?? {}),
      input.sentAt,
      input.error,
    ],
  );
}
