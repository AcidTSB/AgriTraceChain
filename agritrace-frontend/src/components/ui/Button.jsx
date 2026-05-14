export function Button({
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
  children,
  ...props
}) {
  const baseClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-label text-sm font-semibold transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const variantClass = {
    // Living Ledger gradient primary — template spec
    primary: "btn-primary-gradient text-white hover:opacity-90 shadow-sm",
    // Secondary: surface-container-high, no border, muted text
    secondary: "bg-surface-container-high text-on-surface hover:bg-surface-dim",
    // Ghost: transparent, on-surface-variant text
    ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container-low",
    // Danger: error color
    danger: "bg-error text-on-error hover:opacity-90 shadow-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClass} ${variantClass[variant] ?? variantClass.primary} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
