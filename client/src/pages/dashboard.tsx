// client/src/pages/dashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { Users, GraduationCap, CreditCard, Bell, BookOpen, TrendingUp, UserCheck, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      return res.json();
    },
  });

  const stats = data?.stats || {};
  const notices = data?.recentNotices || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back! Here's what's happening today — {format(new Date(), "dd MMM yyyy")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats.totalStudents || 0} icon={Users} color="bg-blue-50 text-blue-600" sub="Active students" />
        <StatCard title="Total Staff" value={stats.totalStaff || 0} icon={GraduationCap} color="bg-purple-50 text-purple-600" sub="Teaching + Non-teaching" />
        <StatCard title="Fee Collected" value={`₹${(stats.totalFeeCollected || 0).toLocaleString("en-IN")}`} icon={CreditCard} color="bg-emerald-50 text-emerald-600" sub="Total this year" />
        <StatCard title="Today's Date" value={format(new Date(), "dd MMM")} icon={BookOpen} color="bg-amber-50 text-amber-600" sub={format(new Date(), "EEEE")} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Mark Attendance", href: "/attendance", icon: UserCheck, color: "bg-blue-600" },
          { label: "Add Student", href: "/students", icon: Users, color: "bg-emerald-600" },
          { label: "Add Homework", href: "/homework", icon: ClipboardList, color: "bg-purple-600" },
          { label: "Post Notice", href: "/notices", icon: Bell, color: "bg-amber-600" },
        ].map(action => (
          <a key={action.label} href={action.href}
            className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border/50 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color} text-white`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium group-hover:text-primary transition-colors">{action.label}</span>
          </a>
        ))}
      </div>

      {/* Recent Notices */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Recent Notices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notices yet</p>
          ) : (
            <div className="space-y-3">
              {notices.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] h-4">{n.targetAudience}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {n.publishDate ? format(new Date(n.publishDate), "dd MMM yyyy") : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
