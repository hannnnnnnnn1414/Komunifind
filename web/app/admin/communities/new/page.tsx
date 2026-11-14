import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Notices } from "@/components/Notices";
import { adminCreateCommunityAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewCommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const err = typeof sp.err === "string" ? sp.err : undefined;

  return (
    <div className="container-narrow" style={{ padding: 0 }}>
      <Notices ok={ok} err={err} />
      <div className="card card-body">
        <h2 style={{ fontSize: 21 }}>Komunitas baru</h2>
        <p className="muted small">
          Panitia harus sudah pernah login sekali agar emailnya bisa dikaitkan. Slug boleh kosong, akan dibuat
          otomatis dari nama.
        </p>

        <form action={adminCreateCommunityAction} encType="multipart/form-data" style={{ marginTop: 18 }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Nama</label>
              <input id="name" name="name" type="text" required />
            </div>
            <div className="field">
              <label htmlFor="slug">Slug (opsional)</label>
              <input id="slug" name="slug" type="text" placeholder="jakarta-indie-runners" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" type="text" />
          </div>

          <div className="field">
            <label htmlFor="description">Deskripsi</label>
            <textarea id="description" name="description" />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="category">Kategori</label>
              <input id="category" name="category" type="text" />
            </div>
            <div className="field">
              <label htmlFor="city">Kota</label>
              <input id="city" name="city" type="text" />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="organizerEmail">Email panitia</label>
              <input id="organizerEmail" name="organizerEmail" type="email" placeholder="rina@komunifind.test" />
              <span className="hint">Opsional. Bisa diatur nanti setelah panitia login.</span>
            </div>
            <div className="field">
              <label htmlFor="instagram">Instagram</label>
              <input id="instagram" name="instagram" type="url" />
            </div>
            <div className="field">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="url" />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="logo">Logo</label>
              <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
            </div>
            <div className="field">
              <label htmlFor="banner">Banner</label>
              <input id="banner" name="banner" type="file" accept="image/jpeg,image/png,image/webp" />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Buat komunitas
            </button>
            <Link href="/admin" className="btn btn-ghost">
              Batal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
