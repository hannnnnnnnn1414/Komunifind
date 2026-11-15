import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeForRole } from "@/lib/session";
import { devLoginAction } from "@/app/actions";

export const dynamic = "force-dynamic";

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
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const devLogin = process.env.DEV_LOGIN === "true";

  return (
    <div className="login-split">
      <div className="login-brand">
        <Link href="/" className="brand login-brand-mark">
          <span className="brand-mark">K</span>
          Komunifind
        </Link>
        <h1>Temukan orang yang menikmati hal yang sama.</h1>
        <p>
          Masuk untuk mendaftar event, atau kelola komunitasmu sebagai panitia.
          Direktori komunitas Indonesia, dikelola panitia sendiri.
        </p>
        <div className="login-brand-images" aria-hidden="true">
          <img src="/images/citywalk.jpg" alt="" loading="lazy" />
          <img src="/images/expo.jpg" alt="" loading="lazy" />
          <img src="/images/padel.jpg" alt="" loading="lazy" />
        </div>
      </div>

      <div className="login-form-wrap">
        <div className="card card-body login-card">
          <p className="eyebrow">Masuk</p>
          <h2>Selamat datang kembali</h2>
          <p className="muted small">Pakai akun Google untuk melanjutkan.</p>

          <a
            className="btn btn-primary login-google"
            href={next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.3 3.5 2.7.2.1c2.2-2 3.8-5 3.8-9.1z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.2.1-3.6 2.8v.2C3.4 21.5 7.4 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.3-3.5-2.7h-.2C.5 8.3 0 10 0 12s.5 3.7 1.4 5.4l3.8-3z"
              />
              <path
                fill="#EA4335"
                d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.7 1.1 15.2 0 12 0 7.4 0 3.4 2.5 1.4 6.6l3.8 3c1-2.9 3.7-4.9 6.8-4.9z"
              />
            </svg>
            Lanjutkan dengan Google
          </a>
          <p className="muted small mt-16 mb-0">
            Kami hanya menyimpan nama, email, dan foto profil dari akun Google-mu.
          </p>

          {devLogin ? (
            <div className="login-dev">
              <div className="login-divider">
                <span>mode development</span>
              </div>
              <p className="small muted">
                Login cepat tanpa Google. Hanya aktif bila <code>DEV_LOGIN=true</code>.
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
        </div>

        <p className="muted small mt-24" style={{ textAlign: "center" }}>
          Belum punya komunitas? <Link href="/">Jelajahi komunitas</Link> dulu.
        </p>
      </div>
    </div>
  );
}
