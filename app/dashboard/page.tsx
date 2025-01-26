"use client";

import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <UserButton />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Welcome to your dashboard!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            This is a protected page that can only be accessed by authenticated
            users.
          </p>
        </div>
      </div>
    </div>
  );
}
