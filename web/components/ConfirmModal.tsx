"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Ya",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="muted">{message}</p>
        <div className="row mt-16" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-sm" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
