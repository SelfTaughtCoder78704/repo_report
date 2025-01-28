import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { headers } from "next/headers";
import { getInstallationAccessToken } from "@/convex/github";

interface ErrorWithMessage {
  message: string;
  stack?: string;
  name?: string;
}

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function fetchPRDetails(owner: string, repo: string, prNumber: number, token: string) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch PR details: ${await response.text()}`);
  }

  const pr = await response.json();
  return {
    changedFiles: pr.changed_files,
    additions: pr.additions,
    deletions: pr.deletions,
    commitCount: pr.commits,
  };
}

export async function POST(request: Request) {
  const payload = await request.json();
  const headersList = await headers();
  const signature = headersList.get('x-hub-signature-256') || '';
  const event = headersList.get('x-github-event') || '';
  
  if (!signature || !event) {
    return new Response('Missing signature or event type', { status: 400 });
  }

  try {
    switch (event) {
      case 'installation_repositories': {
        const { installation, repositories_added, repositories_removed } = payload;
        
        // Handle new repositories
        if (repositories_added?.length > 0) {
          console.log('Adding repositories:', repositories_added);
          for (const repo of repositories_added) {
            try {
              await convex.mutation(api.repos.storeRepository, {
                name: repo.name,
                owner: repo.full_name.split('/')[0],
                installationId: installation.id,
                webhookSecret: crypto.randomUUID(), // Generate a unique secret for webhook
              });
            } catch (error) {
              console.error(`Failed to add repository ${repo.full_name}:`, error);
              // Continue with other repositories even if one fails
            }
          }
        }

        // Handle removed repositories (optional - we might want to keep the data)
        if (repositories_removed?.length > 0) {
          console.log('Repositories removed:', repositories_removed);
          // Optionally implement repository removal logic
        }

        break;
      }

      case 'pull_request': {
        const pr = payload.pull_request;
        const repo = payload.repository;
        const installationId = payload.installation.id;

        // First, get the repository ID from our database
        let repository = await convex.query(api.repos.getRepositoryByOwnerAndName, {
          owner: repo.owner.login,
          name: repo.name,
        });

        if (!repository) {
          // If repository is not found, try to add it
          console.log('Repository not found, attempting to add:', repo.full_name);
          const repoId = await convex.mutation(api.repos.storeRepository, {
            name: repo.name,
            owner: repo.owner.login,
            installationId: installationId,
            webhookSecret: crypto.randomUUID(),
          });
          
          if (!repoId) {
            throw new Error(`Failed to add repository: ${repo.owner.login}/${repo.name}`);
          }

          repository = await convex.query(api.repos.getRepositoryByOwnerAndName, {
            owner: repo.owner.login,
            name: repo.name,
          });

          if (!repository) {
            throw new Error(`Failed to fetch newly created repository: ${repo.owner.login}/${repo.name}`);
          }
        }

        // Get a fresh installation token
        const token = await getInstallationAccessToken(installationId);

        // Fetch additional PR details
        const prDetails = await fetchPRDetails(
          repo.owner.login,
          repo.name,
          pr.number,
          token
        );

        // Store PR data in Convex
        await convex.mutation(api.pullRequests.storePullRequest, {
          repositoryId: repository._id,
          prNumber: pr.number,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          state: pr.state,
          baseBranch: pr.base.ref,
          headBranch: pr.head.ref,
          createdAt: new Date(pr.created_at).getTime(),
          updatedAt: new Date(pr.updated_at).getTime(),
          closedAt: pr.closed_at ? new Date(pr.closed_at).getTime() : undefined,
          mergedAt: pr.merged_at ? new Date(pr.merged_at).getTime() : undefined,
          diffUrl: pr.diff_url,
          htmlUrl: pr.html_url,
          changedFiles: prDetails.changedFiles,
          additions: prDetails.additions,
          deletions: prDetails.deletions,
          commitCount: prDetails.commitCount,
        });
        break;
      }
        
      // Add handlers for other events as needed
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    // Log the full error details
    const error = err as ErrorWithMessage;
    console.error("Error processing webhook:", {
      name: error.name || 'UnknownError',
      message: error.message || 'An unknown error occurred',
      stack: error.stack,
      raw: err,
    });
    
    return new Response(error.message || 'Internal Server Error', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
} 
