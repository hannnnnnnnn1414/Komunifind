import Link from "next/link";
import { requireUser } from "@/lib/session";
import { organizerCreateEventAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireUser(["organizer"]);

  return (
    <div className="container-narrow" style={{ padding: 0 }}>
      <div className="card card-body">
        <h2 style={{ fontSize: 21 }}>Event baru</h2>
        <p className="muted small">
          Event disimpan sebagai draft dulu. Terbitkan saat sudah siap tampil di halaman publik.
        </p>

        <form action={organizerCreateEventAction} encType="multipart/form-data" style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="title">Judul event</label>
            <input id="title" name="title" type="text" required placeholder="Weekend Long Run 12K" />
          </div>

          <div className="field">
            <label htmlFor="description">Deskripsi</label>
            <textarea id="description" name="description" placeholder="Apa yang akan dilakukan, siapa yang cocok ikut, apa yang perlu dibawa." />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="startsAt">Mulai</label>
              <input id="startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div className="field">
              <label htmlFor="endsAt">Selesai (opsional)</label>
              <input id="endsAt" name="endsAt" type="datetime-local" />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="locationName">Nama lokasi</label>
              <input id="locationName" name="locationName" type="text" placeholder="GBK Senayan, Jakarta" />
            </div>
            <div className="field">
              <label htmlFor="locationUrl">Link peta (opsional)</label>
              <input id="locationUrl" name="locationUrl" type="url" placeholder="https://maps.google.com/…" />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="capacity">Kuota</label>
              <input id="capacity" name="capacity" type="number" min={1} placeholder="Kosongkan untuk tanpa batas" />
            </div>
            <div className="field">
              <label htmlFor="externalUrl">Link Instagram / info eksternal</label>
              <input id="externalUrl" name="externalUrl" type="url" placeholder="https://instagram.com/p/…" />
              <span className="hint">Kalau diisi, tombol kunjungan akan muncul di halaman event.</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="externalLabel">Label tombol eksternal</label>
            <input id="externalLabel" name="externalLabel" type="text" placeholder="Kunjungi Instagram" />
          </div>

          <div className="field">
            <label htmlFor="poster">Poster (opsional)</label>
            <input id="poster" name="poster" type="file" accept="image/jpeg,image/png,image/webp" />
          </div>

          <label className="checkbox">
            <input type="checkbox" name="publishNow" value="1" /> Langsung terbitkan setelah disimpan
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Simpan event
            </button>
            <Link href="/dashboard" className="btn btn-ghost">
              Batal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
