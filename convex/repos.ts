import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

interface Repository extends Doc<"repositories"> {
  name: string;
  owner: string;
  installationId: number;
  webhookSecret: string;
  accessToken?: string;
  createdBy?: Id<"users">;
}

export const getRepositoryByOwnerAndName = query({
  args: {
    owner: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("repositories")
      .withIndex("by_owner_and_name", (q) => 
        q.eq("owner", args.owner).eq("name", args.name)
      )
      .first();
  },
});

export const addRepository = internalMutation({
  args: {
    name: v.string(),
    owner: v.string(),
    installationId: v.number(),
    webhookSecret: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
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
      createdBy: args.userId,
    });
  },
});

export const listUserRepositories = query({
  handler: async (ctx) => {
    return ctx.db
      .query("repositories")
      .collect();
  },
});

export const getRepository = internalQuery({
  args: {
    id: v.id("repositories"),
  },
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

export const updateRepositoryWebhook = internalMutation({
  args: {
    id: v.id("repositories"),
    webhookId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.patch(args.id, {
      webhookId: args.webhookId,
    });
  },
});

export const getUserByClerkId = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getUserRepositories = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("repositories")
      .withIndex("by_created_by", (q) => q.eq("createdBy", args.userId))
      .collect();
  },
});

export const storeRepository = mutation({
  args: {
    name: v.string(),
    owner: v.string(),
    installationId: v.number(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if repository already exists
    const existingRepo = await ctx.db
      .query("repositories")
      .withIndex("by_owner_and_name", (q) => 
        q.eq("owner", args.owner).eq("name", args.name)
      )
      .first();

    if (existingRepo) {
      return existingRepo._id;
    }

    return ctx.db.insert("repositories", {
      name: args.name,
      owner: args.owner,
      installationId: args.installationId,
      webhookSecret: args.webhookSecret,
    });
  },
});