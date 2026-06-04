"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createWriteClient } from "@/lib/genlayer";

export default function Navbar() {
  const [address, setAddress] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) setAddress(accounts[0]);
    });
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  async function connect() {
    const eth = (window as any).ethereum;
    if (!eth) return alert("Install MetaMask to play ChainTales");
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setAddress(accounts[0]);
    const client = createWriteClient(accounts[0] as `0x${string}`);
    await client.connect("studionet").catch(() => {});
    setMenuOpen(false);
  }

  return (
    <>
      {/* ── Fixed navbar bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-amber-900/40"
        style={{ background: "linear-gradient(180deg, #1a0f12 0%, #120d10 100%)" }}>
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group" onClick={() => setMenuOpen(false)}>
            <span className="font-display font-black text-lg sm:text-xl tracking-widest text-amber-400 group-hover:text-amber-300 transition-colors">
              CHAINTALES
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-amber-200/70 hover:text-amber-300 transition-colors uppercase text-xs tracking-widest font-display">
              World Map
            </Link>
            <Link href="/chapter/create" className="text-amber-200/70 hover:text-amber-300 transition-colors uppercase text-xs tracking-widest font-display">
              Create Chapter
            </Link>
            <Link href="/character" className="text-amber-200/70 hover:text-amber-300 transition-colors uppercase text-xs tracking-widest font-display">
              My Character
            </Link>

            {address ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-900/50"
                style={{ background: "rgba(0,0,0,0.4)" }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-mono text-xs text-green-400">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              </div>
            ) : (
              <button onClick={connect} className="btn-gold px-4 py-1.5 rounded-lg text-xs">
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile: wallet chip + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            {address && (
              <span className="font-mono text-xs text-green-400 bg-black/40 px-2 py-1 rounded-full border border-green-900/50">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-amber-900/40 hover:border-amber-500/50 transition-colors"
              style={{ background: "rgba(0,0,0,0.4)" }}
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-amber-400 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-5 h-0.5 bg-amber-400 transition-all duration-300 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-amber-400 transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent" />
      </nav>

      {/* ── Full-screen mobile overlay ── */}
      <div
        className={`fixed inset-0 z-40 md:hidden flex flex-col transition-all duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(8,5,10,0.97)", backdropFilter: "blur(12px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}
      >
        {/* Decorative top gold line */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mt-14" />

        {/* Menu content — centred vertically */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8">
          {/* Decorative title */}
          <p className="font-display text-xs tracking-[0.3em] text-amber-900/60 uppercase mb-6">
            Navigation
          </p>

          {[
            { href: "/", label: "World Map", icon: "🗺️" },
            { href: "/chapter/create", label: "Create Chapter", icon: "📜" },
            { href: "/character", label: "My Character", icon: "🧙" },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="w-full max-w-xs flex items-center gap-4 px-6 py-4 rounded-xl font-display tracking-widest uppercase text-sm text-amber-300 hover:text-amber-200 transition-colors"
              style={{ border: "1px solid rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.04)" }}
            >
              <span className="text-xl w-8 text-center">{icon}</span>
              {label}
            </Link>
          ))}

          {!address ? (
            <button
              onClick={connect}
              className="btn-gold w-full max-w-xs py-4 rounded-xl text-sm font-display tracking-wider mt-4"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-green-900/50"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-xs text-green-400">{address.slice(0, 8)}…{address.slice(-6)}</span>
            </div>
          )}
        </div>

        {/* Bottom decoration */}
        <div className="pb-8 text-center">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-900/30 to-transparent mb-4" />
          <p className="font-display text-xs tracking-widest text-amber-900/40 uppercase">
            ChainTales · Genlayer
          </p>
        </div>
      </div>
    </>
  );
}
