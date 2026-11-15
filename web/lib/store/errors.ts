export type StoreErrorCode =
  | "not_found"
  | "conflict"
  | "quota_full"
  | "invalid_state"
  | "forbidden"
  | "event_started"
  | "capacity_below";

export class StoreError extends Error {
  code: StoreErrorCode;

  constructor(code: StoreErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function isStoreError(err: unknown): err is StoreError {
  return err instanceof StoreError;
}

export function storeErrorToMessage(err: unknown): string {
  if (err instanceof StoreError) {
    switch (err.code) {
      case "not_found":
        return err.message;
      case "conflict":
        return "Kamu sudah terdaftar di event ini";
      case "quota_full":
        return "Kuota event sudah penuh";
      case "invalid_state":
        return "Aksi tidak valid untuk status saat ini";
      case "event_started":
        return "Event sudah dimulai atau lewat";
      case "capacity_below":
        return err.message;
      case "forbidden":
        return "Kamu tidak punya akses ke data ini";
    }
  }
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan";
}

export function asNumber(value: string | number): number {
  return typeof value === "number" ? value : parseInt(value, 10);
}

export function asISO(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
