import Link from "next/link";
import { Github, Package } from "lucide-react";

const GITHUB_URL = "https://github.com/ashlessscythe/supli";

export function LandingFooter() {
  return (
    <footer className="border-t py-12">
      <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package className="h-4 w-4 text-primary" />
          <span>Supli Mart</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-foreground transition-colors">
            Register
          </Link>
          <Link href="/forgot-password" className="hover:text-foreground transition-colors">
            Forgot password
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            aria-label="View source on GitHub"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a
            href={`${GITHUB_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            MIT License
          </a>
        </nav>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Supli Mart
        </p>
      </div>
    </footer>
  );
}
