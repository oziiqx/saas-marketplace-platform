"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2, Monitor, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  beginTwoFactorSetupAction,
  changePasswordAction,
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
  revokeSessionAction,
  updateNotificationPreferencesAction,
  updateProfileAction,
} from "@/server/actions/profile";

type Session = { id: string; ip: string | null; userAgent: string | null; createdAt: Date; expires: Date };
type Preference = { channel: string; category: string; enabled: boolean };

export function SecurityCenter({
  profile,
  sessions,
  preferences,
}: {
  profile: { name: string | null; email: string; image: string | null; twoFactorEnabled: boolean };
  sessions: Session[];
  preferences: Preference[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="2fa">Two-factor</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileForm
          profile={profile}
          pending={pending}
          onSave={(data) =>
            startTransition(async () => {
              const r = await updateProfileAction(data);
              if (r.ok) toast.success("Saved");
              else toast.error(r.error);
              router.refresh();
            })
          }
        />
      </TabsContent>

      <TabsContent value="password">
        <PasswordForm
          pending={pending}
          onSave={(data) =>
            startTransition(async () => {
              const r = await changePasswordAction(data);
              if (r.ok) toast.success("Password changed");
              else toast.error(r.error);
            })
          }
        />
      </TabsContent>

      <TabsContent value="2fa">
        <TwoFactorPanel enabled={profile.twoFactorEnabled} onChange={() => router.refresh()} />
      </TabsContent>

      <TabsContent value="sessions">
        <SessionsPanel
          sessions={sessions}
          pending={pending}
          onRevoke={(sessionId) =>
            startTransition(async () => {
              const r = await revokeSessionAction({ sessionId });
              if (r.ok) toast.success("Session revoked");
              else toast.error(r.error);
              router.refresh();
            })
          }
        />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationsPanel
          preferences={preferences}
          pending={pending}
          onSave={(prefs) =>
            startTransition(async () => {
              const r = await updateNotificationPreferencesAction({ preferences: prefs });
              if (r.ok) toast.success("Preferences saved");
              else toast.error(r.error);
            })
          }
        />
      </TabsContent>
    </Tabs>
  );
}

function ProfileForm({
  profile,
  pending,
  onSave,
}: {
  profile: { name: string | null; email: string; image: string | null };
  pending: boolean;
  onSave: (data: { name: string; image: string }) => void;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [image, setImage] = useState(profile.image ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How you appear across the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" value={profile.email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-image">Avatar URL</Label>
          <Input id="p-image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
        </div>
        <Button onClick={() => onSave({ name, image })} disabled={pending || name.length < 2}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordForm({
  pending,
  onSave,
}: {
  pending: boolean;
  onSave: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
}) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cur">Current password</Label>
          <Input id="cur" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new">New password</Label>
          <Input id="new" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button
          onClick={() => onSave({ currentPassword, newPassword, confirmPassword })}
          disabled={pending || !currentPassword || newPassword.length < 8}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}

function TwoFactorPanel({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  const [pending, startTransition] = useTransition();
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (setup) QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 200 }).then(setQr).catch(() => setQr(null));
  }, [setup]);

  const begin = () =>
    startTransition(async () => {
      const r = await beginTwoFactorSetupAction();
      if (r.ok) setSetup(r.data);
      else toast.error(r.error);
    });

  const confirm = () =>
    startTransition(async () => {
      const r = await confirmTwoFactorSetupAction({ token: code });
      if (r.ok) {
        toast.success("2FA enabled");
        setSetup(null);
        onChange();
      } else toast.error(r.error);
    });

  const disable = () =>
    startTransition(async () => {
      const r = await disableTwoFactorAction();
      if (r.ok) {
        toast.success("2FA disabled");
        onChange();
      } else toast.error(r.error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? <ShieldCheck className="text-success size-5" /> : <ShieldOff className="text-muted-foreground size-5" />}
          Two-factor authentication
          {enabled ? <Badge variant="success">on</Badge> : <Badge variant="muted">off</Badge>}
        </CardTitle>
        <CardDescription>Time-based one-time codes (TOTP) - works with any authenticator app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <Button variant="destructive" onClick={disable} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Disable 2FA
          </Button>
        ) : setup ? (
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="2FA QR code" className="rounded-lg border" width={180} height={180} />
              ) : (
                <div className="bg-muted size-[180px] animate-pulse rounded-lg" />
              )}
              <div className="space-y-2 text-sm">
                <p>1. Scan the QR code (or enter the key manually):</p>
                <code className="bg-muted block rounded px-2 py-1 font-mono text-xs break-all">
                  {setup.secret}
                </code>
                <p>2. Enter the 6-digit code it generates:</p>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="w-32"
                  />
                  <Button onClick={confirm} disabled={pending || code.length !== 6}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Verify
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Button onClick={begin} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Set up 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsPanel({
  sessions,
  pending,
  onRevoke,
}: {
  sessions: Session[];
  pending: boolean;
  onRevoke: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Revoke any session you don&apos;t recognise.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No database-backed sessions - this project uses stateless JWT sessions by default.
          </p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Monitor className="text-muted-foreground size-4" />
                <div className="text-sm">
                  <p className="font-medium">{session.userAgent?.slice(0, 40) ?? "Unknown device"}</p>
                  <p className="text-muted-foreground text-xs">
                    {session.ip ?? "-"} · started {formatDistanceToNow(session.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRevoke(session.id)} disabled={pending}>
                Revoke
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

const CATEGORIES = ["BILLING", "SECURITY", "ORDERS", "PRODUCT", "SYSTEM", "MARKETING"] as const;
const CHANNELS = ["EMAIL", "IN_APP"] as const;

function NotificationsPanel({
  preferences,
  pending,
  onSave,
}: {
  preferences: Preference[];
  pending: boolean;
  onSave: (prefs: Preference[]) => void;
}) {
  const [state, setState] = useState<Preference[]>(() =>
    CATEGORIES.flatMap((category) =>
      CHANNELS.map((channel) => ({
        category,
        channel,
        enabled:
          preferences.find((p) => p.category === category && p.channel === channel)?.enabled ?? true,
      })),
    ),
  );

  const toggle = (category: string, channel: string) =>
    setState((prev) =>
      prev.map((p) =>
        p.category === category && p.channel === channel ? { ...p, enabled: !p.enabled } : p,
      ),
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>Choose what reaches your inbox and in-app feed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-medium">
          <span>Category</span>
          <span className="w-16 text-center">Email</span>
          <span className="w-16 text-center">In-app</span>
        </div>
        {CATEGORIES.map((category) => (
          <div key={category} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b pb-3 last:border-0">
            <span className="text-sm capitalize">{category.toLowerCase()}</span>
            {CHANNELS.map((channel) => (
              <div key={channel} className="flex w-16 justify-center">
                <Switch
                  checked={state.find((p) => p.category === category && p.channel === channel)?.enabled ?? true}
                  onCheckedChange={() => toggle(category, channel)}
                />
              </div>
            ))}
          </div>
        ))}
        <Button onClick={() => onSave(state)} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save preferences
        </Button>
      </CardContent>
    </Card>
  );
}
