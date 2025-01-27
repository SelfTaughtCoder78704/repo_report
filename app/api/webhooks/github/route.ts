import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { headers } from "next/headers";

interface ErrorWithMessage {
  message: string;
  stack?: string;
  name?: string;
}

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
      case 'pull_request': {
        const pr = payload.pull_request;
    const repo = payload.repository;

    // First, get the repository ID from our database
    const repository = await convex.query(api.repos.getRepositoryByOwnerAndName, {
      owner: repo.owner.login,
      name: repo.name,
    });

    if (!repository) {
      throw new Error(`Repository not found: ${repo.owner.login}/${repo.name}`);
    }

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
        });
        break;
      }
        
      // Add handlers for other events as needed
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return new Response('OK', { status: 200 });
  } catch (err: unknown) {
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
