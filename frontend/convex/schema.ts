import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Real-time layer — tracks player positions and world chat.
// On-chain settlement (Genlayer) handles ownership, rewards, and AI judgment.
export default defineSchema({
  players: defineTable({
    address: v.string(),
    name: v.string(),
    character_class: v.string(),
    x: v.number(),         // 0–9 grid position
    y: v.number(),         // 0–9 grid position
    last_seen: v.number(), // timestamp ms
    status: v.string(),    // idle | exploring | creating
  }).index("by_address", ["address"]),

  chat: defineTable({
    address: v.string(),
    name: v.string(),
    message: v.string(),
    chapter_id: v.optional(v.number()), // null = global chat
    timestamp: v.number(),
  }).index("by_chapter", ["chapter_id"]),

  // Mirrors on-chain chapter state for fast UI reads without RPC calls
  chapter_cache: defineTable({
    chapter_id: v.number(),
    title: v.string(),
    creator: v.string(),
    attempt_count: v.number(),
    active: v.boolean(),
    fomo_winner: v.string(),
    updated_at: v.number(),
  }).index("by_chapter_id", ["chapter_id"]),
});
