import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const addRepository = mutation({
  args: {
    name: v.string(),
    owner: v.string(),
    installationId: v.number(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if repository already exists
    const existingRepo = await ctx.db
      .query("repositories")
      .withIndex("by_owner_and_name", (q) => 
        q.eq("owner", args.owner).eq("name", args.name)
      )
      .first();

    if (existingRepo) {
      throw new Error("Repository already exists");
    }

    return ctx.db.insert("repositories", {
      name: args.name,
      owner: args.owner,
      installationId: args.installationId,
      webhookSecret: args.webhookSecret,
      createdBy: user._id,
    });
  },
});

export const listUserRepositories = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return ctx.db
      .query("repositories")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();
  },
});

export const getRepository = query({
  args: { id: v.id("repositories") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const updateRepositoryToken = mutation({
  args: {
    id: v.id("repositories"),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const repo = await ctx.db.get(args.id);
    if (!repo) {
      throw new Error("Repository not found");
    }

    return ctx.db.patch(args.id, {
      accessToken: args.accessToken,
    });
  },
}); 