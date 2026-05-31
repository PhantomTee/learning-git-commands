import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Players ──────────────────────────────────────────────────────────────────

export const upsertPlayer = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    character_class: v.string(),
    x: v.number(),
    y: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
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
  args: { address: v.string(), x: v.number(), y: v.number() },
  handler: async (ctx, { address, x, y }) => {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chat", {
      ...args,
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
