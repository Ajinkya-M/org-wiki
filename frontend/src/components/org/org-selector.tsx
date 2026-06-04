"use client";

import { useState, useRef, useEffect } from "react";
import { useOrg } from "@/lib/org-context";
import { Input } from "@/components/ui/input";

export function OrgSelector() {
  const { org, setOrg, recentOrgs } = useOrg();
  const [open, setOpen] = useState(false);
  const [customOrg, setCustomOrg] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(value: string) {
    setOrg(value);
    setOpen(false);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (customOrg.trim()) {
      handleSelect(customOrg.trim());
      setCustomOrg("");
    }
  }

  return (
    <div ref={ref} className="relative" style={{ zIndex: 50 }}>
      <button className="org-select" onClick={() => setOpen(!open)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="org-icon">
          <rect x="4" y="4" width="7" height="7" rx="1.2" />
          <rect x="13" y="4" width="7" height="7" rx="1.2" />
          <rect x="4" y="13" width="7" height="7" rx="1.2" />
          <rect x="13" y="13" width="7" height="7" rx="1.2" />
        </svg>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{org}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="org-dot" title="Backend online" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover p-2 shadow-md"
          style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", borderRadius: "12px" }}>
          <p className="text-xs font-medium px-1 mb-1" style={{ color: "var(--text-3)" }}>Recent orgs</p>
          {recentOrgs.length === 0 && (
            <p className="text-xs px-1 mb-2" style={{ color: "var(--text-3)" }}>No recent orgs</p>
          )}
          <div className="flex flex-col gap-0.5 mb-2">
            {recentOrgs.map((r) => (
              <button
                key={r}
                onClick={() => handleSelect(r)}
                className="text-left px-2 py-1.5 rounded text-sm transition-colors"
                style={{ color: "var(--text-2)" }}
                onMouseOver={(e) => e.currentTarget.style.background = "var(--surface-2)"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomSubmit} className="flex gap-1">
            <Input
              placeholder="Custom org..."
              value={customOrg}
              onChange={(e) => setCustomOrg(e.target.value)}
              className="h-8 text-xs"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-2)" }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!customOrg.trim()}>
              Set
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
