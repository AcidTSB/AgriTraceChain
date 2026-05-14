export function OffsetPagination({
  page,
  totalPages,
  onPageChange,
  maxVisiblePages = 7,
  maxPageCount,
}) {
  const cappedTotalPages = Math.max(
    0,
    Math.min(totalPages ?? 0, Number.isFinite(maxPageCount) ? maxPageCount : Number.MAX_SAFE_INTEGER),
  );

  if (cappedTotalPages <= 1) {
    return null;
  }

  const current = Math.min(Math.max(page ?? 0, 0), cappedTotalPages - 1);
  const half = Math.floor(maxVisiblePages / 2);
  let start = Math.max(0, current - half);
  let end = Math.min(cappedTotalPages - 1, start + maxVisiblePages - 1);
  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(0, end - maxVisiblePages + 1);
  }

  const pages = [];
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  const go = (nextPage) => {
    if (nextPage < 0 || nextPage >= cappedTotalPages || nextPage === current) {
      return;
    }
    onPageChange?.(nextPage);
  };

  return (
    <nav className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => go(current - 1)}
        disabled={current === 0}
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-white px-3 text-sm text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        &lt;
      </button>

      {start > 0 && (
        <>
          <button
            type="button"
            onClick={() => go(0)}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-white px-3 text-sm text-on-surface"
          >
            1
          </button>
          {start > 1 && <span className="px-1 text-sm text-on-surface-variant">...</span>}
        </>
      )}

      {pages.map((index) => (
        <button
          key={index}
          type="button"
          onClick={() => go(index)}
          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition-colors ${
            index === current
              ? "border-primary bg-primary text-white"
              : "border-outline-variant/30 bg-white text-on-surface hover:border-primary/60"
          }`}
        >
          {index + 1}
        </button>
      ))}

      {end < cappedTotalPages - 1 && (
        <>
          {end < cappedTotalPages - 2 && <span className="px-1 text-sm text-on-surface-variant">...</span>}
          <button
            type="button"
            onClick={() => go(cappedTotalPages - 1)}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-white px-3 text-sm text-on-surface"
          >
            {cappedTotalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => go(current + 1)}
        disabled={current >= cappedTotalPages - 1}
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-white px-3 text-sm text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        &gt;
      </button>
    </nav>
  );
}
