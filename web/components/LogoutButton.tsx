"use client";

import { useState } from "react";
import { logoutAction } from "@/app/actions";
import { ConfirmModal } from "./ConfirmModal";

export function LogoutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Keluar
      </button>
      <ConfirmModal
        open={open}
        title="Keluar dari Komunifind?"
        message="Sesi login di perangkat ini akan diakhiri. Kamu bisa masuk lagi kapan saja."
        confirmLabel="Ya, keluar"
        cancelLabel="Batal"
        onCancel={() => setOpen(false)}
        onConfirm={() => logoutAction()}
      />
    </>
  );
}
