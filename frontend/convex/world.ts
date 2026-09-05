import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSigner } from "./auth";

/** Proof that the caller controls the address they are writing as. */
const signed = {
  timestamp: v.number(),
  signature: v.string(),
};

// ── Players ──────────────────────────────────────────────────────────────────

export const upsertPlayer = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    character_class: v.string(),
    x: v.number(),
    y: v.number(),
    status: v.string(),
    ...signed,
  },
  handler: async (ctx, rawArgs) => {
    const address = await requireSigner("upsertPlayer", rawArgs);
    const { timestamp: _t, signature: _s, ...rest } = rawArgs;
    const args = { ...rest, address };
    const existing = await ctx.db
      .query("players")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        character_class: args.character_class,
        x: args.x,
        y: args.y,
        status: args.status,
        last_seen: Date.now(),
      });
    } else {
      await ctx.db.insert("players", {
        ...args,
        last_seen: Date.now(),
      });
    }
  },
});

export const movePlayer = mutation({
  args: { address: v.string(), x: v.number(), y: v.number(), ...signed },
  handler: async (ctx, rawArgs) => {
    const address = await requireSigner("movePlayer", rawArgs);
    const { x, y } = rawArgs;
    const player = await ctx.db
      .query("players")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();
    if (player) {
      await ctx.db.patch(player._id, { x, y, last_seen: Date.now() });
    }
  },
});

export const getActivePlayers = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60_000; // active within last 60s
    const all = await ctx.db.query("players").collect();
    return all.filter((p) => p.last_seen > cutoff);
  },
});

// ── Chat ─────────────────────────────────────────────────────────────────────

export const sendMessage = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    message: v.string(),
    chapter_id: v.optional(v.number()),
    ...signed,
  },
  handler: async (ctx, rawArgs) => {
    const address = await requireSigner("sendMessage", rawArgs);
    const { timestamp: _t, signature: _s, ...rest } = rawArgs;
    await ctx.db.insert("chat", {
      ...rest,
      address,
      timestamp: Date.now(),
    });
  },
});

export const getMessages = query({
  args: { chapter_id: v.optional(v.number()) },
  handler: async (ctx, { chapter_id }) => {
    const messages = await ctx.db
      .query("chat")
      .withIndex("by_chapter", (q) => q.eq("chapter_id", chapter_id))
      .order("desc")
      .take(50);
    return messages.reverse();
  },
});

// ── Activity feed ────────────────────────────────────────────────────────────

const activityType = v.union(
  v.literal("chapter_created"),
  v.literal("attempt_submitted"),
  v.literal("winner_changed"),
  v.literal("chapter_closed"),
  v.literal("prize_claimed"),
  v.literal("nft_minted"),
  v.literal("nft_listed"),
  v.literal("nft_sold"),
);

export const recordActivity = mutation({
  args: {
    type: activityType,
    actor: v.string(),
    target_address: v.optional(v.string()),
    chapter_id: v.optional(v.number()),
    chapter_title: v.optional(v.string()),
    nft_token_id: v.optional(v.number()),
    amount_wei: v.optional(v.string()),
    tx_hash: v.string(),
    message: v.string(),
    success: v.optional(v.boolean()),
    roll: v.optional(v.number()),
    ...signed,
  },
  handler: async (ctx, rawArgs) => {
    const actor = await requireSigner("recordActivity", { ...rawArgs, address: rawArgs.actor });
    const { timestamp: _t, signature: _s, ...rest } = rawArgs;
    const args = { ...rest, actor };
    const existing = await ctx.db
      .query("activity")
      .withIndex("by_tx_hash", (q) => q.eq("tx_hash", args.tx_hash))
      .collect();

    if (existing.some((item) => item.type === args.type)) {
      return;
    }

    await ctx.db.insert("activity", {
      ...args,
      actor: args.actor.toLowerCase(),
      target_address: args.target_address?.toLowerCase(),
      created_at: Date.now(),
    });
  },
});

export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return ctx.db
      .query("activity")
      .withIndex("by_created_at")
      .order("desc")
      .take(Math.min(limit ?? 20, 50));
  },
});

export const getChapterActivity = query({
  args: { chapter_id: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, { chapter_id, limit }) => {
    return ctx.db
      .query("activity")
      .withIndex("by_chapter", (q) => q.eq("chapter_id", chapter_id))
      .order("desc")
      .take(Math.min(limit ?? 20, 50));
  },
});

export const getNftActivity = query({
  args: { nft_token_id: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, { nft_token_id, limit }) => {
    return ctx.db
      .query("activity")
      .withIndex("by_nft", (q) => q.eq("nft_token_id", nft_token_id))
      .order("desc")
      .take(Math.min(limit ?? 20, 50));
  },
});

export const getInboxActivity = query({
  args: { address: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { address, limit }) => {
    return ctx.db
      .query("activity")
      .withIndex("by_target", (q) => q.eq("target_address", address.toLowerCase()))
      .order("desc")
      .take(Math.min(limit ?? 20, 50));
  },
});
