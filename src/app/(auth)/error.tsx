"use client";

import { Button } from "@/components/ui/button";
import { Warehouse, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-2xl text-red-500">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Authentication Error</h1>
        <p className="text-sm text-slate-500">
          Something went wrong during authentication. Please try signing in again.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Link href="/login">
            <Button variant="outline" className="rounded-xl cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
