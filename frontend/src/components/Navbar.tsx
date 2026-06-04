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
    <nav className="relative z-50 border-b border-amber-900/40"
      style={{ background: "linear-gradient(180deg, #1a0f12 0%, #120d10 100%)" }}>
      {/* Top gold line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setMenuOpen(false)}>
          <span className="text-2xl">⚔️</span>
          <span className="font-display font-black text-lg sm:text-xl tracking-widest text-amber-400 group-hover:text-amber-300 transition-colors">
            CHAINTALES
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-display tracking-wider">
          <Link href="/" className="text-amber-200/70 hover:text-amber-300 transition-colors uppercase text-xs tracking-widest">
            World Map
          </Link>
          <Link href="/chapter/create" className="text-amber-200/70 hover:text-amber-300 transition-colors uppercase text-xs tracking-widest">
            Create Chapter
          </Link>
          <Link href="/character" className="text-amber-200/70 hover:text-amber-300 transition-colors uppercase text-xs tracking-widest">
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

        {/* Mobile: wallet + hamburger */}
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
            <span className={`block w-5 h-0.5 bg-amber-400 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-amber-400 transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-amber-400 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-amber-900/40 px-4 py-4 flex flex-col gap-3"
          style={{ background: "linear-gradient(180deg, #1a0f12 0%, #120d10 100%)" }}>
          <Link href="/" onClick={() => setMenuOpen(false)}
            className="text-amber-200/70 hover:text-amber-300 uppercase text-xs tracking-widest py-2 border-b border-amber-900/20">
            ⚔ World Map
          </Link>
          <Link href="/chapter/create" onClick={() => setMenuOpen(false)}
            className="text-amber-200/70 hover:text-amber-300 uppercase text-xs tracking-widest py-2 border-b border-amber-900/20">
            📜 Create Chapter
          </Link>
          <Link href="/character" onClick={() => setMenuOpen(false)}
            className="text-amber-200/70 hover:text-amber-300 uppercase text-xs tracking-widest py-2 border-b border-amber-900/20">
            🧙 My Character
          </Link>
          {!address && (
            <button onClick={connect} className="btn-gold w-full py-2.5 rounded-lg text-sm mt-1">
              Connect Wallet
            </button>
          )}
        </div>
      )}

      <div className="h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent" />
    </nav>
  );
}
