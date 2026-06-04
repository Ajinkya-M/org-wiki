"use client";

import { useState, useRef } from "react";

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; ms: number }
  | { state: "error"; detail: string };

export function TestConnectionButton() {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const loadingRef = useRef(false);

  async function handleTest() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus({ state: "loading" });
    const t0 = performance.now();
    try {
      const res = await fetch("/api/health");
      const ms = Math.round(performance.now() - t0);
      if (res.ok) {
        setStatus({ state: "ok", ms });
      } else {
        setStatus({ state: "error", detail: `HTTP ${res.status}` });
      }
    } catch (err) {
      setStatus({
        state: "error",
        detail: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      loadingRef.current = false;
    }
  }

  return (
    <>
      <button
        className="btn btn-secondary"
        onClick={handleTest}
        disabled={status.state === "loading"}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2h4v4h-4z" />
          <path d="M2 10h4v4H2z" />
          <path d="M18 10h4v4h-4z" />
          <path d="M10 18h4v4h-4z" />
        </svg>
        <span>Test connection</span>
      </button>

      {status.state === "loading" && (
        <span className="conn-status testing">
          <span className="dot" /> Testing&hellip;
        </span>
      )}
      {status.state === "ok" && (
        <span className="conn-status">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Backend online &middot; {status.ms}ms
        </span>
      )}
      {status.state === "error" && (
        <span className="conn-status" style={{ color: "var(--badge-red-fg)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6" /><path d="M9 9l6 6" />
          </svg>
          Backend unreachable &mdash; {status.detail}
        </span>
      )}
    </>
  );
}
