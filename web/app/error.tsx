"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-narrow">
      <div className="page-head">
        <p className="eyebrow">Terjadi kesalahan</p>
        <h1>Ada yang tidak beres</h1>
        <p className="sub">
          Permintaanmu gagal diproses. Coba muat ulang halaman ini. Kalau masih gagal, kembali ke
          beranda dan coba lagi nanti.
        </p>
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Coba lagi
        </button>
        <Link href="/" className="btn">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
