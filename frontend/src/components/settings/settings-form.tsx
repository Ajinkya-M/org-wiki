"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { TestConnectionButton } from "@/components/settings/test-connection-button";

const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function SettingsForm() {
  const { settings, update } = useSettings();
  const [local, setLocal] = useState(settings);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    update(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--accent-strong)" }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </div>
        <h1 className="t-h1" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.25, display: "flex", alignItems: "center", gap: 11 }}>Configuration</h1>
        <p>Connection and retrieval parameters. Saved to this browser.</p>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 560 }}>
        <div className="settings-form">
          <div className="field">
            <label>API base URL</label>
            <span className="help">Points to your FastAPI backend. Configured via <span className="mono-tag">NEXT_PUBLIC_API_BASE_URL</span>.</span>
            <input className="input mono" value={backendUrl} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
          </div>

          <div className="field">
            <label>Default org</label>
            <span className="help">Scopes all queries and ingestion. Saved to localStorage.</span>
            <input
              className="input mono"
              value={local.defaultOrg}
              onChange={(e) => setLocal({ ...local, defaultOrg: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Top-K results <span className="opt">(1–20)</span></label>
            <span className="help">How many source chunks to retrieve per query.</span>
            <input
              className="input num"
              type="number"
              min={1}
              max={20}
              value={local.topK}
              onChange={(e) => setLocal({ ...local, topK: Math.max(1, Math.min(20, +e.target.value || 1)) })}
            />
          </div>

          <div className="field">
            <label>Match threshold</label>
            <span className="help">Minimum cosine similarity to surface a chunk. Lower = broader results.</span>
            <div className="range-wrap">
              <input
                className="range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={local.matchThreshold}
                onChange={(e) => setLocal({ ...local, matchThreshold: +e.target.value })}
              />
              <span className="range-val">{local.matchThreshold.toFixed(2)}</span>
            </div>
          </div>

          <div className="settings-actions">
            <TestConnectionButton />
            <span style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleSave}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{saved ? "Saved" : "Save settings"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
