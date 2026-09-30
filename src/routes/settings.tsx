import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { getMyProfile, saveMyProfile } from "@/lib/chat/server-fns";
import { useChatSession } from "@/hooks/use-chat-session";
import { MODEL_CATALOG } from "@/lib/ai/models";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="min-h-dvh bg-background" />;
  if (!user) return <RedirectToSignIn to="/login" />;
  return <SettingsInner email={user.primaryEmail} />;
}

function SettingsInner({ email }: { email: string | null }) {
  const session = useChatSession({ signedIn: true });
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [preferredModel, setPreferredModel] = useState("auto");
  const [defaultWebSearch, setDefaultWebSearch] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getMyProfile().then((p) => {
      setDisplayName(p.displayName ?? "");
      setPreferredModel(p.preferredModel);
      setDefaultWebSearch(p.defaultWebSearch);
    });
  }, []);

  return (
    <AppShell
      conversations={session.conversations}
      onRename={session.rename}
      onDelete={session.remove}
    >
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Profile, appearance, and ThunderGPT preferences.
            </p>
          </div>
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-medium">Profile</h2>
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email ?? ""} disabled />
            </div>
          </section>
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-medium">Appearance</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-xl border px-3 py-2 text-sm capitalize ${
                    theme === t ? "border-primary bg-muted" : "border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-medium">AI preferences</h2>
            <div className="space-y-1.5">
              <Label htmlFor="model">Default model</Label>
              <select
                id="model"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
              >
                {MODEL_CATALOG.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              Default web search
              <Switch
                checked={defaultWebSearch}
                onCheckedChange={setDefaultWebSearch}
              />
            </label>
          </section>
          <section className="space-y-2 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <h2 className="font-medium text-foreground">Privacy</h2>
            <p>
              Your chats, files, and generated images stay on your account. ThunderGPT
              does not use them to advertise. Sign out from the sidebar when you are done
              on a shared device.
            </p>
          </section>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveMyProfile({
                  data: { displayName, preferredModel, defaultWebSearch },
                });
                toast.success("Settings saved.");
              } catch {
                toast.error("Could not save settings.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save changes
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
