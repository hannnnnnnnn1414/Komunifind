import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-narrow">
      <div className="page-head">
        <p className="eyebrow">404</p>
        <h1>Halaman tidak ditemukan</h1>
        <p className="sub">Komunitas atau event yang kamu cari mungkin sudah dihapus atau belum terbit.</p>
      </div>
      <Link href="/" className="btn btn-primary">
        Kembali ke jelajah
      </Link>
    </div>
  );
}
