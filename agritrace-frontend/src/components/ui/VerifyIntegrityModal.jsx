import { useEffect, useRef, useState } from "react";

const SCAN_DELAY_MS = 420;

function truncateHash(value) {
  if (!value) return "N/A";
  if (value.length <= 20) return value;
  return `${value.slice(0, 10)}…${value.slice(-10)}`;
}

function truncateSig(value) {
  if (!value) return "N/A";
  if (value.length <= 32) return value;
  return `${value.slice(0, 16)}…${value.slice(-16)}`;
}

/**
 * VerifyIntegrityModal — terminal-style security audit animation.
 * States: idle → scanning (log-by-log terminal animation) → result
 */
export function VerifyIntegrityModal({ open, logs = [], onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | scanning | result
  const [scanned, setScanned] = useState([]);
  const [summary, setSummary] = useState(null);
  const terminalRef = useRef(null);
  const progressPercent = logs.length > 0 ? Math.round((scanned.length / logs.length) * 100) : 0;

  // Reset when closed
  useEffect(() => {
    if (!open) {
      const resetTimer = window.setTimeout(() => {
        setPhase("idle");
        setScanned([]);
        setSummary(null);
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }
  }, [open]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [scanned]);

  const startScan = () => {
    if (logs.length === 0) return;
    setPhase("scanning");
    setScanned([]);
    setSummary(null);

    let idx = 0;
    const interval = setInterval(() => {
      const log = logs[idx];
      setScanned((prev) => [
        ...prev,
        {
          id: log.id,
          action: log.action,
          hash: log.hashValue,
          sig: log.digitalSignature,
          status: log.integrityStatus,
          ts: new Date(log.timestamp).toISOString(),
        },
      ]);
      idx++;

      if (idx >= logs.length) {
        clearInterval(interval);
        const verified = logs.filter((l) => l.integrityStatus === "VERIFIED").length;
        const compromised = logs.filter((l) => l.integrityStatus === "COMPROMISED").length;
        const chainOk = compromised === 0;
        setSummary({ verified, compromised, total: logs.length, chainOk });
        setPhase("result");
      }
    }, SCAN_DELAY_MS);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-950 shadow-2xl ring-1 ring-slate-700">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-5 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <p className="ml-3 font-mono text-sm font-semibold text-slate-300">
            agritrace-chain-engine — security-audit
          </p>
        </div>

        {/* Terminal body */}
        <div
          ref={terminalRef}
          className="h-80 overflow-y-auto p-5 font-mono text-xs leading-6"
          style={{ background: "#0d1117" }}
        >
          {/* Initial prompt */}
          <p className="text-slate-500">
            <span className="text-emerald-400">$</span> agritrace audit --batch-logs {logs.length} --algo RSA-2048
          </p>
          <p className="text-slate-600">
            # AgriTrace Chain Engine v2.1.0 — Blockchain Integrity Auditor
          </p>
          <p className="mt-1 text-slate-600">
            # Hash algorithm: SHA-256 + RSA-2048 Digital Signature
          </p>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-500">
              <span>Chain scan</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {phase === "idle" && (
            <p className="mt-3 animate-pulse text-emerald-500">
              ▶ Nhấn "Bắt đầu quét" để chạy Security Audit...
            </p>
          )}

          {(phase === "scanning" || phase === "result") &&
            scanned.map((entry, i) => (
              <div key={entry.id ?? i} className="mt-2 border-t border-slate-800 pt-2">
                <p className="text-slate-400">
                  <span className="text-yellow-400">[{String(i + 1).padStart(2, "0")}]</span>{" "}
                  Verifying block:{" "}
                  <span className="text-cyan-300 font-bold">{entry.action}</span>
                </p>
                <p className="text-slate-500">
                  &nbsp;&nbsp;timestamp&nbsp;&nbsp;: {entry.ts}
                </p>
                <p className="text-slate-500">
                  &nbsp;&nbsp;hash &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:{" "}
                  <span className="text-purple-400">{truncateHash(entry.hash)}</span>
                </p>
                <p className="text-slate-500">
                  &nbsp;&nbsp;signature&nbsp;&nbsp;:{" "}
                  <span className="text-slate-400">{truncateSig(entry.sig)}</span>
                </p>
                <p>
                  &nbsp;&nbsp;result&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:{" "}
                  {entry.status === "VERIFIED" ? (
                    <span className="text-emerald-400 font-bold">✓ VERIFIED</span>
                  ) : entry.status === "COMPROMISED" ? (
                    <span className="text-red-400 font-bold">✗ COMPROMISED</span>
                  ) : (
                    <span className="text-slate-500">~ UNKNOWN</span>
                  )}
                </p>
              </div>
            ))}

          {phase === "scanning" && scanned.length < logs.length && (
            <p className="mt-2 animate-pulse text-emerald-500">
              ⠿ Scanning block {scanned.length + 1}/{logs.length}...
            </p>
          )}

          {phase === "result" && summary && (
            <div className="mt-4 border-t border-emerald-800 pt-3">
              <p className="text-emerald-400 font-bold">═══ AUDIT COMPLETE ═══</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Scanned</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100">{summary.total}</p>
                </div>
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-300">Verified</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-300">{summary.verified}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Integrity</p>
                  <p className={`mt-1 text-sm font-bold ${summary.chainOk ? "text-emerald-400" : "text-red-400"}`}>
                    {summary.chainOk ? "INTACT" : `${summary.compromised} compromised`}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-slate-300">
                Chain integrity&nbsp;&nbsp;: {" "}
                {summary.chainOk ? (
                  <span className="text-emerald-400">✓ INTACT — No tampering detected</span>
                ) : (
                  <span className="text-red-400">✗ BREACH — {summary.compromised} block(s) compromised</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Result summary banner */}
        {phase === "result" && summary && (
          <div
            className={`flex items-center gap-3 px-5 py-3 text-sm font-semibold ${
              summary.chainOk
                ? "bg-emerald-900/40 text-emerald-300 border-t border-emerald-800"
                : "bg-red-900/40 text-red-300 border-t border-red-800"
            }`}
          >
            <span className="text-lg">{summary.chainOk ? "🔒" : "🚨"}</span>
            <span>
              {summary.chainOk
                ? `Chuỗi toàn vẹn — ${summary.verified}/${summary.total} bản ghi đã xác thực RSA-2048`
                : `Phát hiện vi phạm — ${summary.compromised} bản ghi bị xâm phạm`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900 px-5 py-4">
          {phase === "idle" && (
            <button
              onClick={startScan}
              disabled={logs.length === 0}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🔍 Bắt đầu Security Audit
            </button>
          )}
          {phase === "scanning" && (
            <span className="animate-pulse text-sm text-emerald-400 font-mono">
              ⠿ Đang quét {scanned.length}/{logs.length}...
            </span>
          )}
          {phase === "result" && (
            <button
              onClick={startScan}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-all"
            >
              ↺ Quét lại
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
