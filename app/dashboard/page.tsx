"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery, useAction } from "convex/react";
import {
  GitHubLogoIcon,
  CheckIcon,
  CaretSortIcon,
} from "@radix-ui/react-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Repository {
  _id: Id<"repositories">;
  name: string;
  owner: string;
  installationId: number;
  webhookId?: string;
  description?: string;
  createdBy?: string;
}

interface PullRequest {
  _id: Id<"pullRequests">;
  prNumber: number;
  title: string;
  author: string;
  state: string;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  mergedAt?: number;
  htmlUrl: string;
  diffUrl: string;
  changedFiles?: number;
  additions?: number;
  deletions?: number;
  commitCount?: number;
}

function DiffViewer({
  diffUrl,
  installationId,
}: {
  diffUrl: string;
  installationId: number;
}) {
  const [diff, setDiff] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const response = await fetch(
          `/api/github/diff?url=${encodeURIComponent(diffUrl)}&installationId=${installationId}`
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const text = await response.text();
        setDiff(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load diff");
        console.error("Error fetching diff:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiff();
  }, [diffUrl, installationId]);

  if (isLoading) {
    return <Skeleton className="h-[100px] w-full" />;
  }

  if (error) {
    return <div className="text-red-500">Error loading diff: {error}</div>;
  }

  const renderDiff = () => {
    const lines = diff.split("\n");
    return lines.map((line, index) => {
      let className = "pl-2 block hover:bg-gray-50 dark:hover:bg-gray-800";
      let linePrefix = "  ";
      let contentClass = "pl-8";

      if (
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ")
      ) {
        // Meta information lines
        className +=
          " bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono text-sm py-1";
        contentClass = "pl-2";
      } else if (line.startsWith("@@")) {
        // Chunk header
        className +=
          " bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-mono text-sm py-1";
        contentClass = "pl-2";
      } else if (line.startsWith("+")) {
        // Added lines
        className +=
          " bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900";
        linePrefix = "+ ";
        contentClass += " text-green-700 dark:text-green-400";
      } else if (line.startsWith("-")) {
        // Removed lines
        className +=
          " bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900";
        linePrefix = "- ";
        contentClass += " text-red-700 dark:text-red-400";
      }

      return (
        <div key={index} className={className}>
          <span className="float-left w-8 select-none text-gray-400 dark:text-gray-500 text-right pr-2 text-sm">
            {!line.startsWith("diff") &&
            !line.startsWith("index") &&
            !line.startsWith("---") &&
            !line.startsWith("+++")
              ? linePrefix
              : ""}
          </span>
          <span
            className={`${contentClass} font-mono text-sm whitespace-pre dark:text-gray-200`}
          >
            {line}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="mt-4 border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <div className="overflow-x-auto">{renderDiff()}</div>
    </div>
  );
}

function PullRequestList({
  repositoryId,
  installationId,
}: {
  repositoryId: Id<"repositories">;
  installationId: number;
}) {
  const pullRequests = useQuery(api.pullRequests.listRepositoryPRs, {
    repositoryId,
  }) as PullRequest[] | undefined;
  const [expandedPRs, setExpandedPRs] = useState<Set<Id<"pullRequests">>>(
    new Set()
  );

  const togglePR = (prId: Id<"pullRequests">) => {
    setExpandedPRs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(prId)) {
        newSet.delete(prId);
      } else {
        newSet.add(prId);
      }
      return newSet;
    });
  };

  if (!pullRequests) {
    return <Skeleton className="h-[100px] w-full" />;
  }

  if (pullRequests.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No pull requests found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pullRequests.map((pr) => (
        <Card key={pr._id}>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    <a
                      href={pr.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      #{pr.prNumber} {pr.title}
                    </a>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => togglePR(pr._id)}
                  >
                    {expandedPRs.has(pr._id) ? "Hide Diff" : "Show Diff"}
                  </Button>
                </div>
                <CardDescription>
                  Opened by {pr.author} on{" "}
                  {new Date(pr.createdAt).toLocaleDateString()}
                </CardDescription>
                {(pr.changedFiles !== undefined ||
                  pr.additions !== undefined ||
                  pr.deletions !== undefined ||
                  pr.commitCount !== undefined) && (
                  <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                    {pr.changedFiles !== undefined && (
                      <span title="Changed Files">
                        📁 {pr.changedFiles}{" "}
                        {pr.changedFiles === 1 ? "file" : "files"}
                      </span>
                    )}
                    {pr.additions !== undefined &&
                      pr.deletions !== undefined && (
                        <span title="Lines Added/Removed">
                          +{pr.additions}/-{pr.deletions}
                        </span>
                      )}
                    {pr.commitCount !== undefined && (
                      <span title="Commits">
                        📦 {pr.commitCount}{" "}
                        {pr.commitCount === 1 ? "commit" : "commits"}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    pr.state === "open"
                      ? "bg-green-100 text-green-800"
                      : pr.state === "closed"
                        ? "bg-red-100 text-red-800"
                        : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {pr.state}
                </span>
              </div>
            </div>
          </CardHeader>
          {expandedPRs.has(pr._id) && (
            <CardContent>
              <DiffViewer
                diffUrl={pr.diffUrl}
                installationId={installationId}
              />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function RepositorySelector({
  repositories,
  selectedRepo,
  onSelect,
}: {
  repositories: Repository[];
  selectedRepo: Repository | null;
  onSelect: (repo: Repository | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredRepos = repositories.filter((repo) =>
    `${repo.owner}/${repo.name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedRepo
            ? `${selectedRepo.owner}/${selectedRepo.name}`
            : "Select a repository..."}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-2" align="start">
        <div className="flex flex-col space-y-2">
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-[300px] overflow-y-auto">
            {filteredRepos.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No repositories found.
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <Button
                  key={repo._id}
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    onSelect(selectedRepo?._id === repo._id ? null : repo);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "h-4 w-4",
                      selectedRepo?._id === repo._id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span>
                    {repo.owner}/{repo.name}
                  </span>
                </Button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RepositoryCard({ repo }: { repo: Repository }) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const setupWebhook = useAction(api.github.setupRepositoryWebhooks);

  const handleSetupWebhook = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsConfiguring(true);
      await setupWebhook({ repositoryId: repo._id });
    } catch (error) {
      console.error("Error setting up webhook:", error);
      alert("Failed to set up webhook. Please try again.");
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${repo.owner}/${repo.name}`}</CardTitle>
        <CardDescription>
          Installation ID: {repo.installationId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
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
            <Button onClick={handleSetupWebhook} disabled={isConfiguring}>
              {isConfiguring ? "Configuring..." : "Configure Webhook"}
            </Button>
          )}
        </div>
        {repo.webhookId && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Pull Requests</h3>
            <PullRequestList
              repositoryId={repo._id}
              installationId={repo.installationId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { user, isLoaded } = useUser();
  const repositories = useQuery(api.repos.listUserRepositories) as
    | Repository[]
    | undefined;
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  if (!isLoaded || !user) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : "http://localhost:3000/dashboard";
  const installUrl = `https://github.com/apps/ai-repo-report/installations/new?redirect_uri=${encodeURIComponent(redirectUri)}`;

  return (
    <div className="h-full">
      <div className="container mx-auto h-full py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Repositories</h1>
            <p className="text-muted-foreground">
              Manage your connected GitHub repositories
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {repositories?.length === 0 ? (
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
          ) : repositories ? (
            <>
              <div className="w-full max-w-2xl">
                <RepositorySelector
                  repositories={repositories}
                  selectedRepo={selectedRepo}
                  onSelect={setSelectedRepo}
                />
              </div>
              {selectedRepo && <RepositoryCard repo={selectedRepo} />}
            </>
          ) : (
            <Skeleton className="h-[200px] w-full" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="h-full">
      <SignedIn>
        <DashboardContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
}
