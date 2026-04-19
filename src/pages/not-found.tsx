import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-6xl font-bold gradient-text font-serif">404</h1>
          <p className="text-xl text-muted-foreground mt-2">Page not found</p>
          <p className="text-sm text-muted-foreground mt-1">This page seems to have wandered off like a lost electron.</p>
        </div>
        <Link href="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
