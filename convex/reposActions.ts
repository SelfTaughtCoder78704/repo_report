"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { getInstallationAccessToken, fetchInstallationRepositories } from "./github";

interface GitHubRepository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
}

export const fetchAvailableRepositories = action({
  handler: async (ctx): Promise<GitHubRepository[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.repos.getUserByClerkId, {
      clerkId: identity.subject,
    }) as Doc<"users"> | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Get all repositories the user has already added
    const existingRepos = await ctx.runQuery(internal.repos.getUserRepositories, {
      userId: user._id,
    }) as Doc<"repositories">[];

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
    const existingRepoKeys = new Set<string>(
      existingRepos.map((repo) => `${repo.owner}/${repo.name}`)
    );

    return allRepos.filter(
      (repo: GitHubRepository) => !existingRepoKeys.has(`${repo.owner.login}/${repo.name}`)
    );
  },
}); 