"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Settings2, KeyRound, Mail, MessageSquare, Cloud, Webhook } from "lucide-react";

// Credential types per Phase 4 spec
type CredentialKey =
  | "APIFY_TOKEN"
  | "S2D_ALERT_WHATSAPP_TOKEN"
  | "S2D_ALERT_EMAIL_TOKEN"
  | "S2D_BURP_DAST_API_KEY"
  | "S2D_BURP_DAST_GRAPHQL_URL"
  | "S2D_NETWORK_EVIDENCE_PRIVACY_KEY"
  | "S2D_APIFY_WEBHOOK_SHARED_SECRET"
  | "TIKTOK_API_KEY";

interface CredentialConfig {
  key: CredentialKey;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
}

const CREDENTIALS: CredentialConfig[] = [
  { key: "APIFY_TOKEN", label: "Apify Token", hint: "From console.apify.com — live-verified via GET https://api.apify.com/v2/users/me", icon: Cloud, placeholder: "apify_api_••••••••" },
  { key: "S2D_ALERT_WHATSAPP_TOKEN", label: "WhatsApp Alert Token", hint: "WhatsApp Cloud API token for S2D alert delivery", icon: MessageSquare, placeholder: "EAAxxxxx••••" },
  { key: "S2D_ALERT_EMAIL_TOKEN", label: "Email Alert Token", hint: "SendGrid API key — live-verified against the provider profile endpoint", icon: Mail, placeholder: "SG.••••" },
  { key: "TIKTOK_API_KEY", label: "TikTok API Key", hint: "Format-validated unless S2D_TIKTOK_CREDENTIAL_TEST_URL is configured server-side", icon: KeyRound, placeholder: "tiktok_api_••••" },
  { key: "S2D_BURP_DAST_API_KEY", label: "Burp DAST API Key", hint: "Burp Suite DAST API key (optional, only if active scans proxied)", icon: ShieldCheck, placeholder: "burp_••••" },
  { key: "S2D_BURP_DAST_GRAPHQL_URL", label: "Burp DAST GraphQL URL", hint: "GraphQL endpoint for Burp DAST", icon: ShieldCheck, placeholder: "https://burp.example.com/graphql" },
  { key: "S2D_NETWORK_EVIDENCE_PRIVACY_KEY", label: "Network Evidence Privacy Key", hint: "Privacy key for authorized network evidence", icon: ShieldCheck, placeholder: "priv_••••" },
  { key: "S2D_APIFY_WEBHOOK_SHARED_SECRET", label: "Apify Webhook Shared Secret", hint: "HMAC shared secret for Apify webhook receiver (32+ chars)", icon: Webhook, placeholder: "whsec_••••" },
];

const EMPTY_CREDENTIAL_VALUES: Record<CredentialKey, string> = {
  APIFY_TOKEN: "",
  S2D_ALERT_WHATSAPP_TOKEN: "",
  S2D_ALERT_EMAIL_TOKEN: "",
  S2D_BURP_DAST_API_KEY: "",
  S2D_BURP_DAST_GRAPHQL_URL: "",
  S2D_NETWORK_EVIDENCE_PRIVACY_KEY: "",
  S2D_APIFY_WEBHOOK_SHARED_SECRET: "",
  TIKTOK_API_KEY: "",
};

interface VaultEntry {
  key: CredentialKey;
  masked: string;
  verified: boolean;
  verifiedAt?: string;
  provider?: string;
  verificationMode?: "LIVE_PROVIDER" | "LOCAL_CRYPTO" | "FORMAT_ONLY";
  source?: "environment" | "dynamic.vault";
}

export function S2DCredentialSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tokens, setTokens] = useState<Record<CredentialKey, string>>({ ...EMPTY_CREDENTIAL_VALUES });
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<CredentialKey | null>(null);
  const [vault, setVault] = useState<Record<string, VaultEntry>>({});
  const [result, setResult] = useState<{ key: CredentialKey; status: "PASS" | "FAIL"; message: string } | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [loadingVault, setLoadingVault] = useState(false);

  function authHeaders(): Record<string, string> {
    return accessToken.trim() ? { Authorization: `Bearer ${accessToken.trim()}` } : {};
  }

  async function loadVault() {
    setLoadingVault(true);
    setAuthMessage("");
    try {
      const res = await fetch("/api/s2d/credentials", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthMessage(data.error || "Enter the production S2D operator token to load the vault.");
        return;
      }
      if (data.vault) setVault(data.vault);
      setAuthMessage("Authenticated — masked credential status loaded.");
    } catch {
      setAuthMessage("Unable to connect to the credential vault.");
    } finally {
      setLoadingVault(false);
    }
  }

  // Development mode can load without a token. Production fails closed and
  // asks the operator for the server-configured S2D_AUTH_TOKEN. The access
  // token is intentionally not persisted or auto-submitted per keypress.
  useEffect(() => {
    if (open) void loadVault();
  }, [open]);

  async function handleVerify(key: CredentialKey) {
    const token = tokens[key]?.trim();
    if (!token) {
      setResult({ key, status: "FAIL", message: "Token is required" });
      return;
    }
    setVerifying(key);
    setResult(null);
    try {
      const res = await fetch("/api/s2d/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ key, token }),
      });
      const data = await res.json();
      if (data.verified) {
        setVault((prev) => ({
          ...prev,
          [key]: {
            key,
            masked: data.masked,
            verified: true,
            verifiedAt: data.verifiedAt,
            provider: data.provider,
            verificationMode: data.verificationMode,
            source: "dynamic.vault",
          },
        }));
        setResult({ key, status: "PASS", message: data.message || "VERIFIED PASS — token live-verified against provider" });
        // Clear the input for security (never keep raw token in UI longer than needed)
        setTokens((prev) => ({ ...prev, [key]: "" }));
      } else {
        setResult({ key, status: "FAIL", message: data.error || data.message || "Verification failed" });
      }
    } catch (e: any) {
      setResult({ key, status: "FAIL", message: e?.message || "Network error" });
    } finally {
      setVerifying(null);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAccessToken("");
      setTokens({ ...EMPTY_CREDENTIAL_VALUES });
      setShow({});
      setResult(null);
      setAuthMessage("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-mlk" /> Gear Settings — S2D Credentials
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure Apify, WhatsApp, TikTok and DAST credentials. Tokens are live-verified against their provider
            (e.g. Apify <code className="bg-muted px-1 rounded">GET https://api.apify.com/v2/users/me</code>) before
            before committing to the process-local dynamic vault. Local HMAC/format checks are explicitly labelled and are
            not presented as live provider tests. Raw tokens are <strong>NEVER</strong> returned to the browser — only masked
            metadata like <code className="bg-muted px-1 rounded">apif***9x2a</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 text-xs text-muted-foreground">
              <strong className="text-amber-700 dark:text-amber-400">Security note:</strong> Production keys are swapped via{" "}
              <code>npx wrangler secret put APIFY_TOKEN</code> (and the other keys). Do not bake real secrets into client bundles.
              Dynamic entries are process-local and can disappear on a Worker cold start, so Wrangler secrets remain the durable production source. The data boundary guard remains enabled — only aggregate public signals cross the PIP exchange boundary.
            </CardContent>
          </Card>

          <Card className="border-mlk/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-mlk" /> Operator authentication
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Production only: enter the server-configured <code>S2D_AUTH_TOKEN</code>. It stays in this modal&apos;s memory and is never saved by the browser.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(event) => setAccessToken(event.target.value)}
                  placeholder="S2D operator access token"
                  autoComplete="off"
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={() => void loadVault()} disabled={loadingVault}>
                  {loadingVault ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authenticate"}
                </Button>
              </div>
              {authMessage && <p className="text-[11px] text-muted-foreground">{authMessage}</p>}
            </CardContent>
          </Card>

          {CREDENTIALS.map((cfg) => {
            const Icon = cfg.icon;
            const entry = vault[cfg.key];
            const isVerifying = verifying === cfg.key;
            return (
              <Card key={cfg.key} className="border-mlk/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4 text-mlk" /> {cfg.label}
                    {entry?.verified ? (
                      <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {entry.verificationMode === "LIVE_PROVIDER" ? "LIVE VERIFIED" : entry.verificationMode === "LOCAL_CRYPTO" ? "LOCAL CHECK" : "FORMAT CHECK"}
                      </Badge>
                    ) : entry ? (
                      <Badge variant="outline" className="ml-auto text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                        <AlertCircle className="h-3 w-3 mr-1" /> STORED
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">{cfg.hint}</p>
                  {entry && (
                    <p className="text-[11px] font-mono bg-muted px-2 py-1 rounded">
                      Vault: <span className="font-semibold">{entry.masked}</span>
                      {entry.verifiedAt && <span className="text-muted-foreground"> · verified {new Date(entry.verifiedAt).toLocaleString()}</span>}
                      {entry.provider && <span className="text-muted-foreground"> · via {entry.provider}</span>}
                      {entry.source && <span className="text-muted-foreground"> · {entry.source}</span>}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Label htmlFor={`cred-${cfg.key}`} className="sr-only">
                        {cfg.label}
                      </Label>
                      <Input
                        id={`cred-${cfg.key}`}
                        type={show[cfg.key] ? "text" : "password"}
                        value={tokens[cfg.key]}
                        onChange={(e) => setTokens((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                        placeholder={cfg.placeholder}
                        className="pr-8 font-mono text-sm"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((prev) => ({ ...prev, [cfg.key]: !prev[cfg.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={show[cfg.key] ? "Hide token" : "Show token"}
                      >
                        {show[cfg.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button size="sm" onClick={() => handleVerify(cfg.key)} disabled={isVerifying || !tokens[cfg.key]?.trim()} className="bg-mlk hover:bg-mlk/90 min-w-[90px]">
                      {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Save"}
                    </Button>
                  </div>
                  {result?.key === cfg.key && (
                    <div className={`text-xs px-2 py-1.5 rounded flex items-center gap-1.5 ${result.status === "PASS" ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30" : "bg-red-500/10 text-red-700 border border-red-500/30"}`}>
                      {result.status === "PASS" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                      <span className="font-medium">{result.status === "PASS" ? "VALIDATION PASS" : "VERIFICATION FAILED"}</span>
                      <span>· {result.message}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <span className="text-[11px] text-muted-foreground">
            Unified scraper: <code className="bg-muted px-1 rounded">POST /api/scrape/run</code> (TikTok, Facebook, Instagram, Threads, X)
          </span>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default S2DCredentialSettingsModal;
