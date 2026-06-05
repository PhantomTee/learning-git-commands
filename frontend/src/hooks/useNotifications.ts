"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getChapters } from "@/lib/genlayer-server";

const STORAGE_KEY = "ct_notif_seen";
const POLL_MS = 30_000;

export interface NotifItem {
  chapterId: number;
  title: string;
  newAttempts: number;
}

function getSeenMap(): Record<number, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveSeenMap(map: Record<number, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function useNotifications(address: string | null) {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotifItem[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const poll = useCallback(async (addr: string) => {
    try {
      const chapters = await getChapters(0, 100);
      const mine = chapters.filter((c) => c.creator.toLowerCase() === addr.toLowerCase());
      const seen = getSeenMap();

      // First time seeing a chapter — set baseline, no notification
      let baselineUpdated = false;
      for (const ch of mine) {
        if (!(ch.id in seen)) {
          seen[ch.id] = ch.attempt_count;
          baselineUpdated = true;
        }
      }
      if (baselineUpdated) saveSeenMap(seen);

      const newItems: NotifItem[] = [];
      for (const ch of mine) {
        const delta = ch.attempt_count - (seen[ch.id] ?? ch.attempt_count);
        if (delta > 0) newItems.push({ chapterId: ch.id, title: ch.title, newAttempts: delta });
      }

      setCount(newItems.reduce((s, n) => s + n.newAttempts, 0));
      setItems(newItems);
    } catch { /* RPC unavailable */ }
  }, []);

  const markAllRead = useCallback(() => {
    getChapters(0, 100).then((chapters) => {
      if (!address) return;
      const mine = chapters.filter((c) => c.creator.toLowerCase() === address.toLowerCase());
      const seen = getSeenMap();
      for (const ch of mine) seen[ch.id] = ch.attempt_count;
      saveSeenMap(seen);
      setCount(0);
      setItems([]);
    }).catch(() => {});
  }, [address]);

  useEffect(() => {
    if (!address) { setCount(0); setItems([]); return; }
    poll(address);
    timer.current = setInterval(() => poll(address), POLL_MS);
    return () => clearInterval(timer.current);
  }, [address, poll]);

  return { count, items, markAllRead };
}
