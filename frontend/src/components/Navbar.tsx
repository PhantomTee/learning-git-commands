"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createWriteClient } from "@/lib/genlayer";
import { useToast } from "@/components/Toast";
import { useNotifications } from "@/hooks/useNotifications";

const STUDIONET_CHAIN_ID = "0xf22f"; // 61999

const STUDIONET_PARAMS = {
  chainId: STUDIONET_CHAIN_ID,
  chainName: "Genlayer Studio Network",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
};

export default function Navbar() {
  const [address, setAddress]       = useState<string | null>(null);
  const [wrongNetwork, setWrong]    = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [switching, setSwitching]   = useState(false);
  const { info, error: toastErr } = useToast();
  const { count: notifCount, items: notifItems, markAllRead } = useNotifications(address);

  // ── Switch / add the Genlayer studionet in MetaMask ──────────────────────
  const switchNetwork = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    setSwitching(true);
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET_CHAIN_ID }],
      });
      setWrong(false);
      info("Network switched", "You're now on Genlayer studionet.");
    } catch (err: any) {
      // 4902 = chain not yet added to MetaMask
      if (err?.code === 4902 || err?.code === -32603) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [STUDIONET_PARAMS],
          });
          setWrong(false);
          info("Network added", "Genlayer studionet added to MetaMask.");
        } catch {
          toastErr("Cancelled", "Please add Genlayer studionet manually in MetaMask.");
        }
      } else {
        toastErr("Cancelled", "Network switch was rejected.");
      }
    } finally {
      setSwitching(false);
    }
  }, [info, toastErr]);

  // ── On mount: read accounts + track chain changes ─────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs[0]) setAddress(accs[0]);
    });

    function onChainChanged(chainId: string) {
      setWrong(chainId.toLowerCase() !== STUDIONET_CHAIN_ID);
    }

    eth.request({ method: "eth_chainId" }).then(onChainChanged);
    eth.on?.("chainChanged", onChainChanged);
    return () => eth.removeListener?.("chainChanged", onChainChanged);
  }, []);

  // ── Lock scroll when mobile menu is open ─────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // ── Connect wallet ────────────────────────────────────────────────────────
  async function connect() {
    const eth = (window as any).ethereum;
    if (!eth) return alert("Install MetaMask to play ChainTales");

    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setAddress(accounts[0]);

    // Auto-switch to studionet on connect if on wrong chain
    const chainId: string = await eth.request({ method: "eth_chainId" });
    if (chainId.toLowerCase() !== STUDIONET_CHAIN_ID) {
      await switchNetwork();
    }

    const client = createWriteClient(accounts[0] as `0x${string}`);
    await client.connect("studionet").catch(() => {});
    setMenuOpen(false);
  }

  function close() { setMenuOpen(false); }

  // ── Wallet display ─────────────────────────────────────────────────────────
  const WalletBadge = () => {
    if (!address) return null;
    if (wrongNetwork) {
      return (
        <button
          onClick={switchNetwork}
          disabled={switching}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-800/60 hover:border-red-600 transition-colors text-xs font-display tracking-wider"
          style={{ background: "rgba(220,38,38,0.1)", color: "#f87171" }}
        >
          {switching ? "Switching…" : "Switch to Genlayer"}
        </button>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-900/50"
        style={{ background: "rgba(0,0,0,0.4)" }}>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-xs text-green-400">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* ── Fixed navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-amber-900/40"
        style={{ background: "linear-gradient(180deg,#1a0f12 0%,#120d10 100%)" }}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group" onClick={close}>
            <span className="font-display font-black text-lg sm:text-xl tracking-widest text-amber-400 group-hover:text-amber-300 transition-colors">
              CHAINTALES
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { href: "/",               label: "World Map"      },
              { href: "/marketplace",   label: "Marketplace"    },
              { href: "/chapter/create",label: "Create Chapter" },
              { href: "/leaderboard",   label: "Leaderboard"   },
              { href: "/character",     label: "My Character"  },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className="text-amber-200/70 hover:text-amber-300 transition-colors uppercase text-xs tracking-widest font-display">
                {label}
              </Link>
            ))}

            {address && (
              <button
                onClick={markAllRead}
                title={notifCount > 0 ? `${notifCount} new attempt${notifCount > 1 ? "s" : ""} on your chapters` : "No new notifications"}
                className="relative text-amber-200/60 hover:text-amber-300 transition-colors px-2 py-1 rounded text-xs font-display tracking-wider"
              >
                Notifs
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>
            )}

            {address ? (
              <WalletBadge />
            ) : (
              <button onClick={connect} className="btn-gold px-4 py-1.5 rounded-lg text-xs">
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile: wallet chip + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            {address && <WalletBadge />}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-amber-900/40 hover:border-amber-500/50 transition-colors"
              style={{ background: "rgba(0,0,0,0.4)" }}
            >
              <span className={`block w-5 h-0.5 bg-amber-400 transition-all duration-300 origin-center ${menuOpen ? "rotate-45 translate-y-2"  : ""}`} />
              <span className={`block w-5 h-0.5 bg-amber-400 transition-all duration-300              ${menuOpen ? "opacity-0 scale-x-0"       : ""}`} />
              <span className={`block w-5 h-0.5 bg-amber-400 transition-all duration-300 origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent" />
      </nav>

      {/* ── Full-screen mobile overlay ── */}
      <div
        className={`fixed inset-0 z-[60] md:hidden flex flex-col transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(8,5,10,0.97)", backdropFilter: "blur(16px)" }}
      >
        {/* Overlay header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/30">
          <Link href="/" onClick={close}
            className="font-display font-black text-lg tracking-widest text-amber-400">
            CHAINTALES
          </Link>
          <button onClick={close} aria-label="Close menu"
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-amber-900/50 text-amber-400 hover:text-amber-200 hover:border-amber-500/70 transition-colors text-xl"
            style={{ background: "rgba(0,0,0,0.5)" }}>
            ✕
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
          <p className="font-display text-xs tracking-[0.3em] text-amber-900/60 uppercase mb-4">Navigation</p>

          {[
            { href: "/",               label: "World Map"      },
            { href: "/marketplace",    label: "Marketplace"    },
            { href: "/chapter/create", label: "Create Chapter" },
            { href: "/leaderboard",    label: "Leaderboard"    },
            { href: "/character",      label: "My Character"   },
          ].map(({ href, label }) => (
            <Link key={href} href={href} onClick={close}
              className="w-full max-w-xs flex items-center gap-4 px-6 py-4 rounded-xl font-display tracking-widest uppercase text-sm text-amber-300 hover:text-amber-200 transition-colors"
              style={{ border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.04)" }}>
              {label}
            </Link>
          ))}

          {address && notifCount > 0 && (
            <button
              onClick={() => { markAllRead(); close(); }}
              className="w-full max-w-xs flex items-center justify-between px-6 py-3 rounded-xl font-display text-sm mt-2"
              style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#f87171" }}
            >
              <span>{notifCount} new attempt{notifCount > 1 ? "s" : ""} on your chapters</span>
              <span className="text-xs opacity-60">Dismiss</span>
            </button>
          )}

          {!address ? (
            <button onClick={connect}
              className="btn-gold w-full max-w-xs py-4 rounded-xl text-sm font-display tracking-wider mt-4">
              Connect Wallet
            </button>
          ) : wrongNetwork ? (
            <button onClick={switchNetwork} disabled={switching}
              className="w-full max-w-xs py-4 rounded-xl text-sm font-display tracking-wider mt-4 border border-red-800/60"
              style={{ background: "rgba(220,38,38,0.1)", color: "#f87171" }}>
              {switching ? "Switching…" : "Switch to Genlayer"}
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-green-900/50"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-xs text-green-400">{address.slice(0, 8)}…{address.slice(-6)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
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
