import { apiFetch } from "@/lib/api";
import { getToken, requireUser } from "@/lib/session";
import { mediaUrl } from "@/lib/format";
import type { Community } from "@/lib/types";
import { Notices } from "@/components/Notices";
import { organizerUpdateCommunityAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function EditCommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["organizer"]);
  const token = await getToken();
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const err = typeof sp.err === "string" ? sp.err : undefined;

  let community: Community | null = null;
  try {
    const res = await apiFetch<{ community: Community }>("/api/v1/organizer/community", { token: token ?? undefined });
    community = res.community;
  } catch {
    community = null;
  }

  if (!community) {
    return <div className="notice notice-warn">Komunitasmu belum di-assign admin pusat.</div>;
  }

  const socials = community.socials ?? {};
  const logo = mediaUrl(community.logoKey);
  const banner = mediaUrl(community.bannerKey);

  return (
    <div className="container-narrow" style={{ padding: 0 }}>
      <Notices ok={ok} err={err} />
      <div className="card card-body">
        <h2 style={{ fontSize: 21 }}>Profil komunitas</h2>
        <p className="muted small">Perubahan langsung tampil di halaman publik.</p>

        <form action={organizerUpdateCommunityAction} encType="multipart/form-data" style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="name">Nama komunitas</label>
            <input id="name" name="name" type="text" defaultValue={community.name} required />
          </div>

          <div className="field">
            <label htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" type="text" defaultValue={community.tagline} placeholder="Satu kalimat singkat" />
          </div>

          <div className="field">
            <label htmlFor="description">Deskripsi</label>
            <textarea id="description" name="description" defaultValue={community.description} />
            <span className="hint">Ceritakan siapa anggotanya, apa yang biasa dilakukan, dan cara ikut.</span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="category">Kategori</label>
              <input id="category" name="category" type="text" defaultValue={community.category} placeholder="Olahraga, Desain, Teknologi…" />
            </div>
            <div className="field">
              <label htmlFor="city">Kota</label>
              <input id="city" name="city" type="text" defaultValue={community.city} placeholder="Jakarta" />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="instagram">Instagram</label>
              <input id="instagram" name="instagram" type="url" defaultValue={socials.instagram ?? ""} placeholder="https://instagram.com/…" />
            </div>
            <div className="field">
              <label htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" name="whatsapp" type="url" defaultValue={socials.whatsapp ?? ""} placeholder="https://wa.me/…" />
            </div>
            <div className="field">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="url" defaultValue={socials.website ?? ""} placeholder="https://…" />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="logo">Logo</label>
              {logo ? <img src={logo} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} /> : null}
              <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
              <label className="checkbox">
                <input type="checkbox" name="clearLogo" value="1" /> Hapus logo
              </label>
            </div>
            <div className="field">
              <label htmlFor="banner">Banner</label>
              {banner ? <img src={banner} alt="" style={{ width: "100%", maxWidth: 260, height: 64, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} /> : null}
              <input id="banner" name="banner" type="file" accept="image/jpeg,image/png,image/webp" />
              <label className="checkbox">
                <input type="checkbox" name="clearBanner" value="1" /> Hapus banner
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Simpan perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
