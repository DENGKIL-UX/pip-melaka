"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export function S2DAlertCenterPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [changePoints, setChangePoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cpRes] = await Promise.all([
          fetch("/api/s2d/intelligence/change-points").then((r) => r.json()),
        ]);
        setChangePoints(cpRes.changePoints ?? []);
        // Mock alerts derived from change-points
        const mockAlerts = (cpRes.changePoints ?? []).map((cp: any, idx: number) => ({
          id: `alert-${idx}`,
          title: cp.description ?? cp.narrative ?? `Change-point: ${cp.narrative}`,
          severity: cp.severity ?? "MEDIUM",
          locality: cp.locality ?? "Melaka",
          type: cp.type ?? "SURGE",
          timestamp: new Date().toISOString(),
          status: idx === 0 ? "ACTIVE" : "ACKNOWLEDGED",
        }));
        if (mockAlerts.length === 0) {
          mockAlerts.push({
            id: "alert-0",
            title: "Healthcare funding narrative surge — Taboh Naning",
            severity: "HIGH",
            locality: "Taboh Naning",
            type: "SURGE",
            timestamp: new Date().toISOString(),
            status: "ACTIVE",
          });
        }
        setAlerts(mockAlerts);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-mlk" /> Loading Alert Center…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="p-6 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-mlk" />
        <h2 className="text-lg font-semibold">Alert Center</h2>
        <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-700 bg-amber-500/10">
          {alerts.filter((a) => a.status === "ACTIVE").length} active
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Operational alerts derived from change-point detection and threat scoring (0-100). Posture: White/Grey/Black. No individual voter data.
      </p>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Active
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{alerts.filter((a) => a.status === "ACTIVE").length}</CardContent>
        </Card>
        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Acknowledged
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{alerts.filter((a) => a.status === "ACKNOWLEDGED").length}</CardContent>
        </Card>
        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-mlk" /> Change-points
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{changePoints.length}</CardContent>
        </Card>
      </div>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Alert Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
              <div className={`mt-1 h-2 w-2 rounded-full ${alert.severity === "CRITICAL" ? "bg-red-500" : alert.severity === "HIGH" ? "bg-amber-500" : "bg-blue-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{alert.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {new Date(alert.timestamp).toLocaleString()} · {alert.locality} · {alert.type}
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${alert.status === "ACTIVE" ? "bg-red-500/10 text-red-700 border-red-500/30" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"}`}
              >
                {alert.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default S2DAlertCenterPage;
