"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { NftActivityFeed } from "@/components/ActivityFeed";
import CreatorNftImage from "@/components/CreatorNftImage";
import { useToast } from "@/components/Toast";
import { useCharacterGate } from "@/hooks/useCharacterGate";
import {
  buyNft,
  createWriteClient,
  delistNft,
  explorerTxUrl,
  formatGEN,
  genToWei,
  getAllNfts,
  getCreatorNft,
  listNft,
  normaliseError,
  waitForResult,
  NftItem,
} from "@/lib/genlayer";
import { signActivity } from "@/lib/sign-activity";

const MAX_SUPPLY = 100;

function shortAddress(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export default function CreatorNftPage() {
  const params = useParams();
  const tokenId = Number(params.id);

  const [address, setAddress] = useState<string | null>(null);
  const [nft, setNft] = useState<NftItem | null>(null);
  const [myTokenId, setMyTokenId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [listPrice, setListPrice] = useState("");
  const { success, error: toastError, loading: toastLoading, update: toastUpdate, dismiss } = useToast();
  const { requireCharacter } = useCharacterGate();
  const recordActivity = useMutation(api.world.recordActivity);

  const loadData = useCallback(async (addr: string | null) => {
    try {
      const allNfts = await getAllNfts();
      setNft(allNfts.find((item) => item.token_id === tokenId) ?? null);
      if (addr) setMyTokenId(await getCreatorNft(addr));
    } catch { /* RPC unavailable */ }
  }, [tokenId]);

  useEffect(() => {
    async function init() {
      const eth = (window as any).ethereum;
      let addr: string | null = null;
      if (eth) {
        const accounts = await eth.request({ method: "eth_accounts" });
        if (accounts[0]) {
          addr = accounts[0];
          setAddress(accounts[0]);
        }
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

  async function handleList() {
    const genAmount = parseFloat(listPrice);
    if (!genAmount || genAmount < 1) {
      toastError("Invalid price", "Minimum listing price is 1 GEN");
      return;
    }
    const gate = await requireCharacter();
    if (!gate.ok) return;

    setBusy(true);
    const tid = toastLoading("Listing NFT...", "Writing listing on-chain");
    try {
      const { wc, addr } = await getWriteClient(gate.account);
      const priceWei = genToWei(genAmount);
      const txHash = await listNft(wc, tokenId, priceWei);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      await recordActivity({
        type: "nft_listed",
        actor: addr,
        nft_token_id: tokenId,
        amount_wei: priceWei.toString(),
        tx_hash: txHash,
        message: `${shortAddress(addr)} listed Creator NFT #${tokenId} for ${genAmount} GEN.`,
        ...(await signActivity('recordActivity', addr)),
      }).catch(() => {});
      dismiss(tid);
      success("NFT listed", `Creator NFT #${tokenId} is now for sale at ${genAmount} GEN.`);
      setListPrice("");
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Listing failed", normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelist() {
    const gate = await requireCharacter();
    if (!gate.ok) return;

    setBusy(true);
    const tid = toastLoading("Removing listing...", "Writing update on-chain");
    try {
      const { wc, addr } = await getWriteClient(gate.account);
      const txHash = await delistNft(wc, tokenId);
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      dismiss(tid);
      success("Listing removed", `Creator NFT #${tokenId} is no longer for sale.`);
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Delist failed", normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBuy() {
    if (!nft || nft.price <= 0) return;
    const gate = await requireCharacter();
    if (!gate.ok) return;

    setBusy(true);
    const tid = toastLoading(`Buying Creator NFT #${tokenId}...`, "Transferring on-chain");
    try {
      const { wc, addr } = await getWriteClient(gate.account);
      const txHash = await buyNft(wc, tokenId, BigInt(nft.price));
      toastUpdate(tid, { link: { href: explorerTxUrl(txHash), label: "View transaction" } });
      await waitForResult(txHash);
      await recordActivity({
        type: "nft_sold",
        actor: addr,
        target_address: nft.owner,
        nft_token_id: tokenId,
        amount_wei: String(nft.price),
        tx_hash: txHash,
        message: `${shortAddress(addr)} bought Creator NFT #${tokenId}.`,
        ...(await signActivity('recordActivity', addr)),
      }).catch(() => {});
      dismiss(tid);
      success("NFT purchased", `You now hold Creator NFT #${tokenId}.`);
      await loadData(addr);
    } catch (err: any) {
      dismiss(tid);
      toastError("Purchase failed", normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-amber-200/60 font-display tracking-widest">
        Loading Creator NFT...
      </div>
    );
  }

  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > MAX_SUPPLY) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-4">
        <p className="font-display text-amber-400">Invalid Creator NFT.</p>
        <Link href="/marketplace" className="text-sm text-amber-300 hover:text-amber-200">Back to marketplace</Link>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-5">
        <div className="max-w-[180px] mx-auto opacity-55">
          <CreatorNftImage tokenId={tokenId} />
        </div>
        <div className="space-y-2">
          <p className="font-display text-amber-400">Creator NFT #{tokenId} has not been minted yet.</p>
          <p className="text-sm text-amber-200/60">Minting happens from the marketplace while seats remain.</p>
        </div>
        <Link href="/marketplace" className="btn-gold inline-block px-5 py-2 rounded-lg text-sm">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const isOwner = address?.toLowerCase() === nft.owner.toLowerCase();
  const holdsNft = myTokenId > 0;
  const listed = nft.price > 0;
  const statusStyle = listed
    ? { border: "1px solid rgba(74,222,128,0.35)", background: "rgba(74,222,128,0.08)", color: "#86efac" }
    : { border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.06)", color: "#fcd34d" };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link href="/marketplace" className="text-xs text-amber-200/60 hover:text-amber-300 font-display tracking-widest uppercase">
        Back to Marketplace
      </Link>

      <div className="grid md:grid-cols-[minmax(0,360px)_1fr] gap-6 items-start">
        <div className="panel p-4">
          <CreatorNftImage tokenId={nft.token_id} />
        </div>

        <div className="panel p-5 space-y-5">
          <div className="space-y-2">
            <p className="font-display text-xs tracking-widest uppercase text-amber-200/60">Creator Seat</p>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h1 className="font-display font-black text-3xl text-amber-400 tracking-wider">
                Creator NFT #{nft.token_id}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-display tracking-widest uppercase" style={statusStyle}>
                {listed ? "For Sale" : "Held"}
              </span>
            </div>
            <p className="text-sm text-amber-200/70">
              This NFT grants chapter creation access for ChainTales.
            </p>
          </div>

          <div className="gold-divider" />

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p className="font-display text-xs tracking-widest uppercase text-amber-200/55">Owner</p>
              <p className="font-mono text-amber-200 mt-1">{shortAddress(nft.owner)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p className="font-display text-xs tracking-widest uppercase text-amber-200/55">Status</p>
              <p className="font-display text-amber-300 mt-1">{listed ? `For sale at ${formatGEN(nft.price)}` : "Not listed for sale"}</p>
            </div>
          </div>

          {isOwner ? (
            <div className="space-y-3">
              <p className="font-display text-xs tracking-widest uppercase text-amber-200/60">Owner Controls</p>
              {listed ? (
                <button
                  onClick={handleDelist}
                  disabled={busy}
                  className="w-full py-3 rounded-lg text-sm font-display tracking-wider border border-red-700/60 text-red-300 hover:border-red-500 hover:text-red-200 transition-colors disabled:opacity-40"
                  style={{ background: "rgba(220,38,38,0.08)" }}
                >
                  {busy ? "Removing..." : "Remove Listing"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      placeholder="Price in GEN"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="input-stone flex-1 px-3 py-3 text-sm"
                    />
                    <button
                      onClick={handleList}
                      disabled={busy || !listPrice}
                      className="btn-gold px-5 py-3 rounded-lg text-sm disabled:opacity-40"
                    >
                      {busy ? "..." : "List"}
                    </button>
                  </div>
                  <p className="text-xs text-amber-200/55">Minimum listing price is 1 GEN. Buyer pays you directly.</p>
                </div>
              )}
            </div>
          ) : listed ? (
            <div className="space-y-3">
              <button
                onClick={handleBuy}
                disabled={busy || holdsNft}
                title={holdsNft ? "You already hold a Creator NFT" : ""}
                className="btn-gold w-full py-3 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "Buying..." : `Buy for ${formatGEN(nft.price)}`}
              </button>
              {holdsNft && (
                <p className="text-xs text-amber-200/55 text-center">
                  Your wallet already holds Creator NFT #{myTokenId}; one wallet can hold only one.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg p-4 text-sm text-amber-200/65"
              style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(245,158,11,0.15)" }}>
              This NFT is not listed for sale.
            </div>
          )}
        </div>
      </div>

      <NftActivityFeed tokenId={tokenId} />
    </div>
  );
}
