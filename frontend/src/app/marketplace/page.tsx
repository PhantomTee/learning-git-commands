"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getAllNfts,
  getCreatorNft,
  getNftSupply,
  mintCreatorNft,
  createWriteClient,
  waitForResult,
  formatGEN,
  explorerTxUrl,
  normaliseError,
  NftItem,
  NFT_MINT_PRICE,
} from "@/lib/genlayer";
import CreatorNftImage from "@/components/CreatorNftImage";
import { useToast } from "@/components/Toast";
import { useCharacterGate } from "@/hooks/useCharacterGate";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { signActivity } from "@/lib/sign-activity";

const MAX_SUPPLY = 100;

export default function MarketplacePage() {
  const [address, setAddress]       = useState<string | null>(null);
  const [nfts, setNfts]             = useState<NftItem[]>([]);
  const [supply, setSupply]         = useState(0);
  const [myTokenId, setMyTokenId]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);

  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();
  const { requireCharacter } = useCharacterGate();
  const recordActivity = useMutation(api.world.recordActivity);

  const loadData = useCallback(async (addr: string | null) => {
    try {
      const [allNfts, sup] = await Promise.all([getAllNfts(), getNftSupply()]);
      setNfts(allNfts);
      setSupply(sup);
      if (addr) {
        const tid = await getCreatorNft(addr);
        setMyTokenId(tid);
      }
    } catch { /* RPC unavailable */ }
  }, []);

  useEffect(() => {
    async function init() {
      const eth = (window as any).ethereum;
      let addr: string | null = null;
      if (eth) {
        const accounts = await eth.request({ method: "eth_accounts" });
        if (accounts[0]) { addr = accounts[0]; setAddress(accounts[0]); }
      }
      await loadData(addr);
      setLoading(false);
    }
    init();
  }, [loadData]);

  async function getWriteClient(account: string) {
    setAddress(account);
    const wc = createWriteClient(account as `0x${string}`);
    await wc.connect("studionet").catch(() => {});
    return { wc, addr: account };
  }

  async function handleMint() {
    const gate = await requireCharacter();
    if (!gate.ok) return;

    setBusy(true);
    const tid = toastLoading("Minting Creator NFT…", "Registering on-chain — takes 1–3 min");
    try {
      const { wc, addr } = await getWriteClient(gate.account);
      const txHash = await mintCreatorNft(wc);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      const nextTokenId = supply + 1;
      await recordActivity({
        type: "nft_minted",
        actor: addr,
        nft_token_id: nextTokenId,
        amount_wei: NFT_MINT_PRICE.toString(),
        tx_hash: txHash,
        message: `${addr.slice(0, 6)}...${addr.slice(-4)} minted Creator NFT #${nextTokenId}.`,
        ...(await signActivity('recordActivity', addr)),
      }).catch(() => {});
      dismiss(tid);
      success("Creator NFT minted!", "You are now a Creator.", { href: explorerTxUrl(txHash), label: "View transaction" });
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Mint failed", normaliseError(err).message);
    } finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-amber-900/60 font-display tracking-widest">
        Loading marketplace…
      </div>
    );
  }

  const listed    = nfts.filter((n) => n.price > 0);
  const remaining = MAX_SUPPLY - supply;
  const holdsNft  = myTokenId > 0;
  const myNft     = nfts.find((n) => n.token_id === myTokenId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-amber-400 tracking-wider">
          Creator Marketplace
        </h1>
        <p className="text-xs text-amber-200/60 font-display tracking-widest">
          Hold a Creator NFT to write chapters · Trade them here
        </p>
      </div>

      {/* Supply meter */}
      <div className="panel p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs tracking-widest uppercase text-amber-200/60">Creator Seats</span>
          <span className="font-display font-bold text-amber-400">{supply} / {MAX_SUPPLY}</span>
        </div>
        <div className="h-2 rounded-full bg-amber-900/20 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(supply / MAX_SUPPLY) * 100}%`, background: "linear-gradient(90deg,#f59e0b,#d97706)" }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-amber-200/55 font-display">
          <span>{remaining > 0 ? `${remaining} seats remaining` : "All seats claimed"}</span>
          <span>5 GEN to mint · 3 tiers: Founder · Keeper · Seeker</span>
        </div>
      </div>

      {/* Mint CTA or "you hold one" banner */}
      {holdsNft ? (
        <div className="panel p-5 flex items-center gap-4"
          style={{ border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.05)" }}>
          <div className="w-14 shrink-0 rounded-lg overflow-hidden">
            <CreatorNftImage tokenId={myTokenId} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-amber-400">Creator NFT #{myTokenId}</p>
            <p className="text-xs text-amber-200/60">You hold a Creator seat · Can write chapters</p>
          </div>
          <Link href={`/marketplace/${myTokenId}`}
            className="btn-gold px-4 py-2 rounded-lg text-xs font-display tracking-wider shrink-0">
            Manage
          </Link>
        </div>
      ) : remaining > 0 && (
        <div className="panel p-5 flex items-center gap-4"
          style={{ border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.04)" }}>
          <div className="w-14 shrink-0 rounded-lg overflow-hidden opacity-60">
            <CreatorNftImage tokenId={supply + 1} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-purple-400">Become a Creator</p>
            <p className="text-xs text-amber-200/60">
              Mint one of the {remaining} remaining seats for {formatGEN(NFT_MINT_PRICE)} to start writing chapters.
            </p>
          </div>
          <button
            onClick={handleMint}
            disabled={busy}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-display tracking-wider border border-purple-700/50 text-purple-300 hover:border-purple-500 hover:text-purple-200 transition-colors disabled:opacity-40"
            style={{ background: "rgba(139,92,246,0.1)" }}
          >
            {busy ? "Minting…" : `Mint · ${formatGEN(NFT_MINT_PRICE)}`}
          </button>
        </div>
      )}

      {/* Listed for sale */}
      {listed.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-200/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />For Sale ({listed.length})<span className="gold-divider flex-1" />
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {listed.map((nft) => {
              const isOwn = address?.toLowerCase() === nft.owner.toLowerCase();
              return (
                <Link key={nft.token_id} href={`/marketplace/${nft.token_id}`} className="panel panel-hover p-4 space-y-3 block"
                  style={{ border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.03)" }}>
                  <CreatorNftImage tokenId={nft.token_id} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-200/55">{nft.owner.slice(0, 8)}…{nft.owner.slice(-6)}</span>
                    <span className="font-display font-bold text-amber-300">{formatGEN(nft.price)}</span>
                  </div>
                  {isOwn ? (
                    <div className="w-full py-2 rounded-lg text-xs text-center font-display tracking-wider border border-red-800/50 text-red-300"
                      style={{ background: "rgba(220,38,38,0.05)" }}>
                      Manage Listing
                    </div>
                  ) : (
                    <div className="w-full py-2 rounded-lg text-xs text-center font-display tracking-wider btn-gold">
                      View · {formatGEN(nft.price)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* My NFT management */}
      {holdsNft && myNft && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-200/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />Your NFT<span className="gold-divider flex-1" />
          </h2>
          <Link href={`/marketplace/${myNft.token_id}`} className="panel panel-hover p-4 space-y-3 block">
            <div className="max-w-[180px] mx-auto">
              <CreatorNftImage tokenId={myNft.token_id} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-bold text-amber-400">#{String(myNft.token_id).padStart(3, "0")}</span>
              {myNft.price > 0
                ? <span className="text-amber-300 font-display">Listed at {formatGEN(myNft.price)}</span>
                : <span className="text-amber-200/55 font-display">Not listed</span>}
            </div>
            <div className="w-full py-2 rounded-lg text-xs text-center font-display tracking-wider btn-gold">
              Manage NFT
            </div>
          </Link>
        </div>
      )}

      {/* All minted NFTs */}
      {nfts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-200/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />All Minted ({supply})<span className="gold-divider flex-1" />
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {nfts.map((nft) => {
              const isOwn = address?.toLowerCase() === nft.owner.toLowerCase();
              return (
                <Link key={nft.token_id} href={`/marketplace/${nft.token_id}`} className="space-y-2 block group">
                  <div className={`rounded-xl overflow-hidden ${isOwn ? "ring-2 ring-amber-400/40" : ""}`}>
                    <CreatorNftImage tokenId={nft.token_id} className="w-full rounded-xl transition-transform group-hover:scale-[1.02]" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="font-mono text-[10px] text-amber-200/50">
                      {nft.owner.slice(0, 6)}…{nft.owner.slice(-4)}
                    </p>
                    {nft.price > 0
                      ? <p className="text-xs text-amber-300 font-display">{formatGEN(nft.price)}</p>
                      : <p className="text-[10px] text-amber-200/45 font-display">Unlisted</p>}
                    {isOwn && <p className="text-[10px] text-amber-300 font-display uppercase tracking-wider">Yours</p>}
                  </div>
                </Link>
              );
            })}

            {/* Unminted empty slots */}
            {Array.from({ length: Math.min(remaining, 9) }).map((_, i) => (
              <div key={`empty-${i}`}
                className="rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,158,11,0.06)", aspectRatio: "400/560" }}>
                <span className="text-amber-200/25 font-display text-xs">#{supply + i + 1}</span>
              </div>
            ))}
            {remaining > 9 && (
              <div className="col-span-full rounded-xl flex items-center justify-center py-4"
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(245,158,11,0.06)" }}>
                <span className="text-amber-200/35 font-display text-xs tracking-widest">
                  +{remaining - 9} more seats available
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {supply === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="max-w-[160px] mx-auto opacity-50">
            <CreatorNftImage tokenId={1} />
          </div>
          <p className="font-display text-amber-200/55 tracking-widest">No Creator NFTs minted yet.</p>
          <p className="text-xs text-amber-200/45">Be the first — mint one for 5 GEN.</p>
        </div>
      )}

      <Link href="/" className="block text-center text-xs text-amber-200/55 hover:text-amber-400 font-display tracking-widest">
        ← Live Map
      </Link>
    </div>
  );
}
