import nodemailer from "nodemailer";
import { apiFetch } from "./api";

type Template = "registration_received" | "registration_approved" | "registration_rejected" | "event_cancelled";

type MailInput = {
  template: Template;
  to: string;
  name: string;
  eventTitle: string;
  communityName: string;
  userId?: number;
  extra?: Record<string, string>;
};

const subjects: Record<Template, string> = {
  registration_received: "Pendaftaran diterima, menunggu persetujuan",
  registration_approved: "Pendaftaranmu disetujui",
  registration_rejected: "Pendaftaranmu belum bisa diterima",
  event_cancelled: "Event dibatalkan",
};

function bodyFor(input: MailInput): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const link = `${base}/me`;
  const intro: Record<Template, string> = {
    registration_received: `Pendaftaranmu untuk <strong>${escapeHtml(input.eventTitle)}</strong> sudah kami terima dan sedang menunggu persetujuan panitia ${escapeHtml(input.communityName)}.`,
    registration_approved: `Kabar baik! Pendaftaranmu untuk <strong>${escapeHtml(input.eventTitle)}</strong> sudah disetujui panitia ${escapeHtml(input.communityName)}.`,
    registration_rejected: `Maaf, pendaftaranmu untuk <strong>${escapeHtml(input.eventTitle)}</strong> belum bisa diterima panitia ${escapeHtml(input.communityName)}.`,
    event_cancelled: `Event <strong>${escapeHtml(input.eventTitle)}</strong> dari ${escapeHtml(input.communityName)} dibatalkan. Pendaftaranmu otomatis dibatalkan.`,
  };
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111111">
    <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#555555;margin:0 0 16px">Komunifind</p>
    <h1 style="font-size:20px;margin:0 0 12px">Halo ${escapeHtml(input.name)}</h1>
    <p style="line-height:1.6;margin:0 0 20px">${intro[input.template]}</p>
    <a href="${link}" style="display:inline-block;background:#111111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Lihat status pendaftaran</a>
    <p style="font-size:12px;color:#6e6e6e;margin-top:28px">Email ini dikirim otomatis oleh Komunifind.</p>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendMail(input: MailInput): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  let error = "";

  if (!host || !user || !pass) {
    error = "SMTP belum dikonfigurasi";
  } else {
    try {
      const transport = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth: { user, pass },
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? "Komunifind <no-reply@komunifind.test>",
        to: input.to,
        subject: subjects[input.template],
        html: bodyFor(input),
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "Gagal mengirim email";
    }
  }

  try {
    await apiFetch("/api/v1/internal/email-logs", {
      method: "POST",
      internal: true,
      body: {
        userId: input.userId ?? null,
        template: input.template,
        payload: { to: input.to, eventTitle: input.eventTitle, communityName: input.communityName },
        sentAt: error ? null : new Date().toISOString(),
        error,
      },
    });
  } catch {
    // logging is best-effort
  }
}
