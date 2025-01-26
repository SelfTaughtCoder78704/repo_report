import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const storePullRequest = mutation({
  args: {
    repositoryId: v.string(),
    prNumber: v.number(),
    title: v.string(),
    author: v.string(),
    state: v.string(),
    baseBranch: v.string(),
    headBranch: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    closedAt: v.optional(v.number()),
    mergedAt: v.optional(v.number()),
    diffUrl: v.string(),
    htmlUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if PR already exists
    const existingPR = await ctx.db
      .query("pullRequests")
      .withIndex("by_number", (q) => 
        q.eq("repositoryId", args.repositoryId)
         .eq("prNumber", args.prNumber)
      )
      .first();

    if (existingPR) {
      // Update existing PR
      return ctx.db.patch(existingPR._id, {
        title: args.title,
        state: args.state,
        updatedAt: args.updatedAt,
        closedAt: args.closedAt,
        mergedAt: args.mergedAt,
      });
    }

    // Create new PR
    return ctx.db.insert("pullRequests", {
      repositoryId: args.repositoryId as Id<"repositories">,
      prNumber: args.prNumber,
      title: args.title,
      author: args.author,
      state: args.state,
      baseBranch: args.baseBranch,
      headBranch: args.headBranch,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      closedAt: args.closedAt,
      mergedAt: args.mergedAt,
      diffUrl: args.diffUrl,
      htmlUrl: args.htmlUrl,
    });
  },
});

export const listRepositoryPRs = query({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("pullRequests")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .order("desc")
      .collect();
  },
}); 