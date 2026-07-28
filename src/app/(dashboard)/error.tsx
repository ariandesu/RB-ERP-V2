"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Warehouse, AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-2xl text-red-500">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Something went wrong</h1>
        <p className="text-sm text-slate-500">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">Error ID: {error.digest}</p>
        )}
        <Button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
