"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { OrgSelector } from "@/components/org/org-selector";

const links = [
  { href: "/", label: "Ask" },
  { href: "/ingest", label: "Upload" },
  { href: "/settings", label: "Settings" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight mr-4">
          Org Wiki
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <OrgSelector />
        </div>
      </div>
    </header>
  );
}
