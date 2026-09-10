"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/admin/status-badge";
import { API_SCOPES } from "@/lib/validations/api-key";

const maskApiKey = (prefix: string, lastFour: string) =>
  `${prefix}${"•".repeat(24)}${lastFour}`;
import { createApiKeyAction, revokeApiKeyAction } from "@/server/actions/api-keys";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  scopes: string[];
  rateLimitPerMin: number;
  status: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  totalRequests: number;
};

export function ApiKeysManager({ keys }: { keys: ApiKeyRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["products:read"]);
  const [rateLimit, setRateLimit] = useState(120);
  const [expiresInDays, setExpiresInDays] = useState<string>("");

  const create = () => {
    startTransition(async () => {
      const result = await createApiKeyAction({
        name,
        scopes,
        rateLimitPerMin: rateLimit,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });
      if (result.ok) {
        setNewKey(result.data.rawKey);
        setCreateOpen(false);
        setName("");
        setScopes(["products:read"]);
        toast.success("API key created");
      } else {
        toast.error(result.error);
      }
    });
  };

  const revoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeApiKeyAction({ id });
      if (result.ok) toast.success("Key revoked");
      else toast.error(result.error);
    });
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New API key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Scopes and rate limit are enforced on every request to <code>/api/v1</code>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production server"
                />
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {API_SCOPES.map((scope) => (
                    <label key={scope} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={scopes.includes(scope)}
                        onCheckedChange={(checked) =>
                          setScopes((prev) =>
                            checked ? [...prev, scope] : prev.filter((s) => s !== scope),
                          )
                        }
                      />
                      <span className="font-mono text-xs">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate limit (rpm)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp">Expires in (days)</Label>
                  <Input
                    id="exp"
                    type="number"
                    placeholder="never"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={pending || name.length < 2 || scopes.length === 0}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {newKey ? (
        <Alert variant="warning">
          <TriangleAlert className="size-4" />
          <AlertTitle>Copy your key now - it won&apos;t be shown again</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex w-full items-center gap-2">
              <code className="bg-background flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
                {newKey}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(newKey)}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
                Done
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {keys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <KeyRound className="text-muted-foreground size-8" />
            <p className="font-medium">No API keys yet</p>
            <p className="text-muted-foreground text-sm">Create one to start calling the API.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {keys.map((key) => (
            <Card key={key.id}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {key.name}
                    <StatusBadge status={key.status} />
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {maskApiKey(key.prefix, key.lastFour)}
                  </CardDescription>
                </div>
                {key.status === "ACTIVE" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => revoke(key.id)}
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                    Revoke
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {key.scopes.map((scope) => (
                    <Badge key={scope} variant="muted" className="font-mono text-[11px]">
                      {scope}
                    </Badge>
                  ))}
                </div>
                <span className="text-muted-foreground">{key.rateLimitPerMin} rpm</span>
                <span className="text-muted-foreground">
                  {key.totalRequests.toLocaleString()} requests
                </span>
                <span className="text-muted-foreground">
                  {key.lastUsedAt
                    ? `used ${formatDistanceToNow(key.lastUsedAt, { addSuffix: true })}`
                    : "never used"}
                </span>
                {key.expiresAt ? (
                  <span className="text-muted-foreground">
                    expires {formatDistanceToNow(key.expiresAt, { addSuffix: true })}
                  </span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
