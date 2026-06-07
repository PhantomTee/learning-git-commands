"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const STORAGE_KEY = "ct_notif_seen";

export interface NotifItem {
  id: string;
  chapterId?: number;
  title: string;
  message: string;
  unread: boolean;
}

type InboxActivity = {
  _id: string;
  chapter_id?: number;
  chapter_title?: string;
  message: string;
};

function getSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  }
  catch { return []; }
}

function saveSeenIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useNotifications(address: string | null) {
  const inbox = useQuery(
    api.world.getInboxActivity,
    address ? { address, limit: 20 } : "skip"
  ) as InboxActivity[] | undefined;
  const [seen, setSeen] = useState<string[]>(() => getSeenIds());

  const items = useMemo<NotifItem[]>(() => {
    if (!inbox) return [];
    const seenSet = new Set(seen);
    return inbox
      .map((item) => ({
        id: item._id,
        chapterId: item.chapter_id,
        title: item.chapter_title ?? "ChainTales",
        message: item.message,
        unread: !seenSet.has(item._id),
      }));
  }, [inbox, seen]);

  const count = useMemo(() => items.filter((item) => item.unread).length, [items]);

  const markAllRead = useCallback(() => {
    if (!inbox) return;
    const ids = inbox.map((item) => item._id);
    saveSeenIds(ids);
    setSeen(ids);
  }, [inbox]);

  return { count, items, markAllRead };
}
