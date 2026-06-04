"use client";

export function QueryEmptyState() {
  return (
    <div className="card" style={{ padding: "64px 24px", textAlign: "center" }}>
      <div className="dropzone-icon" style={{ width: 48, height: 48 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 500, margin: "16px 0 6px" }}>Ask a question</h3>
      <p style={{ color: "var(--text-3)", fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
        Type a question above to search your organisation&apos;s documents. Answers include cited sources so you can verify the information.
      </p>
    </div>
  );
}
