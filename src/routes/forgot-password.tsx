import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const res = await fetch("/api/auth/forget-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                redirectTo: "/reset-password",
              }),
            });
            if (!res.ok) {
              toast.error(
                "Password reset email is not configured yet. Sign in with Google or create a new account.",
              );
            } else {
              toast.success("If that email exists, a reset link is on its way.");
            }
          } catch {
            toast.error(
              "Password reset email is not configured yet. Sign in with Google or create a new account.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Wordmark compact />
        <h1 className="font-display text-2xl font-semibold">Reset password</h1>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Send reset link
        </Button>
        <Link to="/login" className="block text-center text-sm text-muted-foreground">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
