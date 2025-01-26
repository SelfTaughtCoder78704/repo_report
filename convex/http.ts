import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Id } from "./_generated/dataModel";

/**
 * Validates and verifies the incoming webhook payload from Clerk
 */
const validatePayload = async (
  req: Request
): Promise<WebhookEvent | undefined> => {
  const payload = await req.text();
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };

  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  try {
    const event = webhook.verify(payload, svixHeaders) as WebhookEvent;
    return event;
  } catch (error) {
    console.error(error);
    return;
  }
};

/**
 * Main webhook handler for Clerk events
 */
const handleClerkWebhook = httpAction(
  async (ctx, req) => {
    const event = await validatePayload(req);

    if (!event) {
      return new Response('Invalid payload', { status: 400 });
    }

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await ctx.runMutation(internal.users.createUser, {
          clerkId: event.data.id,
          email: event.data.email_addresses?.[0]?.email_address ?? "",
          username: `${event.data.first_name ?? ""} ${event.data.last_name ?? ""}`.trim(),
          imageUrl: event.data.image_url ?? "",
        });
        break;
        
      case 'user.deleted':
        await ctx.runMutation(internal.users.deleteUser, {
          clerkId: event.data.id as Id<"users">,
        });
        break;

      case 'organization.created':
        console.log('Clerk webhook: Organization created', {
          orgId: event.data.id,
          name: event.data.name,
          slug: event.data.slug
        });
        // TODO: Implement organization creation
        break;

      case 'organization.updated':
        console.log('Clerk webhook: Organization updated', {
          orgId: event.data.id,
          name: event.data.name,
          slug: event.data.slug
        });
        // TODO: Implement organization update
        break;
      
      case 'organization.deleted':
        console.log('Clerk webhook: Organization deleted', {
          orgId: event.data.id
        });
        // TODO: Implement organization deletion
        break;

      case 'organizationMembership.created':
      case 'organizationMembership.updated':
        console.log('Clerk webhook: Organization membership created/updated', {
          orgId: event.data.organization.id,
          orgName: event.data.organization.name,
          userId: event.data.public_user_data.user_id,
          userEmail: event.data.public_user_data.identifier,
          role: event.data.role
        });
        // TODO: Implement organization membership creation/update
        break;

      case 'organizationMembership.deleted':
        console.log('Clerk webhook: Organization membership deleted', {
          orgId: event.data.organization.id,
          orgName: event.data.organization.name,
          userId: event.data.public_user_data.user_id,
          userEmail: event.data.public_user_data.identifier
        });
        // TODO: Implement organization membership deletion
        break;

      default:
        console.log('Clerk webhook: Unsupported event', {
          eventType: event.type,
          data: event.data
        });
    }
    return new Response(null, { status: 200 });
  }
);

const http = httpRouter();

http.route({
  path: '/clerk-users-webhook',
  method: 'POST',
  handler: handleClerkWebhook
});

export default http;
