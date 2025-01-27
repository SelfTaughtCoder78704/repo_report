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

  availableRepositories: defineTable({
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
  }),

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
  })
    .index("by_pull_request", ["pullRequestId"]),
});
