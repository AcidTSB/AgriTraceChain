import { Link } from "react-router-dom";

/**
 * PageHeader — Shared editorial page header matching the Living Ledger template.
 *
 * Props:
 *  title: string — big h2 headline (Manrope, extrabold, 4xl)
 *  subtitle: string — optional body text below title
 *  breadcrumbs: Array<{ label: string, to?: string }> — e.g. [{label:"Batches",to:"/farmer/batches"},{label:"Detail"}]
 *  rightSlot: ReactNode — date chip, action buttons, etc.
 */
export function PageHeader({ title, subtitle, breadcrumbs = [], rightSlot }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-10">
      <div>
        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-2">
                {idx > 0 && (
                  <span className="material-symbols-outlined text-outline-variant text-[16px]">
                    chevron_right
                  </span>
                )}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="font-body text-sm text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-body text-sm font-medium text-primary">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight text-on-surface">
          {title}
        </h2>

        {/* Subtitle */}
        {subtitle && (
          <p className="font-body text-on-surface-variant mt-1 max-w-xl">{subtitle}</p>
        )}
      </div>

      {/* Right slot */}
      {rightSlot && (
        <div className="shrink-0 w-full sm:w-auto">{rightSlot}</div>
      )}
    </div>
  );
}
