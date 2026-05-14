/**
 * StatCard — Bento-style stat card from the Living Ledger template.
 *
 * Props:
 *  icon: string — Material Symbol name (e.g. "layers", "assignment_late")
 *  label: string — metric label
 *  value: string|number — big display number
 *  orbColor: string — Tailwind bg class for ambient orb (e.g. "bg-primary-container/10")
 *  iconColor: string — Tailwind text class for icon (e.g. "text-primary")
 */
export function StatCard({
  icon = "analytics",
  label = "",
  value = 0,
  orbColor = "bg-primary-container/10",
  iconColor = "text-primary",
  className = "",
}) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-4 md:p-6 ghost-border ambient-shadow relative overflow-hidden group ${className}`}
    >
      {/* Ambient orb — scales on hover */}
      <div
        className={`absolute -right-6 -top-6 w-24 h-24 ${orbColor} rounded-full blur-xl group-hover:scale-150 transition-transform duration-500`}
      />

      {/* Icon badge */}
      <div className="relative z-10 mb-4">
        <div className={`inline-flex p-2 bg-surface-container-low rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>

      {/* Label + Value */}
      <div className="relative z-10">
        <p className="text-sm font-medium text-on-surface-variant mb-1">{label}</p>
        <h3 className="font-headline text-4xl font-extrabold text-on-surface leading-none">
          {value}
        </h3>
      </div>
    </div>
  );
}
