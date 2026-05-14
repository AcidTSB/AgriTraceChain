/**
 * Card — Living Ledger design system
 *
 * Follows the "No-Line Rule": boundaries defined by background color shifts,
 * not 1px solid borders. Uses ghost-border (20% opacity) only for definition.
 *
 * Props:
 *  - accent: boolean → adds a 4px left primary bar (Provenance card style)
 *  - shadow: boolean (default true) → ambient-shadow
 *  - className: string
 */
export function Card({ className = "", accent = false, shadow = true, children }) {
  return (
    <section
      className={[
        "relative rounded-xl bg-surface-container-lowest p-4 md:p-6 overflow-hidden",
        "ghost-border",
        shadow ? "ambient-shadow" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {accent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
      )}
      {children}
    </section>
  );
}
