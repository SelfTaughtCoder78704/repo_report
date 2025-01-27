import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { getInstallationAccessToken, fetchInstallationRepositories } from "./github";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

interface GitHubRepository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
}

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
    // List all repositories without user filtering
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

// Action to fetch available repositories
export const fetchAvailableRepositories = action({
  handler: async (ctx): Promise<GitHubRepository[]> => {
    // Get all existing repositories
    const existingRepos = await ctx.runQuery(internal.repos.getExistingRepositories);

    // Get the installation ID from the first repository (assuming all repos are from the same installation)
    const installationId = existingRepos[0]?.installationId;
    if (!installationId) {
      return [];
    }

    // Get an installation access token
    const token = await getInstallationAccessToken(installationId);

    // Fetch all available repositories for this installation
    const allRepos = await fetchInstallationRepositories(installationId, token) as GitHubRepository[];

    // Filter out repositories that are already added
    const existingRepoKeys = new Set(
      existingRepos.map((repo) => `${repo.owner}/${repo.name}`)
    );

    const availableRepos = allRepos.filter(
      (repo) => !existingRepoKeys.has(`${repo.owner.login}/${repo.name}`)
    );

    // Store the available repositories in the database
    await ctx.runMutation(internal.repos.storeAvailableRepositories, {
      repositories: availableRepos,
      updatedAt: Date.now(),
    });

    return availableRepos;
  },
});

// Query to get existing repositories
export const getExistingRepositories = internalQuery({
  handler: async (ctx): Promise<Repository[]> => {
    return ctx.db
      .query("repositories")
      .collect();
  },
});

// Store available repositories
export const storeAvailableRepositories = internalMutation({
  args: {
    repositories: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        owner: v.object({
          login: v.string(),
        }),
        description: v.union(v.string(), v.null()),
      })
    ),
    updatedAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"availableRepositories">> => {
    // Delete old entries
    const oldEntries = await ctx.db
      .query("availableRepositories")
      .collect();
    
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    // Insert new entry
    return ctx.db.insert("availableRepositories", {
      repositories: args.repositories,
      updatedAt: args.updatedAt,
    });
  },
});

// Query to list available repositories (cached)
export const listAvailableRepositories = query({
  handler: async (ctx): Promise<GitHubRepository[]> => {
    // This will be cached and updated periodically
    const cached = await ctx.db
      .query("availableRepositories")
      .order("desc")
      .first();

    return cached?.repositories ?? [];
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