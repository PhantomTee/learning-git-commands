"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getAllNfts,
  getCreatorNft,
  getNftSupply,
  mintCreatorNft,
  listNft,
  delistNft,
  buyNft,
  createWriteClient,
  waitForResult,
  formatGEN,
  explorerTxUrl,
  normaliseError,
  genToWei,
  NftItem,
  NFT_MINT_PRICE,
} from "@/lib/genlayer";
import { generateNftSvg, svgToDataUri } from "@/lib/nft-svg";
import { useToast } from "@/components/Toast";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const MAX_SUPPLY = 100;

function NftCard({ nft }: { nft: NftItem }) {
  const src = svgToDataUri(generateNftSvg(nft.token_id));
  return (
    <img
      src={src}
      alt={`Creator NFT #${nft.token_id}`}
      className="w-full rounded-xl"
      style={{ display: "block" }}
    />
  );
}

export default function MarketplacePage() {
  const [address, setAddress]       = useState<string | null>(null);
  const [nfts, setNfts]             = useState<NftItem[]>([]);
  const [supply, setSupply]         = useState(0);
  const [myTokenId, setMyTokenId]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);
  const [listingFor, setListingFor] = useState<number | null>(null);
  const [listPrice, setListPrice]   = useState("");

  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();
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

  async function getWriteClient() {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("Install MetaMask to continue");
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setAddress(accounts[0]);
    const wc = createWriteClient(accounts[0] as `0x${string}`);
    await wc.connect("studionet").catch(() => {});
    return { wc, addr: accounts[0] as string };
  }

  async function handleMint() {
    setBusy(true);
    const tid = toastLoading("Minting Creator NFT…", "Registering on-chain — takes 1–3 min");
    try {
      const { wc, addr } = await getWriteClient();
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
      }).catch(() => {});
      dismiss(tid);
      success("Creator NFT minted!", "You are now a Creator.", { href: explorerTxUrl(txHash), label: "View transaction" });
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Mint failed", normaliseError(err).message);
    } finally { setBusy(false); }
  }

  async function handleList(tokenId: number) {
    const genAmount = parseFloat(listPrice);
    if (!genAmount || genAmount < 1) { toastError("Invalid price", "Minimum listing price is 1 GEN"); return; }
    setBusy(true);
    const tid = toastLoading("Listing NFT…", "Writing listing on-chain");
    try {
      const { wc, addr } = await getWriteClient();
      const txHash = await listNft(wc, tokenId, genToWei(genAmount));
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      await recordActivity({
        type: "nft_listed",
        actor: addr,
        nft_token_id: tokenId,
        amount_wei: genToWei(genAmount).toString(),
        tx_hash: txHash,
        message: `${addr.slice(0, 6)}...${addr.slice(-4)} listed Creator NFT #${tokenId} for ${genAmount} GEN.`,
      }).catch(() => {});
      dismiss(tid);
      success("NFT listed!", `Creator NFT #${tokenId} is now for sale at ${genAmount} GEN.`);
      setListingFor(null);
      setListPrice("");
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Listing failed", normaliseError(err).message);
    } finally { setBusy(false); }
  }

  async function handleDelist(tokenId: number) {
    setBusy(true);
    const tid = toastLoading("Removing listing…", "");
    try {
      const { wc, addr } = await getWriteClient();
      const txHash = await delistNft(wc, tokenId);
      await waitForResult(txHash);
      dismiss(tid);
      success("Listing removed", `Creator NFT #${tokenId} is no longer for sale.`);
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Delist failed", normaliseError(err).message);
    } finally { setBusy(false); }
  }

  async function handleBuy(nft: NftItem) {
    setBusy(true);
    const tid = toastLoading(`Buying Creator NFT #${nft.token_id}…`, "Transferring on-chain — takes 1–3 min");
    try {
      const { wc, addr } = await getWriteClient();
      const txHash = await buyNft(wc, nft.token_id, BigInt(nft.price));
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      await recordActivity({
        type: "nft_sold",
        actor: addr,
        target_address: nft.owner,
        nft_token_id: nft.token_id,
        amount_wei: String(nft.price),
        tx_hash: txHash,
        message: `${addr.slice(0, 6)}...${addr.slice(-4)} bought Creator NFT #${nft.token_id}.`,
      }).catch(() => {});
      dismiss(tid);
      success("NFT purchased!", `You now hold Creator NFT #${nft.token_id}.`);
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Purchase failed", normaliseError(err).message);
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
        <p className="text-xs text-amber-900/60 font-display tracking-widest">
          Hold a Creator NFT to write chapters · Trade them here
        </p>
      </div>

      {/* Supply meter */}
      <div className="panel p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs tracking-widest uppercase text-amber-900/60">Creator Seats</span>
          <span className="font-display font-bold text-amber-400">{supply} / {MAX_SUPPLY}</span>
        </div>
        <div className="h-2 rounded-full bg-amber-900/20 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(supply / MAX_SUPPLY) * 100}%`, background: "linear-gradient(90deg,#f59e0b,#d97706)" }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-amber-900/50 font-display">
          <span>{remaining > 0 ? `${remaining} seats remaining` : "All seats claimed"}</span>
          <span>5 GEN to mint · 3 tiers: Founder · Keeper · Seeker</span>
        </div>
      </div>

      {/* Mint CTA or "you hold one" banner */}
      {holdsNft ? (
        <div className="panel p-5 flex items-center gap-4"
          style={{ border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.05)" }}>
          <div className="w-14 shrink-0 rounded-lg overflow-hidden">
            <NftCard nft={{ token_id: myTokenId, owner: address ?? "", price: myNft?.price ?? 0 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-amber-400">Creator NFT #{myTokenId}</p>
            <p className="text-xs text-amber-900/60">You hold a Creator seat · Can write chapters</p>
          </div>
          <Link href="/chapter/create"
            className="btn-gold px-4 py-2 rounded-lg text-xs font-display tracking-wider shrink-0">
            Write Chapter
          </Link>
        </div>
      ) : remaining > 0 && (
        <div className="panel p-5 flex items-center gap-4"
          style={{ border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.04)" }}>
          <div className="w-14 shrink-0 rounded-lg overflow-hidden opacity-60">
            <NftCard nft={{ token_id: supply + 1, owner: "", price: 0 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-purple-400">Become a Creator</p>
            <p className="text-xs text-amber-900/60">
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
          <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />For Sale ({listed.length})<span className="gold-divider flex-1" />
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {listed.map((nft) => {
              const isOwn = address?.toLowerCase() === nft.owner.toLowerCase();
              return (
                <div key={nft.token_id} className="panel p-4 space-y-3"
                  style={{ border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.03)" }}>
                  <NftCard nft={nft} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-900/50">{nft.owner.slice(0, 8)}…{nft.owner.slice(-6)}</span>
                    <span className="font-display font-bold text-amber-300">{formatGEN(nft.price)}</span>
                  </div>
                  {isOwn ? (
                    <button onClick={() => handleDelist(nft.token_id)} disabled={busy}
                      className="w-full py-2 rounded-lg text-xs font-display tracking-wider border border-red-900/40 text-red-400/70 hover:border-red-700 hover:text-red-300 transition-colors disabled:opacity-40"
                      style={{ background: "rgba(220,38,38,0.05)" }}>
                      {busy ? "Removing…" : "Remove Listing"}
                    </button>
                  ) : (
                    <button onClick={() => handleBuy(nft)} disabled={busy || holdsNft}
                      title={holdsNft ? "You already hold a Creator NFT" : ""}
                      className="w-full py-2 rounded-lg text-xs font-display tracking-wider btn-gold disabled:opacity-40 disabled:cursor-not-allowed">
                      {busy ? "Buying…" : `Buy · ${formatGEN(nft.price)}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My NFT management */}
      {holdsNft && myNft && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />Your NFT<span className="gold-divider flex-1" />
          </h2>
          <div className="panel p-4 space-y-3">
            <div className="max-w-[180px] mx-auto">
              <NftCard nft={myNft} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-bold text-amber-400">#{String(myNft.token_id).padStart(3, "0")}</span>
              {myNft.price > 0
                ? <span className="text-amber-300 font-display">Listed at {formatGEN(myNft.price)}</span>
                : <span className="text-amber-900/50 font-display">Not listed</span>}
            </div>

            {myNft.price > 0 ? (
              <button onClick={() => handleDelist(myNft.token_id)} disabled={busy}
                className="w-full py-2 rounded-lg text-xs font-display tracking-wider border border-red-900/40 text-red-400/70 hover:border-red-700 hover:text-red-300 transition-colors disabled:opacity-40"
                style={{ background: "rgba(220,38,38,0.05)" }}>
                {busy ? "Removing…" : "Remove Listing"}
              </button>
            ) : listingFor === myNft.token_id ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number" min="1" step="0.1" placeholder="Price in GEN"
                    value={listPrice} onChange={(e) => setListPrice(e.target.value)}
                    className="flex-1 bg-black/40 border border-amber-900/40 focus:border-amber-500 rounded-lg px-3 py-2 text-sm outline-none text-amber-200 placeholder:text-amber-900/40 transition-colors"
                  />
                  <button onClick={() => handleList(myNft.token_id)} disabled={busy || !listPrice}
                    className="px-4 py-2 rounded-lg text-xs font-display tracking-wider btn-gold disabled:opacity-40">
                    {busy ? "…" : "Confirm"}
                  </button>
                  <button onClick={() => { setListingFor(null); setListPrice(""); }}
                    className="px-3 py-2 rounded-lg text-xs font-display border border-amber-900/30 text-amber-900/60 hover:text-amber-400 transition-colors">
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-amber-900/40">Buyer pays this amount directly to you.</p>
              </div>
            ) : (
              <button onClick={() => { setListingFor(myNft.token_id); setListPrice(""); }} disabled={busy}
                className="w-full py-2 rounded-lg text-xs font-display tracking-wider border border-amber-900/40 text-amber-400/70 hover:border-amber-600 hover:text-amber-300 transition-colors disabled:opacity-40"
                style={{ background: "rgba(245,158,11,0.04)" }}>
                List for Sale
              </button>
            )}
          </div>
        </div>
      )}

      {/* All minted NFTs */}
      {nfts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
            <span className="gold-divider flex-1" />All Minted ({supply})<span className="gold-divider flex-1" />
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {nfts.map((nft) => {
              const isOwn = address?.toLowerCase() === nft.owner.toLowerCase();
              return (
                <div key={nft.token_id} className="space-y-2">
                  <div className={`rounded-xl overflow-hidden ${isOwn ? "ring-2 ring-amber-400/40" : ""}`}>
                    <NftCard nft={nft} />
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="font-mono text-[10px] text-amber-900/40">
                      {nft.owner.slice(0, 6)}…{nft.owner.slice(-4)}
                    </p>
                    {nft.price > 0
                      ? <p className="text-xs text-amber-300 font-display">{formatGEN(nft.price)}</p>
                      : <p className="text-[10px] text-amber-900/25 font-display">Unlisted</p>}
                    {isOwn && <p className="text-[10px] text-amber-400/60 font-display uppercase tracking-wider">Yours</p>}
                  </div>
                </div>
              );
            })}

            {/* Unminted empty slots */}
            {Array.from({ length: Math.min(remaining, 9) }).map((_, i) => (
              <div key={`empty-${i}`}
                className="rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,158,11,0.06)", aspectRatio: "400/560" }}>
                <span className="text-amber-900/20 font-display text-xs">#{supply + i + 1}</span>
              </div>
            ))}
            {remaining > 9 && (
              <div className="col-span-full rounded-xl flex items-center justify-center py-4"
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(245,158,11,0.06)" }}>
                <span className="text-amber-900/30 font-display text-xs tracking-widest">
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
            <NftCard nft={{ token_id: 1, owner: "", price: 0 }} />
          </div>
          <p className="font-display text-amber-900/50 tracking-widest">No Creator NFTs minted yet.</p>
          <p className="text-xs text-amber-900/40">Be the first — mint one for 5 GEN.</p>
        </div>
      )}

      <Link href="/" className="block text-center text-xs text-amber-900/50 hover:text-amber-400 font-display tracking-widest">
        ← World Map
      </Link>
    </div>
  );
}
