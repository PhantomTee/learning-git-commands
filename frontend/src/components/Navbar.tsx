"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createWriteClient } from "@/lib/genlayer";

export default function Navbar() {
  const [address, setAddress] = useState<string | null>(null);

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
    await client.connect("testnetBradbury").catch(() => {});
  }

  return (
    <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold tracking-tight text-amber-400">
        ⚔ ChainTales
      </Link>

      <div className="flex items-center gap-6 text-sm">
        <Link href="/" className="hover:text-amber-400 transition-colors">
          World Map
        </Link>
        <Link href="/chapter/create" className="hover:text-amber-400 transition-colors">
          Create Chapter
        </Link>
        <Link href="/character" className="hover:text-amber-400 transition-colors">
          My Character
        </Link>

        {address ? (
          <span className="font-mono text-xs bg-gray-800 px-3 py-1 rounded-full text-green-400">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
        ) : (
          <button
            onClick={connect}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
