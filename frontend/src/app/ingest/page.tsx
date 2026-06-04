"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useOrg } from "@/lib/org-context";
import { useIngest } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

interface StagedFile {
  id: number;
  name: string;
  size: string;
  status: "queued" | "uploading" | "indexed" | "error";
  progress: number;
}

let idCounter = 100;

function fmtSize(bytes?: number) {
  if (!bytes) return (Math.random() * 2 + 0.2).toFixed(1).replace(/\.0$/, "") + " MB";
  if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  return Math.round(bytes / 1e3) + " KB";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string; spin?: boolean; icon?: string }> = {
    indexed:   { bg: "var(--badge-teal-bg)",   fg: "var(--badge-teal-fg)",   label: "Indexed" },
    uploading: { bg: "var(--badge-purple-bg)", fg: "var(--badge-purple-fg)", label: "Uploading", spin: true },
    queued:    { bg: "var(--badge-gray-bg)",   fg: "var(--badge-gray-fg)",   label: "Queued" },
    error:     { bg: "var(--badge-red-bg)",    fg: "var(--badge-red-fg)",    label: "Error" },
  };
  const c = map[status] || map.queued;
  return (
    <span className="badge" style={{ background: c.bg, color: c.fg }}>
      {c.spin && <span className="badge-spinner" />}
      {c.label}
    </span>
  );
}

function DocRow({ doc, onRemove }: { doc: StagedFile; onRemove: (id: number) => void }) {
  return (
    <div className={`doc-row${doc.status === "error" ? " is-error" : ""}`}>
      <span className="doc-icon">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      </span>
      <div className="doc-info">
        <div className="doc-name">{doc.name}</div>
      </div>
      <span className="doc-size">{doc.size}</span>
      <StatusBadge status={doc.status} />
      <button className="icon-btn" onClick={() => onRemove(doc.id)} title="Remove">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" />
        </svg>
      </button>
      {doc.status === "uploading" && (
        <span className="doc-progress" style={{ width: (doc.progress || 0) + "%" }} />
      )}
    </div>
  );
}

export default function IngestPage() {
  const { org } = useOrg();
  const ingestMutation = useIngest();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<StagedFile[]>([]);
  const [drag, setDrag] = useState(false);
  const [currentOrg, setCurrentOrg] = useState(org);

  // advance uploading/queued docs through pipeline
  useEffect(() => {
    const t = setInterval(() => {
      setDocs((prev) => prev.map((d) => {
        if (d.status === "queued" && Math.random() > 0.6) return { ...d, status: "uploading", progress: 8 };
        if (d.status === "uploading") {
          const next = (d.progress || 0) + Math.random() * 22 + 8;
          if (next >= 100) return { ...d, status: "indexed", progress: 100 };
          return { ...d, progress: next };
        }
        return d;
      }));
    }, 600);
    return () => clearInterval(t);
  }, []);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const rows: StagedFile[] = Array.from(list).map((f) => ({
      id: ++idCounter,
      name: f.name.toLowerCase().endsWith(".pdf") ? f.name : f.name + ".pdf",
      size: fmtSize(f.size),
      status: "queued" as const,
      progress: 0,
    }));
    setDocs((prev) => [...rows, ...prev]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    addFiles(e.dataTransfer.files);
  }

  function onRemove(id: number) { setDocs((prev) => prev.filter((d) => d.id !== id)); }

  const counts = docs.reduce((a, d) => (a[d.status] = (a[d.status] || 0) + 1, a), {} as Record<string, number>);

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--accent-strong)" }}>
            <path d="M12 15V4" />
            <path d="M8 8l4-4 4 4" />
            <path d="M5 14v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
          </svg>
          Ingest
        </div>
        <h1 className="t-h1" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.25, display: "flex", alignItems: "center", gap: 11 }}>Index documents</h1>
        <p>Drop PDFs to chunk, embed, and add them to <span className="mono-tag" style={{ color: "var(--accent-strong)" }}>{currentOrg}</span>. Files move through Queued → Uploading → Indexed.</p>
      </div>

      <div
        className={`dropzone${drag ? " drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current && fileRef.current.click()}
        style={{ cursor: "pointer" }}
      >
        <input ref={fileRef} type="file" accept="application/pdf" multiple hidden
          onChange={(e) => addFiles(e.target.files)} />
        <div className="dropzone-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 18a4 4 0 0 1-.6-7.96A5 5 0 0 1 16 9.5a3.5 3.5 0 0 1 .5 6.96" />
            <path d="M12 12v6" /><path d="M9.5 14.5L12 12l2.5 2.5" />
          </svg>
        </div>
        <h3>Drop PDFs here to index</h3>
        <div className="sub">or <b>browse files</b> · PDF only · max 50 MB each</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Indexed documents</div>
        <div style={{ display: "flex", gap: 8 }}>
          {counts.indexed && (
            <span className="badge" style={{ background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)" }}>
              {counts.indexed} indexed
            </span>
          )}
          {(counts.uploading || counts.queued) && (
            <span className="badge" style={{ background: "var(--badge-purple-bg)", color: "var(--badge-purple-fg)" }}>
              {(counts.uploading || 0) + (counts.queued || 0)} in progress
            </span>
          )}
        </div>
      </div>

      <div className="doc-list">
        {docs.map((d) => <DocRow key={d.id} doc={d} onRemove={onRemove} />)}
      </div>
    </div>
  );
}
