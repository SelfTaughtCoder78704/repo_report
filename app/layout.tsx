"use client";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import "./globals.css";
import { ConvexReactClient } from "convex/react";

const convexClient = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || ""
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk useAuth={useAuth} client={convexClient}>
        <html lang="en">
          <body>
            <nav className="p-4">
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </nav>
            {children}
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
