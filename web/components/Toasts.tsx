"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CODE_MESSAGES: Record<string, string> = {
  oauth_not_configured: "Login Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET.",
  state_mismatch: "Sesi login kedaluwarsa. Coba masuk lagi.",
  token_exchange: "Gagal menukar kode dari Google. Coba lagi.",
  no_id_token: "Google tidak mengirim identitas. Coba lagi.",
  auth_failed: "Login gagal diproses server. Coba lagi.",
};

type Toast = {
  id: number;
  kind: "ok" | "err";
  message: string;
};

let nextId = 1;

export function Toasts() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef("");

  useEffect(() => {
    const ok = searchParams.get("ok");
    const err = searchParams.get("err");
    const code = searchParams.get("error");
    if (!ok && !err && !code) return;

    const key = `${pathname}?${searchParams.toString()}`;
    if (seen.current === key) return;
    seen.current = key;

    const items: Toast[] = [];
    if (ok) items.push({ id: nextId++, kind: "ok", message: ok });
    if (err) items.push({ id: nextId++, kind: "err", message: err });
    if (code) items.push({ id: nextId++, kind: "err", message: CODE_MESSAGES[code] ?? "Login gagal. Coba lagi." });
    setToasts((current) => [...current, ...items]);

    router.replace(pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className={`toast toast-${toast.kind}`}>
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Tutup notifikasi"
            onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
