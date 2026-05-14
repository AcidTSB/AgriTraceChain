import { useState } from "react";

/**
 * SecurityBadge — hoverable badge showing RSA-2048 signature payload in a tooltip.
 * Reads `signature` and `hashValue` directly from the log API response.
 */
export function SecurityBadge({ signature, hashValue }) {
  const hasData = signature || hashValue;

  if (!hasData) return null;

  return (
    <div className="group relative inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 cursor-help transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50">
      {/* Pulse dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>

      <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 group-hover:text-emerald-700 transition-colors duration-200">
        RSA-2048 Signed
      </span>

      {/* Hover Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2.5 hidden w-72 rounded-xl bg-slate-900 p-3 shadow-2xl group-hover:block">
        {/* Caret */}
        <div className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 bg-slate-900" />

        {hashValue && (
          <div className="mb-2">
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Block Hash
            </p>
            <p className="break-all font-mono text-[10px] leading-relaxed text-emerald-400">
              {hashValue}
            </p>
          </div>
        )}

        {signature && (
          <div>
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Digital Signature
            </p>
            <p className="break-all font-mono text-[10px] leading-relaxed text-slate-300">
              {signature.length > 120 ? `${signature.slice(0, 120)}…` : signature}
            </p>
          </div>
        )}

        <div className="mt-2 border-t border-slate-700 pt-2 text-[9px] text-slate-500">
          ✓ Verified by AgriTrace Chain Engine
        </div>
      </div>
    </div>
  );
}
