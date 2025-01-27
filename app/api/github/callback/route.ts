export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action') || 'install';

  if (!installationId) {
    throw new Error('No installation ID provided');
  }

  // Get the Convex site URL for HTTP actions
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.cloud', '.site');
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  }

  // In development, use the PUBLIC_APP_URL environment variable if set
  let baseUrl = process.env.PUBLIC_APP_URL;
  
  if (!baseUrl) {
    // Fallback to request headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    baseUrl = `${protocol}://${host}`;
  }

  const redirectUri = `${baseUrl}/dashboard`;
  console.log('Redirecting to:', redirectUri); // Debug log

  const actionUrl = new URL('/github/handleGitHubInstallation', convexUrl);
  actionUrl.searchParams.set('installation_id', installationId);
  actionUrl.searchParams.set('redirect_uri', redirectUri);
  if (setupAction) {
    actionUrl.searchParams.set('setup_action', setupAction);
  }

  return Response.redirect(actionUrl.toString());
} 