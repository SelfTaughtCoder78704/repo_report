"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { SignJWT, importJWK } from "jose";
import * as forge from "node-forge";

// Function to generate random bytes for webhook secret
function generateRandomBytes(length: number): string {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Function to convert forge bignum to base64url without using Buffer
function bigNumToBase64Url(bn: forge.jsbn.BigInteger): string {
  // Convert bignum to hex string
  const hex = bn.toString(16);
  // Ensure even length by padding with leading zero if needed
  const paddedHex = hex.length % 2 ? '0' + hex : hex;
  
  // Convert hex to bytes
  const bytes = [];
  for (let i = 0; i < paddedHex.length; i += 2) {
    bytes.push(parseInt(paddedHex.slice(i, i + 2), 16));
  }

  // Convert bytes to base64
  const base64 = btoa(String.fromCharCode(...bytes));
  
  // Convert base64 to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Function to generate a GitHub App JWT
async function generateGitHubAppJWT() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error(
      "Missing required environment variables. Please set GITHUB_APP_ID and GITHUB_PRIVATE_KEY in your Convex dashboard."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued 60 seconds ago
    exp: now + (10 * 60), // Expires in 10 minutes
    iss: appId,
  };

  // Replace literal \n with actual newlines in the private key
  const formattedKey = privateKey
    .replace(/\\n/g, '\n')
    .trim();

  // Parse the RSA private key
  const privateKeyObj = forge.pki.privateKeyFromPem(formattedKey);
  const rsaPrivateKey = privateKeyObj as forge.pki.rsa.PrivateKey;

  // Create a JWK from the RSA key components
  const jwk = {
    kty: 'RSA',
    alg: 'RS256',
    use: 'sig',
    key_ops: ['sign'],
    n: bigNumToBase64Url(rsaPrivateKey.n),
    e: bigNumToBase64Url(rsaPrivateKey.e),
    d: bigNumToBase64Url(rsaPrivateKey.d),
    p: bigNumToBase64Url(rsaPrivateKey.p),
    q: bigNumToBase64Url(rsaPrivateKey.q),
    dp: bigNumToBase64Url(rsaPrivateKey.dP),
    dq: bigNumToBase64Url(rsaPrivateKey.dQ),
    qi: bigNumToBase64Url(rsaPrivateKey.qInv),
  };

  // Import the private key
  const privateKeyObject = await importJWK(jwk, 'RS256');

  // Create a JWT using jose
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKeyObject);

  return token;
}

// Define the GitHub repository type
interface GitHubRepository {
  name: string;
  owner: {
    login: string;
  };
  description?: string | null;
}

// Function to get an installation access token from GitHub
export async function getInstallationAccessToken(installationId: number) {
  try {
    const jwt = await generateGitHubAppJWT();
    console.log("Generated JWT for GitHub App");

    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("GitHub API Error:", error);
      throw new Error(`Failed to get installation token: ${error}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error getting installation token:", error);
    throw error;
  }
}

// Function to fetch repositories for an installation
export async function fetchInstallationRepositories(installationId: number, token: string) {
  try {
    console.log("Fetching repositories with token");
    let page = 1;
    let allRepositories: GitHubRepository[] = [];
    
    while (true) {
      const response = await fetch(
        `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("GitHub API Error:", error);
        throw new Error(`Failed to fetch repositories: ${error}`);
      }

      const data = await response.json();
      const repositories = data.repositories as GitHubRepository[];
      
      if (repositories.length === 0) {
        break; // No more repositories to fetch
      }
      
      allRepositories = [...allRepositories, ...repositories];
      console.log(`Fetched ${repositories.length} repositories on page ${page}`);
      
      // Check if we have more pages
      const linkHeader = response.headers.get('link');
      if (!linkHeader?.includes('rel="next"')) {
        break; // No more pages
      }
      
      page++;
    }

    console.log(`Total repositories fetched: ${allRepositories.length}`);
    return allRepositories;
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
}

// Function to configure webhook for a repository
export async function configureRepositoryWebhook(
  owner: string,
  repo: string,
  webhookSecret: string,
  token: string,
  webhookUrl: string
) {
  try {
    console.log(`Configuring webhook for ${owner}/${repo}`);
    console.log(`Using webhook URL: ${webhookUrl}`);
    
    const webhookConfig = {
      name: "web",
      active: true,
      events: ["pull_request", "pull_request_review", "pull_request_review_comment"],
      config: {
        url: webhookUrl,
        content_type: "json",
        secret: webhookSecret,
        insecure_ssl: "1",  // Allow self-signed certs for ngrok
      },
    };
    
    console.log('Webhook configuration:', JSON.stringify(webhookConfig, null, 2));
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookConfig),
      }
    );

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    if (!response.ok) {
      console.error("GitHub API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
          'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
          'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
        },
        response: responseData,
      });
      throw new Error(`Failed to configure webhook: ${JSON.stringify(responseData)}`);
    }

    console.log('Webhook created successfully:', responseData);
    return responseData.id;
  } catch (error) {
    console.error("Error configuring webhook:", error);
    throw error;
  }
}

export const processInstallation = action({
  args: {
    installationId: v.number(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Starting GitHub installation handler");

      // Get user from Clerk ID (if provided)
      let user = undefined;
      if (args.userId) {
        user = await ctx.runQuery(internal.repos.getUserByClerkId, {
          clerkId: args.userId,
        });
      }
      
      // Get installation access token
      console.log("Getting installation token...");
      const token = await getInstallationAccessToken(args.installationId);

      // Fetch repositories for this installation
      console.log("Fetching repositories...");
      const repositories = await fetchInstallationRepositories(args.installationId, token);
      console.log(`Found ${repositories.length} repositories`);

      // Store each repository
      for (const repo of repositories) {
        // Generate a webhook secret for this repository
        const webhookSecret = await generateRandomBytes(32);

        try {
          // Add repository using the mutation
          await ctx.runMutation(internal.repos.addRepository, {
            name: repo.name,
            owner: repo.owner.login,
            installationId: args.installationId,
            webhookSecret,
            userId: user?._id, // Make it optional
          });
        } catch (err) {
          console.error("Error adding repository:", err);
          // Continue with other repositories even if one fails
        }
      }

      return repositories.length;
    } catch (error) {
      console.error("Error in processInstallation:", error);
      throw error;
    }
  },
});

export const setupRepositoryWebhooks = action({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    // Get the repository
    const repository = await ctx.runQuery(internal.repos.getRepository, {
      id: args.repositoryId,
    });

    if (!repository) {
      throw new Error("Repository not found");
    }

    // Get an installation access token
    const token = await getInstallationAccessToken(repository.installationId);

    // Get the webhook URL (using the environment variable)
    const baseUrl = process.env.PUBLIC_APP_URL || '';
    
    // Clean up the URL and ensure it uses ngrok.io domain
    const cleanBaseUrl = baseUrl
      .replace(/^https?:\/\//, '') // Remove any existing protocol
      .replace(/\/$/, ''); // Remove trailing slash
    
    // Ensure we're using the ngrok-free.app domain
    const webhookUrl = `https://${cleanBaseUrl}/api/webhooks/github`;

    console.log('Using webhook URL:', webhookUrl); // Debug log
    
    // Additional validation for ngrok URLs
    if (!cleanBaseUrl.includes('ngrok-free.app')) {
      throw new Error('PUBLIC_APP_URL must be a valid ngrok URL (*.ngrok-free.app)');
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(webhookUrl);
      if (!parsedUrl.hostname.endsWith('ngrok-free.app')) {
        throw new Error('Invalid ngrok URL format');
      }
    } catch (_) {
      throw new Error(`Invalid webhook URL: ${webhookUrl}. Please check your PUBLIC_APP_URL environment variable.`);
    }

    // Configure the webhook
    const webhookId = await configureRepositoryWebhook(
      repository.owner,
      repository.name,
      repository.webhookSecret,
      token,
      webhookUrl
    );

    // Update the repository with the webhook ID
    await ctx.runMutation(internal.repos.updateRepositoryWebhook, {
      id: repository._id,
      webhookId: webhookId.toString(),
    });

    return webhookId;
  },
});