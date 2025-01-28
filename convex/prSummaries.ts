import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const storeSummary = mutation({
  args: {
    pullRequestId: v.id("pullRequests"),
    summary: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("prSummaries", {
      pullRequestId: args.pullRequestId,
      summary: args.summary,
      generatedAt: Date.now(),
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      provider: args.provider,
    });
  },
});

export const getPRSummary = query({
  args: { pullRequestId: v.id("pullRequests") },
  handler: async (ctx, { pullRequestId }) => {
    return await ctx.db
      .query("prSummaries")
      .withIndex("by_pull_request", (q) => q.eq("pullRequestId", pullRequestId))
      .order("desc")
      .first();
  },
}); 