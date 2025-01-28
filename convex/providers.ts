import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Query to get provider key
export const getProviderKey = query({
  args: { userId: v.string(), provider: v.string() },
  handler: async (ctx, { userId, provider }): Promise<Doc<"providerKeys"> | null> => {
    return await ctx.db
      .query("providerKeys")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .unique();
  },
});

// Store provider API key
export const storeProviderKey = mutation({
  args: {
    provider: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, { provider, apiKey }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate and encrypt the key using the action
    const encryptedKey = await ctx.scheduler.runAfter(0, api.providerActions.validateAndEncryptKey, {
      provider,
      apiKey,
    });

    // Store or update the key
    await ctx.db
      .query("providerKeys")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", identity.subject).eq("provider", provider)
      )
      .unique()
      .then(async (existing) => {
        if (existing) {
          await ctx.db.patch(existing._id, {
            encryptedKey,
            verifiedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("providerKeys", {
            userId: identity.subject,
            provider,
            encryptedKey,
            verifiedAt: Date.now(),
          });
        }
      });

    return true;
  },
});

// Check if a provider is configured
export const getProviderStatus = query({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const key = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", identity.subject).eq("provider", provider)
      )
      .unique();

    return !!key;
  },
}); 