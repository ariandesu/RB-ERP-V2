"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Warehouse, ArrowLeft, ShieldAlert } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-xl mb-2 text-blue-600">
            <Warehouse className="w-8 h-8 font-semibold" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-sans">
            Rosebally ERP
          </h1>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-600" />

          <CardHeader>
            <CardTitle className="text-xl text-slate-800 font-sans font-bold">Password Reset</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Contact your system administrator to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center text-center py-6 space-y-4">
            <ShieldAlert className="w-12 h-12 text-slate-400" />
            <p className="text-sm text-slate-600 max-w-sm">
              Password resets are managed by administrators. Please reach out to your ERP admin
              to have your password reset.
            </p>
          </CardContent>

          <CardFooter>
            <Link href="/login" className="w-full">
              <Button
                type="button"
                variant="outline"
                className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
