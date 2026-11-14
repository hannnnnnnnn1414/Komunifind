export function Notices({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <>
      {ok ? <div className="notice notice-ok">{ok}</div> : null}
      {err ? <div className="notice notice-err">{err}</div> : null}
    </>
  );
}
