import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeForRole } from "@/lib/session";
import { devLoginAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  oauth_not_configured: "Login Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET.",
  state_mismatch: "Sesi login kedaluwarsa. Coba masuk lagi.",
  token_exchange: "Gagal menukar kode dari Google. Coba lagi.",
  no_id_token: "Google tidak mengirim identitas. Coba lagi.",
  auth_failed: "Login gagal diproses server. Coba lagi.",
};

const devUsers = [
  { email: "admin@komunifind.test", label: "Admin pusat" },
  { email: "rina@komunifind.test", label: "Panitia Jakarta Indie Runners" },
  { email: "budi@komunifind.test", label: "Panitia Bandung Design Circle" },
  { email: "sari@komunifind.test", label: "User biasa" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homeForRole(user.role));

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const ok = typeof sp.err === "string" ? sp.err : undefined;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const devLogin = process.env.DEV_LOGIN === "true";

  return (
    <div className="container-narrow">
      <div className="page-head">
        <p className="eyebrow">Masuk</p>
        <h1>Masuk ke Komunifind</h1>
        <p className="sub">
          Pakai akun Google. Setelah masuk, kamu bisa mendaftar event. Panitia akan diarahkan ke dashboard
          komunitasnya.
        </p>
      </div>

      {error ? (
        <div className="notice notice-err">{errorMessages[error] ?? "Login gagal. Coba lagi."}</div>
      ) : null}
      {ok ? <div className="notice notice-err">{ok}</div> : null}

      <div className="card card-body">
        <a
          className="btn btn-primary"
          href={next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google"}
        >
          Lanjutkan dengan Google
        </a>
        <p className="muted small mt-16 mb-0">
          Kami hanya menyimpan nama, email, dan foto profil dari akun Google-mu.
        </p>
      </div>

      {devLogin ? (
        <div className="card card-body mt-16">
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Mode development
          </p>
          <p className="small muted">
            Login cepat tanpa Google. Hanya aktif bila <code>DEV_LOGIN=true</code> di server API.
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {devUsers.map((u) => (
              <form key={u.email} action={devLoginAction} className="row" style={{ gap: 10 }}>
                <input type="hidden" name="email" value={u.email} />
                <button type="submit" className="btn btn-sm">
                  Masuk sebagai {u.label}
                </button>
                <span className="muted small">{u.email}</span>
              </form>
            ))}
          </div>
        </div>
      ) : null}

      <p className="muted small mt-24">
        Belum punya komunitas? <Link href="/">Jelajahi komunitas</Link> dulu.
      </p>
    </div>
  );
}
