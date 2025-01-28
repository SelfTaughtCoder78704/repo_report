"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { encrypt, decrypt } from "./encryption";
import { Anthropic } from "@anthropic-ai/sdk";
import { api } from "./_generated/api";

// Validate and encrypt provider API key
export const validateAndEncryptKey = action({
  args: {
    provider: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, { provider, apiKey }): Promise<string> => {
    // Validate the API key before encrypting
    if (provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey });
      try {
        // Make a test API call
        await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        });
      } catch {
        throw new Error("Invalid Anthropic API key");
      }
    }

    // Encrypt the API key
    return await encrypt(apiKey);
  },
});

// Get decrypted provider key
export const getDecryptedProviderKey = action({
  args: { userId: v.string(), provider: v.string() },
  handler: async (ctx, { userId, provider }): Promise<string | null> => {
    const key = await ctx.runQuery(api.providers.getProviderKey, { userId, provider });

    if (!key) {
      return null;
    }

    return decrypt(key.encryptedKey);
  },
}); 
