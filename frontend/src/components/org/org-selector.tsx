"use client";

import { useState, useRef, useEffect } from "react";
import { useOrg } from "@/lib/org-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="gap-2">
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {org}
        </Badge>
        <span className="text-xs text-muted-foreground">Org</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover p-2 shadow-md z-50">
          <p className="text-xs font-medium text-muted-foreground px-1 mb-1">Recent orgs</p>
          {recentOrgs.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 mb-2">No recent orgs</p>
          )}
          <div className="flex flex-col gap-0.5 mb-2">
            {recentOrgs.map((r) => (
              <button
                key={r}
                onClick={() => handleSelect(r)}
                className="text-left px-2 py-1 rounded text-sm hover:bg-accent transition-colors"
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
            />
            <Button type="submit" size="sm" className="h-8 text-xs" disabled={!customOrg.trim()}>
              Set
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
