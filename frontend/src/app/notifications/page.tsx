"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const [address, setAddress] = useState<string | null>(null);
  const { count, items, markAllRead } = useNotifications(address);

  const loadAccount = useCallback(async () => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;
    const accounts = await eth.request({ method: "eth_accounts" });
    setAddress(accounts?.[0] ?? null);
  }, []);

  async function connectWallet() {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setAddress(accounts?.[0] ?? null);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    loadAccount();

    function onAccountsChanged(accounts: string[]) {
      setAddress(accounts?.[0] ?? null);
    }

    eth.on?.("accountsChanged", onAccountsChanged);
    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [loadAccount]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-widest"
          style={{ background: "linear-gradient(180deg,#fcd34d 0%,#f59e0b 60%,#d97706 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          NOTIFICATIONS
        </h1>
        <p className="text-amber-200/50 text-sm font-display tracking-wide">
          Chapter activity, leader changes, and claim updates
        </p>
      </div>

      <div className="gold-divider" />

      {!address ? (
        <div className="panel text-center py-16 px-6 space-y-5">
          <p className="font-display text-amber-400/70 tracking-widest text-sm uppercase">
            Connect your wallet to view notifications.
          </p>
          <button onClick={connectWallet} className="btn-gold px-5 py-2 rounded-lg text-xs">
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm text-amber-400 tracking-widest uppercase">Inbox</p>
              <p className="font-mono text-xs text-amber-200/50 mt-1">
                {address.slice(0, 8)}...{address.slice(-6)}
              </p>
            </div>
            <button
              onClick={markAllRead}
              disabled={items.length === 0 || count === 0}
              className="btn-stone px-4 py-2 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mark all as read
            </button>
          </div>

          {items.length === 0 ? (
            <div className="panel text-center py-16 px-6">
              <p className="font-display text-amber-400/60 tracking-widest text-sm uppercase">
                No notifications yet. You&apos;ll see chapter activity, leader changes, and claim updates here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const card = (
                  <div className="panel panel-hover p-4 space-y-2"
                    style={item.unread
                      ? { border: "1px solid rgba(245,158,11,0.42)", background: "rgba(245,158,11,0.07)" }
                      : { border: "1px solid rgba(120,113,108,0.24)", background: "rgba(0,0,0,0.18)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display font-bold text-sm text-amber-300 tracking-wide">
                        {item.title}
                      </h2>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-display uppercase tracking-widest ${
                        item.unread ? "text-red-200 bg-red-500/20" : "text-amber-200/40 bg-stone-900/60"
                      }`}>
                        {item.unread ? "Unread" : "Read"}
                      </span>
                    </div>
                    <p className="text-sm text-amber-200/65 leading-relaxed">{item.message}</p>
                    {item.chapterId !== undefined && (
                      <p className="text-xs text-amber-500/70 font-display tracking-widest uppercase">
                        View chapter
                      </p>
                    )}
                  </div>
                );

                return item.chapterId !== undefined ? (
                  <Link key={item.id} href={`/chapter/${item.chapterId}`} className="block">
                    {card}
                  </Link>
                ) : (
                  <div key={item.id}>{card}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
