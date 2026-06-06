"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { explorerTxUrl, formatGEN } from "@/lib/genlayer-server";

type Activity = {
  _id: string;
  type: string;
  actor: string;
  chapter_id?: number;
  chapter_title?: string;
  nft_token_id?: number;
  amount_wei?: string;
  tx_hash: string;
  message: string;
  success?: boolean;
  roll?: number;
  created_at: number;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function relativeTime(timestamp: number) {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function typeLabel(activity: Activity) {
  if (activity.type === "chapter_created") return "Chapter";
  if (activity.type === "attempt_submitted") return activity.success ? "Victory" : "Attempt";
  if (activity.type === "winner_changed") return "Leader";
  if (activity.type === "chapter_closed") return "Closed";
  if (activity.type === "prize_claimed") return "Prize";
  if (activity.type === "nft_minted") return "Mint";
  if (activity.type === "nft_listed") return "Listing";
  if (activity.type === "nft_sold") return "Sale";
  return "Activity";
}

function activityDetail(activity: Activity) {
  if (activity.amount_wei) return formatGEN(BigInt(activity.amount_wei));
  if (typeof activity.roll === "number") return `Roll ${activity.roll}`;
  if (activity.nft_token_id) return `NFT #${activity.nft_token_id}`;
  return shortAddress(activity.actor);
}

function ActivityRow({ activity }: { activity: Activity }) {
  const chapterHref = activity.chapter_id === undefined ? null : `/chapter/${activity.chapter_id}`;

  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-[10px] tracking-widest uppercase text-amber-400">
          {typeLabel(activity)}
        </span>
        <span className="font-mono text-[10px] text-amber-900/50">{relativeTime(activity.created_at)}</span>
      </div>
      <p className="text-sm text-amber-200/70 leading-relaxed">{activity.message}</p>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="font-display text-amber-900/60">{activityDetail(activity)}</span>
        <span className="flex items-center gap-3">
          {chapterHref && (
            <Link href={chapterHref} className="text-amber-500/70 hover:text-amber-300">
              Chapter
            </Link>
          )}
          <a
            href={explorerTxUrl(activity.tx_hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500/70 hover:text-amber-300"
          >
            Tx
          </a>
        </span>
      </div>
    </div>
  );
}

export function RecentActivityFeed({ limit = 8 }: { limit?: number }) {
  const activities = useQuery(api.world.getRecentActivity, { limit }) as Activity[] | undefined;

  if (!activities || activities.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-display font-bold text-amber-400 tracking-widest uppercase text-sm flex items-center gap-3">
        <span className="gold-divider flex-1" />
        Live Chronicle
        <span className="gold-divider flex-1" />
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {activities.map((activity) => (
          <ActivityRow key={activity._id} activity={activity} />
        ))}
      </div>
    </section>
  );
}

export function ChapterActivityFeed({ chapterId, limit = 8 }: { chapterId: number; limit?: number }) {
  const activities = useQuery(api.world.getChapterActivity, { chapter_id: chapterId, limit }) as Activity[] | undefined;

  if (!activities || activities.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xs text-amber-900/60 tracking-widest uppercase flex items-center gap-3">
        <span className="gold-divider flex-1" />Live Activity<span className="gold-divider flex-1" />
      </h2>
      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityRow key={activity._id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

export function NftActivityFeed({ tokenId, limit = 8 }: { tokenId: number; limit?: number }) {
  const activities = useQuery(api.world.getNftActivity, { nft_token_id: tokenId, limit }) as Activity[] | undefined;

  if (!activities || activities.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xs text-amber-200/60 tracking-widest uppercase flex items-center gap-3">
        <span className="gold-divider flex-1" />NFT History<span className="gold-divider flex-1" />
      </h2>
      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityRow key={activity._id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
