"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "./AuthProvider";
import { StatusDot } from "./ui";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/register", label: "Register" },
  { href: "/login", label: "Login Lab" },
  { href: "/dashboard", label: "Vault" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-void/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" id="nav-logo" className="group flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="grid h-9 w-9 place-items-center rounded-lg border border-neon/40 bg-neon/10 shadow-neon"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-neon" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              <circle cx="12" cy="15.5" r="1.5" fill="currentColor" />
            </svg>
          </motion.div>
          <div className="leading-tight">
            <p className="font-mono text-sm font-bold tracking-[0.2em] text-white">SECURE//VAULT</p>
            <p className="font-mono text-[10px] tracking-[0.25em] text-muted">CRYPTO · WEBSEC LAB</p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                id={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`relative rounded-md px-3 py-2 font-mono text-xs tracking-widest uppercase transition-colors ${
                  active ? "text-neon" : "text-muted hover:text-text"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md border border-neon/30 bg-neon/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-md border border-edge bg-panel/60 px-3 py-1.5 sm:flex">
                <StatusDot tone={user.role === "admin" ? "danger" : "safe"} />
                <span className="font-mono text-xs text-text">{user.username}</span>
                <span className="font-mono text-[10px] text-muted uppercase">[{user.role}]</span>
              </div>
              <button
                id="nav-logout"
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
                className="rounded-md border border-edge px-3 py-1.5 font-mono text-xs tracking-widest text-muted uppercase transition-colors hover:border-danger/50 hover:text-danger"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted uppercase">
              <StatusDot tone="neon" /> offline · localhost
            </div>
          )}
        </div>
      </nav>
      {/* mobile nav */}
      <div className="flex justify-center gap-1 border-t border-edge/50 px-2 py-1.5 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase ${
              pathname === l.href ? "bg-neon/10 text-neon" : "text-muted"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
