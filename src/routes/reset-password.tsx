import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!token) {
            toast.error("This reset link is missing a token.");
            return;
          }
          setBusy(true);
          try {
            const { error } = await authClient.resetPassword({
              newPassword: password,
              token,
            });
            if (error) throw new Error(error.message ?? "Could not reset password.");
            toast.success("Password updated. Sign in to continue.");
            await navigate({ to: "/login" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not reset password.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Wordmark compact />
        <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Update password
        </Button>
        <Link to="/login" className="block text-center text-sm text-muted-foreground">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
