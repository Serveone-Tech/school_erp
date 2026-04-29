import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, DollarSign, Save } from "lucide-react";
import { CURRENCIES } from "@/contexts/currency";

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ currency: string }>({
    queryKey: ["/api/settings"],
    queryFn: () => apiFetch("/api/settings"),
  });

  const [currency, setCurrency] = useState<string>("");

  // Sync local state with fetched value
  const currentCurrency = currency || data?.currency || "USD";

  const mutation = useMutation({
    mutationFn: (cur: string) =>
      fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: cur }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage application preferences</p>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />Currency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Select the currency used for fee collection and financial records throughout the app.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Default Currency</Label>
            <Select
              value={currentCurrency}
              onValueChange={setCurrency}
              disabled={isLoading}
            >
              <SelectTrigger className="rounded-xl h-9 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <SelectItem key={code} value={code}>
                    {info.symbol} — {info.name} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="gap-1.5 rounded-xl"
            onClick={() => mutation.mutate(currentCurrency)}
            disabled={mutation.isPending || isLoading}
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
