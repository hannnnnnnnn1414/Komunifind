const dateFmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const shortDateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const timeFmt = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return shortDateFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatShortDate(iso)} · ${formatTime(iso)} WIB`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Menunggu persetujuan";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
    case "cancelled":
      return "Dibatalkan";
    case "draft":
      return "Draft";
    case "published":
      return "Terbit";
    default:
      return status;
  }
}

export function spotsLeft(capacity: number | null, approved: number): string {
  if (capacity === null) return "Tanpa batas kuota";
  const left = Math.max(capacity - approved, 0);
  return `${left} dari ${capacity} slot tersisa`;
}

export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("images/")) return `/${key}`;
  return `/uploads/${key}`;
}

export function toDateTimeLocal(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export function pageUrl(path: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
