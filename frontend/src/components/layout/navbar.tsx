"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgSelector } from "@/components/org/org-selector";

const tabs = [
  { href: "/", label: "Ask" },
  { href: "/ingest", label: "Ingest" },
  { href: "/settings", label: "Settings" },
];

function Logo({ size = 26 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size * 0.295,
        background: "linear-gradient(155deg, var(--purple-400) 0%, var(--accent) 48%, var(--purple-800) 100%)",
        display: "grid", placeItems: "center", position: "relative",
        boxShadow:
          "0 1px 0 color-mix(in oklch, white 30%, transparent) inset, " +
          "0 0 0 1px color-mix(in oklch, var(--purple-800) 55%, transparent), " +
          "0 6px 16px -6px var(--accent)",
        flex: "none",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.6 L20.5 7.2 L12 11.8 L3.5 7.2 Z" fill="white" stroke="white" strokeWidth="1.4" />
        <path d="M4 11.2 L12 15.5 L20 11.2" opacity="0.92" />
        <path d="M4 15 L12 19.3 L20 15" opacity="0.6" />
      </svg>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none" as const,
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "ask":
      return <svg {...props}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M18.5 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" /></svg>;
    case "ingest":
      return <svg {...props}><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M5 14v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></svg>;
    case "settings":
      return <svg {...props}><path d="M4 7h11" /><path d="M19 7h1" /><circle cx="17" cy="7" r="2" /><path d="M4 17h6" /><path d="M14 17h6" /><circle cx="12" cy="17" r="2" /></svg>;
    default:
      return null;
  }
}

export function Navbar() {
  const pathname = usePathname();

  const page = pathname === "/" ? "/" : pathname;

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand no-underline">
          <Logo size={26} />
          <span>Org Wiki</span>
        </Link>
        <div className="nav-tabs" role="tablist">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`nav-tab${page === t.href ? " active" : ""}`}
              aria-selected={page === t.href}
            >
              <NavIcon name={t.label.toLowerCase()} />
              {t.label}
            </Link>
          ))}
        </div>
        <div className="nav-spacer" />
        <OrgSelector />
      </div>
    </nav>
  );
}
