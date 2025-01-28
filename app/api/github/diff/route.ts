import { NextResponse } from "next/server";
import { getInstallationAccessToken } from "@/convex/github";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const diffUrl = searchParams.get("url");
  const installationId = searchParams.get("installationId");

  if (!diffUrl) {
    return new Response("Missing diff URL", { status: 400 });
  }

  if (!installationId) {
    return new Response("Missing installation ID", { status: 400 });
  }

  try {
    // Get a fresh GitHub token
    const token = await getInstallationAccessToken(parseInt(installationId));

    // Extract owner, repo, and PR number from the diff URL
    // Example URL: https://github.com/owner/repo/pull/7.diff
    const match = diffUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)\.diff/);
    if (!match) {
      throw new Error("Invalid diff URL format");
    }

    const [, owner, repo, prNumber] = match;

    // Use the GitHub API to fetch the diff
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.diff",
        },
      }
    );

    if (!response.ok) {
      console.error("GitHub API Error:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
      throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
    }

    const diff = await response.text();
    
    return new Response(diff, {
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching diff:", error);
    return new Response(
      error instanceof Error ? error.message : "Failed to fetch diff",
      { status: 500 }
    );
  }
} 
