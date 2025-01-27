"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useQuery, useAction } from "convex/react";
import { GitHubLogoIcon, PlusIcon } from "@radix-ui/react-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";

interface Repository {
  _id: Id<"repositories">;
  name: string;
  owner: string;
  installationId: number;
  webhookId?: string;
  description?: string;
  createdBy?: string;
}

function DashboardContent() {
  const { user, isLoaded } = useUser();
  const repositories = useQuery(api.repos.listUserRepositories) as
    | Repository[]
    | undefined;
  const availableRepositories = useQuery(
    api.repos.listAvailableRepositories
  ) as Repository[] | undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState<Id<"repositories"> | null>(
    null
  );

  // Change to useAction
  const setupWebhook = useAction(api.github.setupRepositoryWebhooks);

  if (!isLoaded || !user) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  // Log the available user identifiers
  console.log("User identifiers:", {
    id: user.id,
    primaryEmailAddressId: user.primaryEmailAddressId,
    lastSignInAt: user.lastSignInAt,
    createdAt: user.createdAt,
    primaryEmail: user.primaryEmailAddress?.emailAddress,
  });

  // Use only the redirect URI without the state parameter
  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : "http://localhost:3000/dashboard";
  const installUrl = `https://github.com/apps/ai-repo-report/installations/new?redirect_uri=${encodeURIComponent(redirectUri)}`;

  const handleSetupWebhook = async (repoId: Id<"repositories">) => {
    try {
      setIsConfiguring(repoId);
      await setupWebhook({ repositoryId: repoId });
      // No need to refresh as the query will automatically update
    } catch (error) {
      console.error("Error setting up webhook:", error);
      alert("Failed to set up webhook. Please try again.");
    } finally {
      setIsConfiguring(null);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Repositories</h1>
          <p className="text-muted-foreground">
            Manage your connected GitHub repositories
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Repository
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Repository</DialogTitle>
              <DialogDescription>
                Select a repository to connect to AI Repo Report
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {availableRepositories?.map((repo: Repository) => (
                <Card key={repo._id}>
                  <CardHeader>
                    <CardTitle>{repo.name}</CardTitle>
                    <CardDescription>{repo.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {repositories?.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No repositories connected</CardTitle>
              <CardDescription>
                Install the GitHub App to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href={installUrl} className="flex items-center">
                  <GitHubLogoIcon className="mr-2 h-4 w-4" />
                  Install GitHub App
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {repositories?.map((repo: Repository) => (
          <Card key={repo._id}>
            <CardHeader>
              <CardTitle>{`${repo.owner}/${repo.name}`}</CardTitle>
              <CardDescription>
                Installation ID: {repo.installationId}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div>
                <p>
                  Webhook Status:{" "}
                  {repo.webhookId ? (
                    <span className="text-green-600">Configured</span>
                  ) : (
                    <span className="text-yellow-600">Not Configured</span>
                  )}
                </p>
              </div>
              {!repo.webhookId && (
                <Button
                  onClick={() => handleSetupWebhook(repo._id)}
                  disabled={isConfiguring === repo._id}
                >
                  {isConfiguring === repo._id
                    ? "Configuring..."
                    : "Configure Webhook"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
}
