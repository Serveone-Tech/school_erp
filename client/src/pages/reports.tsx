import { apiFetch } from "@/lib/queryClient";
// client/src/pages/reports.tsx
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, GraduationCap, CreditCard, UserCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useBranch } from "@/contexts/branch";


export default function ReportsPage() {
  const { selectedBranchId, branchQuery } = useBranch();
  const { data: studentsRaw } = useQuery({ queryKey: ["/api/students", selectedBranchId], queryFn: () => apiFetch(`/api/students${branchQuery}`) });
  const { data: staffRaw } = useQuery({ queryKey: ["/api/staff", selectedBranchId], queryFn: () => apiFetch(`/api/staff${branchQuery}`) });
  const { data: paymentsRaw } = useQuery({ queryKey: ["/api/fees/payments", selectedBranchId], queryFn: () => apiFetch(`/api/fees/payments${branchQuery}`) });
  const { data: classesRaw } = useQuery({ queryKey: ["/api/classes", selectedBranchId], queryFn: () => apiFetch(`/api/classes${branchQuery}`) });

  const students = Array.isArray(studentsRaw) ? studentsRaw : [];
  const staffList = Array.isArray(staffRaw) ? staffRaw : [];
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const classes = Array.isArray(classesRaw) ? classesRaw : [];

  const activeStudents = students.filter((s: any) => s.status === "Active").length;
  const totalFees = payments.reduce((sum: number, p: any) => sum + (p.netAmount || 0), 0);
  const activeStaff = staffList.filter((s: any) => s.status === "Active").length;

  // Students by class
  const byClass: Record<string, number> = {};
  students.forEach((s: any) => {
    const cls = classes.find((c: any) => c.id === s.classId);
    if (cls) byClass[cls.name] = (byClass[cls.name] || 0) + 1;
  });

  // Staff by designation
  const byDesig: Record<string, number> = {};
  staffList.forEach((s: any) => { if (s.designation) byDesig[s.designation] = (byDesig[s.designation] || 0) + 1; });

  // Gender split
  const genders: Record<string, number> = {};
  students.forEach((s: any) => { const g = s.gender || "Unknown"; genders[g] = (genders[g] || 0) + 1; });

  // Monthly fee collection
  const monthlyFees: Record<string, number> = {};
  payments.forEach((p: any) => {
    if (p.paymentDate) {
      const month = format(new Date(p.paymentDate), "MMM yyyy");
      monthlyFees[month] = (monthlyFees[month] || 0) + (p.netAmount || 0);
    }
  });

  const statCards = [
    { title: "Total Students", value: students.length, sub: `${activeStudents} active`, icon: Users, color: "bg-blue-50 text-blue-600" },
    { title: "Active Staff", value: activeStaff, sub: `${staffList.length} total`, icon: GraduationCap, color: "bg-purple-50 text-purple-600" },
    { title: "Total Fee Collected", value: `₹${totalFees.toLocaleString("en-IN")}`, sub: `${payments.length} receipts`, icon: CreditCard, color: "bg-emerald-50 text-emerald-600" },
    { title: "Total Classes", value: classes.length, sub: "Active classes", icon: BarChart3, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" />Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">School performance overview</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.title} className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{s.title}</p><p className="text-xl font-bold mt-1">{s.value}</p><p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p></div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Students by Class */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Students by Class</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(byClass).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            : <div className="space-y-2">
                {Object.entries(byClass).sort(([,a],[,b]) => b-a).slice(0,8).map(([cls, count]) => (
                  <div key={cls} className="flex items-center gap-3">
                    <span className="text-xs w-24 text-muted-foreground truncate">{cls}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min((count / activeStudents) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        {/* Staff by Designation */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Staff by Designation</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(byDesig).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            : <div className="space-y-2">
                {Object.entries(byDesig).sort(([,a],[,b]) => b-a).slice(0,8).map(([desig, count]) => (
                  <div key={desig} className="flex items-center gap-3">
                    <span className="text-xs w-32 text-muted-foreground truncate">{desig}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min((count / staffList.length) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        {/* Student Gender */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" />Student Gender Distribution</CardTitle></CardHeader>
          <CardContent>
            {students.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            : <div className="space-y-3">
                {Object.entries(genders).map(([gender, count]) => (
                  <div key={gender} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{gender}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{count}</span>
                      <span className="text-xs text-muted-foreground">({Math.round((count/students.length)*100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        {/* Monthly Fee Collection */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Monthly Fee Collection</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(monthlyFees).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No fee data</p>
            : <div className="space-y-2">
                {Object.entries(monthlyFees).slice(-6).reverse().map(([month, amount]) => (
                  <div key={month} className="flex items-center gap-3">
                    <span className="text-xs w-20 text-muted-foreground">{month}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min((amount / Math.max(...Object.values(monthlyFees) as number[])) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold">₹{(amount as number).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
