import { defineSchema, defineTable } from "convex/server"; // Importing functions to define schema and tables
import { v } from "convex/values"; // Importing value validation utility

export default defineSchema({
  users: defineTable({
    username: v.string(), // Define 'username' field as a string
    imageUrl: v.string(), // Define 'imageUrl' field as a string
    clerkId: v.string(), // Define 'clerkId' field as a string
    email: v.string(), // Define 'email' field as a string
    currentOrganization: v.optional(v.string()), // Define 'currentOrganization' field as an optional string
  })
    .index("by_clerk_id", ["clerkId"]) // Create an index on 'clerkId' field
    .index("by_email", ["email"]) // Create an index on 'email' field
    .index("by_current_organization", ["currentOrganization"]),

  repositories: defineTable({
    name: v.string(),
    owner: v.string(),
    installationId: v.number(),
    webhookSecret: v.string(),
    webhookId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_owner_and_name", ["owner", "name"])
    .index("by_created_by", ["createdBy"]),

  pullRequests: defineTable({
    repositoryId: v.id("repositories"),
    prNumber: v.number(),
    title: v.string(),
    author: v.string(),
    state: v.string(), // "open", "closed", "merged"
    baseBranch: v.string(),
    headBranch: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    closedAt: v.optional(v.number()),
    mergedAt: v.optional(v.number()),
    diffUrl: v.string(),
    htmlUrl: v.string(),
    // Additional PR details - optional for backward compatibility
    changedFiles: v.optional(v.number()),
    additions: v.optional(v.number()),
    deletions: v.optional(v.number()),
    commitCount: v.optional(v.number()),
  })
    .index("by_repository", ["repositoryId"])
    .index("by_number", ["repositoryId", "prNumber"])
    .index("by_state", ["state"]),

  prSummaries: defineTable({
    pullRequestId: v.id("pullRequests"),
    summary: v.string(),
    generatedAt: v.number(),
    model: v.string(), // e.g., "gpt-4-turbo-preview"
    promptTokens: v.number(),
    completionTokens: v.number(),
    provider: v.string(), // 'anthropic' or 'openai'
  })
    .index("by_pull_request", ["pullRequestId"]),

  providerKeys: defineTable({
    userId: v.string(),
    provider: v.string(),
    encryptedKey: v.string(),
    verifiedAt: v.number(),
  })
    .index("by_user_and_provider", ["userId", "provider"])
    .searchIndex("search_by_user", {
      searchField: "userId",
    }),
});
