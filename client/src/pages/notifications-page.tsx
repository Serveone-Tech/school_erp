import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Notification } from "@shared/schema";

function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30000,
  });
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "warning")
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (type === "danger") return <XCircle className="w-4 h-4 text-red-500" />;
  if (type === "success")
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  return <Info className="w-4 h-4 text-blue-500" />;
}

function typeBg(type: string) {
  if (type === "warning") return "bg-amber-50 border-amber-200";
  if (type === "danger") return "bg-red-50 border-red-200";
  if (type === "success") return "bg-emerald-50 border-emerald-200";
  return "bg-blue-50 border-blue-200";
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "All notifications marked as read" });
    },
  });

  // ── Mark single read ───────────────────────────────────────────────────────
  const markOneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => invalidate(),
  });

  // ── Delete single ──────────────────────────────────────────────────────────
  const deleteOneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Notification deleted" });
    },
  });

  // ── Clear all read ─────────────────────────────────────────────────────────
  const clearReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/clear-read", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Read notifications cleared" });
    },
  });

  // ── Refresh overdue notifications ──────────────────────────────────────────
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      invalidate();
      toast({
        title: "Notifications Refreshed",
        description: `${data.count} active notifications`,
      });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-white text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fee dues aur system alerts — auto-refresh daily 8:00 AM
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`}
            />
            Refresh Dues
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}

          {notifications.some((n) => n.isRead) && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-destructive hover:bg-destructive/10 hover:border-destructive"
              onClick={() => clearReadMutation.mutate()}
              disabled={clearReadMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Read
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Total
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {notifications.length}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-blue-200 bg-blue-50/30 shadow-sm">
          <p className="text-xs text-blue-700 uppercase tracking-wider font-semibold">
            Unread
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{unreadCount}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-amber-200 bg-amber-50/30 shadow-sm">
          <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold">
            Warnings
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {notifications.filter((n) => n.type === "warning").length}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-red-200 bg-red-50/30 shadow-sm">
          <p className="text-xs text-red-700 uppercase tracking-wider font-semibold">
            Critical
          </p>
          <p className="text-2xl font-bold text-red-700 mt-1">
            {notifications.filter((n) => n.type === "danger").length}
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40">
          <h2 className="font-semibold text-foreground">All Notifications</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Bell className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium">
              No notifications
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Koi bhi fee overdue nahi hai — sab clear hai!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 transition-colors ${
                  !notif.isRead ? "bg-blue-50/30" : "hover:bg-muted/20"
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${typeBg(notif.type)}`}
                >
                  <NotificationIcon type={notif.type} />
                </div>

                {/* Content */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() =>
                    !notif.isRead && markOneMutation.mutate(notif.id)
                  }
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notif.createdAt
                      ? format(
                          new Date(notif.createdAt),
                          "dd MMM yyyy, hh:mm a",
                        )
                      : "—"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50"
                      onClick={() => markOneMutation.mutate(notif.id)}
                      title="Mark as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteOneMutation.mutate(notif.id)}
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
