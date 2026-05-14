export function Input({
  id,
  label,
  error,
  className = "",
  containerClassName = "",
  ...props
}) {
  return (
    <div className={`space-y-2 ${containerClassName}`.trim()}>
      {label ? (
        <label htmlFor={id} className="font-label text-sm font-medium text-on-surface">
          {label}
        </label>
      ) : null}

      <input
        id={id}
        className={`w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 font-body text-sm text-on-surface transition-colors duration-200 ease-in-out placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`.trim()}
        {...props}
      />

      {error ? <p className="font-body text-sm text-error">{error}</p> : null}
    </div>
  );
}
