import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number): string => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") query.set(key, value);
    }
    query.set("page", String(target));
    return `${basePath}?${query.toString()}`;
  };

  return (
    <div className="row mt-24">
      {page > 1 ? (
        <Link className="btn btn-sm" href={href(page - 1)}>
          Sebelumnya
        </Link>
      ) : null}
      <span className="muted small">
        Halaman {page} dari {totalPages}
      </span>
      {page < totalPages ? (
        <Link className="btn btn-sm" href={href(page + 1)}>
          Berikutnya
        </Link>
      ) : null}
    </div>
  );
}
