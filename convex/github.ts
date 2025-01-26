import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

const GITHUB_APP_ID = process.env.GITHUB_APP_ID ?? "";
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY ?? "";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";

interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    type: string;
  };
  repositories_url: string;
  access_tokens_url: string;
}

export const getGitHubInstallations = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's GitHub token from Clerk OAuth
    const githubToken = identity.tokenIdentifier.split("|")[1];
    
    const response = await fetch("https://api.github.com/user/installations", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch GitHub installations");
    }

    const data = await response.json();
    return data.installations as GitHubInstallation[];
  },
});

export const generateWebhookSecret = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Generate a random webhook secret
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },
});

export const getInstallationToken = mutation({
  args: {
    installationId: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // This would typically use the GitHub App's JWT to get an installation token
    // For now, we'll use the user's OAuth token from Clerk
    const githubToken = identity.tokenIdentifier.split("|")[1];
    
    return githubToken;
  },
}); 