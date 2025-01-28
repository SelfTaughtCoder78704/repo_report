"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";

function ProviderKeyForm({
  provider,
  title,
  description,
}: {
  provider: string;
  title: string;
  description: string;
}) {
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const storeKey = useMutation(api.providers.storeProviderKey);
  const isConfigured = useQuery(api.providers.getProviderStatus, { provider });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSubmitting(true);
    try {
      await storeKey({ provider, apiKey: apiKey.trim() });
      toast({
        title: "API Key Configured",
        description: `Successfully configured ${title} API key.`,
      });
      setApiKey("");
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description:
          error instanceof Error ? error.message : "Failed to store API key",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {isConfigured && (
            <span className="text-sm font-normal text-green-600">
              ✓ Configured
            </span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {isConfigured
                ? "Update existing key or leave blank to keep current key"
                : "Enter your API key to enable this provider"}
            </p>
          </div>
          <Button type="submit" disabled={isSubmitting || !apiKey.trim()}>
            {isSubmitting
              ? "Configuring..."
              : isConfigured
                ? "Update Key"
                : "Save Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingsContent() {
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI providers and preferences
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">AI Providers</h2>
          <div className="grid gap-6">
            <ProviderKeyForm
              provider="anthropic"
              title="Anthropic"
              description="Configure your Anthropic API key to use Claude for PR summaries and analysis."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <SignedIn>
        <SettingsContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
}
