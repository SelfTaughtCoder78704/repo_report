"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Anthropic } from "@anthropic-ai/sdk";
import { Doc } from "./_generated/dataModel";

export const summarizePR = action({
  args: {
    userId: v.string(),
    pullRequestId: v.id("pullRequests"),
  },
  handler: async (
    ctx,
    { userId, pullRequestId }
  ): Promise<string> => {
    // Get the API key
    const apiKey: string | null = await ctx.runAction(api.providerActions.getDecryptedProviderKey, {
      userId,
      provider: "anthropic",
    });

    if (!apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    // Get PR details
    const pr: Doc<"pullRequests"> | null = await ctx.runQuery(api.pullRequests.getPullRequest, { id: pullRequestId });
    if (!pr) {
      throw new Error("Pull request not found");
    }

    // Initialize Anthropic client
    const anthropic: Anthropic = new Anthropic({ apiKey });

    // Generate summary
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Please provide a concise summary of this pull request. Here are the details:
            Title: ${pr.title}
            Author: ${pr.author}
            Changed Files: ${pr.changedFiles || "unknown"}
            Additions: ${pr.additions || "unknown"}
            Deletions: ${pr.deletions || "unknown"}
            Commits: ${pr.commitCount || "unknown"}
            
            Please focus on the key changes and their potential impact.`,
        },
      ],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : 'No summary generated';

    // Store the summary
    await ctx.runMutation(api.prSummaries.storeSummary, {
      pullRequestId,
      summary,
      model: response.model,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      provider: "anthropic",
    });

    return summary;
  },
}); 
