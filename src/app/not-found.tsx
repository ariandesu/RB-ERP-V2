import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Warehouse, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-400">
          <Warehouse className="w-10 h-10" />
        </div>
        <h1 className="text-6xl font-bold text-slate-300">404</h1>
        <h2 className="text-xl font-bold text-slate-800">Page Not Found</h2>
        <p className="text-sm text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
