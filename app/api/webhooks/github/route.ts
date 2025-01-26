import { headers } from 'next/headers';
import { WebhookEvent } from '@octokit/webhooks-types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const payload = await request.json() as WebhookEvent;
  const headersList = headers();
  
  // Verify GitHub webhook signature
  const signature = headersList.get('x-hub-signature-256');
  const event = headersList.get('x-github-event');
  
  if (!signature || !event) {
    return new Response('Missing signature or event type', { status: 400 });
  }

  try {
    switch (event) {
      case 'pull_request':
        // Handle pull request events
        if (payload.action === 'opened' || payload.action === 'synchronize' || 
            payload.action === 'reopened' || payload.action === 'closed') {
          const pr = payload.pull_request;
          
          // Store PR data in Convex
          await convex.mutation(api.pullRequests.storePullRequest, {
            repositoryId: '', // TODO: Look up repository ID from owner/name
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
        }
        break;
        
      // Add handlers for other events as needed
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 