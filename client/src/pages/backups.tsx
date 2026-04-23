import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatabaseBackup, Download, Loader2, RefreshCw, HardDrive, Clock, FileArchive } from "lucide-react";
import { format } from "date-fns";

interface BackupFile {
  fileName: string;
  size: string;
  createdAt: string;
  path: string;
}

export default function BackupsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: backups = [], isLoading, refetch } = useQuery<BackupFile[]>({
    queryKey: ["/api/backups"],
    queryFn: () => apiFetch("/api/backups"),
  });

  const runMutation = useMutation({
    mutationFn: () =>
      fetch("/api/backups/run", { method: "POST", credentials: "include" }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        return d;
      }),
    onSuccess: (d) => {
      toast({ title: "Backup created", description: d.file });
      qc.invalidateQueries({ queryKey: ["/api/backups"] });
    },
    onError: (err: any) => toast({ title: "Backup failed", description: err.message, variant: "destructive" }),
  });

  async function handleDownload(fileName: string) {
    setDownloading(fileName);
    try {
      const res = await fetch(`/api/backups/download/${encodeURIComponent(fileName)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DatabaseBackup className="w-6 h-6 text-primary" /> Backups
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Database backups are created automatically every day. You can also trigger one manually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="rounded-xl gap-1.5 shadow-sm shadow-primary/20"
            size="sm"
          >
            {runMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <DatabaseBackup className="w-3.5 h-3.5" />}
            {runMutation.isPending ? "Creating Backup…" : "Create Backup Now"}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Backups", value: backups.length, icon: FileArchive },
          { label: "Latest", value: backups[0] ? format(new Date(backups[0].createdAt), "dd MMM, hh:mm a") : "—", icon: Clock },
          { label: "Total Size", value: backups.length ? `${backups.reduce((sum, b) => sum + parseFloat(b.size), 0).toFixed(2)} MB` : "0 MB", icon: HardDrive },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold text-sm">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Backup list */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-primary" /> Backup Files
            <Badge variant="secondary" className="ml-auto text-xs">{backups.length} files</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <DatabaseBackup className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No backups yet</p>
              <p className="text-xs text-muted-foreground">Click "Create Backup Now" to create your first backup</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {backups.map((backup, i) => (
                <div key={backup.fileName} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileArchive className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{backup.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(backup.createdAt), "dd MMM yyyy, hh:mm a")} · {backup.size}
                    </p>
                  </div>
                  {i === 0 && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Latest</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(backup.fileName)}
                    disabled={downloading === backup.fileName}
                    className="rounded-xl gap-1.5 h-8 text-xs flex-shrink-0"
                  >
                    {downloading === backup.fileName
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Download className="w-3 h-3" />}
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Backups are ZIP archives containing your database export. Store them in a safe location for disaster recovery.
        Automatic daily backups run at 2:00 AM.
      </p>
    </div>
  );
}
