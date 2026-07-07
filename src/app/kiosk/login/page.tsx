"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { kioskLogin } from "@/lib/actions/kiosk";

export default function KioskLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    const result = await kioskLogin(password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Incorrect password");
      setPassword("");
      inputRef.current?.focus();
      return;
    }

    router.replace("/kiosk");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Kiosk Locked</CardTitle>
          <p className="text-muted-foreground text-sm">
            Enter the kiosk password to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kiosk password"
              className="text-lg h-14 text-center"
              autoComplete="off"
            />
            {error && (
              <p className="text-destructive text-center text-sm">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={loading || !password.trim()}
            >
              {loading ? "Unlocking..." : "Unlock"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              Back to main login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
