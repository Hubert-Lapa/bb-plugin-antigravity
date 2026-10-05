// bb-plugin-antigravity — settings panel.
//
// One job: show whether the Antigravity ACP provider is wired up, and let the
// user fix it. Everything it renders comes from the same `readStatus` the CLI
// prints, so the two surfaces cannot disagree.
import { useCallback, useEffect, useId, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StatusShape {
  providerId: string;
  configPath: string;
  enabled: boolean;
  transport: string;
  agyMissing: boolean;
  adapterMissing: boolean;
  adapterPath?: string;
  pickerRegistered?: boolean;
  drift?: string;
  agy?: {
    path: string;
    version?: string;
    authState: "ok" | "failed" | "unknown";
    modelCount?: number;
    error?: string;
  };
}

function Row({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-success"
      : tone === "bad"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`${toneClass} truncate font-mono text-xs`} title={value}>
        {value}
      </span>
    </div>
  );
}

function AntigravityPanel() {
  const rpc = useRpc<typeof rpcContract>();
  const [status, setStatus] = useState<StatusShape | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    void rpc.call("status").then((next) => setStatus(next as StatusShape));
  }, [rpc]);

  useEffect(refresh, [refresh]);

  const apply = useCallback(
    (action: "enable" | "disable") => {
      setBusy(true);
      setMessage(null);
      void rpc
        .call(action)
        .then((result) => {
          setMessage(result.message);
          if (result.status) setStatus(result.status as StatusShape);
        })
        .finally(() => setBusy(false));
    },
    [rpc],
  );

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Antigravity</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Checking…
        </CardContent>
      </Card>
    );
  }

  const blocked = status.agyMissing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antigravity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-0.5">
          <Row
            label="Provider"
            value={`${status.providerId} — ${
              status.pickerRegistered === true || status.enabled
                ? "in picker"
                : "not registered"
            }`}
            tone={
              status.pickerRegistered === true || status.enabled ? "good" : "normal"
            }
          />
          <Row label="Transport" value={status.transport} />
          <Row
            label="agy"
            value={
              status.agy
                ? `${status.agy.version ?? status.agy.path}${
                    status.agy.authState === "ok"
                      ? ` — ${status.agy.modelCount} models`
                      : status.agy.authState === "failed"
                        ? " — not authenticated"
                        : " — auth unverified from the server process"
                  }`
                : "missing"
            }
            tone={
              status.agy?.authState === "ok"
                ? "good"
                : status.agy?.authState === "failed"
                  ? "bad"
                  : "normal"
            }
          />
          <Row
            label="Adapter"
            value={status.adapterPath ?? "missing"}
            tone={status.adapterMissing ? "bad" : "good"}
          />
          <Row label="Config" value={status.configPath} />
        </div>

        {status.drift ? (
          <p className="text-xs text-destructive">
            Registered entry is stale: {status.drift}. Re-run Enable.
          </p>
        ) : null}

        {status.agyMissing ? (
          <p className="text-xs text-muted-foreground font-mono">
            curl -fsSL https://antigravity.google/cli/install.sh | bash
          </p>
        ) : null}
        {status.adapterMissing ? (
          <p className="text-xs text-muted-foreground">
            Enable downloads agy-acp into ~/.local/bin automatically.
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={busy || blocked}
            onClick={() => apply("enable")}
          >
            {status.enabled ? "Re-apply" : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !status.enabled}
            onClick={() => apply("disable")}
          >
            Disable
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={refresh}>
            Refresh
          </Button>
        </div>

        {message ? (
          <p className="text-xs text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AntigravityProviderIcon({ className }: { className?: string }) {
  const rawId = useId();
  const clipId = `agy-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  return (
    <svg
      viewBox="0 0 180 180"
      width="16"
      height="16"
      className={className ?? "size-full"}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        flexShrink: 0,
      }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id={clipId}>
        <path d="M144.248 149.062C151.748 154.688 162.998 150.938 152.685 140.625C121.748 110.625 128.31 28.125 89.8727 28.125C51.4352 28.125 57.9977 110.625 27.0602 140.625C15.8102 151.875 27.9977 154.688 35.4977 149.062C64.5602 129.375 62.6852 94.6875 89.8727 94.6875C117.06 94.6875 115.185 129.375 144.248 149.062Z" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M144.248 149.062C151.748 154.688 162.998 150.938 152.685 140.625C121.748 110.625 128.31 28.125 89.8727 28.125C51.4352 28.125 57.9977 110.625 27.0602 140.625C15.8102 151.875 27.9977 154.688 35.4977 149.062C64.5602 129.375 62.6852 94.6875 89.8727 94.6875C117.06 94.6875 115.185 129.375 144.248 149.062Z"
          fill="#3186FF"
        />
        <ellipse
          cx="36.6225"
          cy="43.0872"
          rx="36.6225"
          ry="43.0872"
          transform="matrix(-0.112784 0.99362 -0.99362 -0.112781 106.557 -26.4847)"
          fill="#FFE432"
        />
        <ellipse
          cx="155.163"
          cy="54.9292"
          rx="47.4118"
          ry="48.4541"
          transform="rotate(76.9243 155.163 54.9292)"
          fill="#FC413D"
        />
        <ellipse
          cx="14.6006"
          cy="65.4425"
          rx="49.5515"
          ry="64.192"
          transform="rotate(74.1257 14.6006 65.4425)"
          fill="#00B95C"
        />
        <ellipse
          cx="18.1226"
          cy="67.414"
          rx="48.5679"
          ry="53.4688"
          transform="rotate(45.6065 18.1226 67.414)"
          fill="#00B95C"
        />
        <ellipse
          cx="121.837"
          cy="166.945"
          rx="46.6356"
          ry="44.9084"
          transform="rotate(76.9243 121.837 166.945)"
          fill="#3186FF"
        />
        <ellipse
          cx="53.9456"
          cy="56.8997"
          rx="53.9456"
          ry="56.8997"
          transform="matrix(-0.409539 0.912293 -0.912294 -0.409537 162.811 -25.895)"
          fill="#FBBC04"
        />
        <path
          d="M4.21557 239.063C-25.3231 227.467 25.1577 132.061 37.7105 100.085C50.2634 68.1097 84.3853 51.5888 113.924 63.1848C143.463 74.7809 178.474 138.65 165.921 170.626C153.368 202.601 33.7543 250.659 4.21557 239.063Z"
          fill="#3186FF"
        />
        <path
          d="M183.197 120.315C175.289 129.545 154.652 124.839 137.102 109.803C119.553 94.7668 111.738 75.0955 119.646 65.8656C127.554 56.6357 148.191 61.3423 165.74 76.3782C183.289 91.414 191.105 111.085 183.197 120.315Z"
          fill="#749BFF"
        />
        <ellipse
          cx="148.928"
          cy="36.7252"
          rx="71.1018"
          ry="44.199"
          transform="rotate(34.0763 148.928 36.7252)"
          fill="#FC413D"
        />
        <ellipse
          cx="37.848"
          cy="46.0346"
          rx="38.1008"
          ry="22.1575"
          transform="rotate(112.516 37.848 46.0346)"
          fill="#FFEE48"
        />
      </g>
    </svg>
  );
}

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: "antigravity-status",
    title: "Antigravity",
    component: AntigravityPanel,
  });

  const slots = app.slots as typeof app.slots & {
    experimental_providerIcon?: (opts: {
      providerKind: "agent" | "machine" | "environment";
      providerId: string;
      icon: (props: { className?: string }) => any;
    }) => void;
  };

  if (typeof slots.experimental_providerIcon === "function") {
    slots.experimental_providerIcon({
      providerKind: "agent",
      providerId: "acp-antigravity",
      icon: AntigravityProviderIcon,
    });
    slots.experimental_providerIcon({
      providerKind: "agent",
      providerId: "antigravity",
      icon: AntigravityProviderIcon,
    });
  }
});
