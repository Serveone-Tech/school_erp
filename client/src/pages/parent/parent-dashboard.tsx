import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, CreditCard, FileText, Bell, BookOpen, MessageSquare } from "lucide-react";
import { useParentAuth } from "@/contexts/parent-auth";
import { useCurrency } from "@/contexts/currency";

export default function ParentDashboardPage() {
  const currency = useCurrency();
  const { activeStudent } = useParentAuth();

  const { data: attendance, isLoading: loadingAtt } = useQuery<any>({
    queryKey: ["/api/parent/attendance"],
    queryFn: async () => {
      const month = new Date().toISOString().slice(0, 7);
      const res = await fetch(`/api/parent/attendance?month=${month}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: feesData, isLoading: loadingFees } = useQuery<any>({
    queryKey: ["/api/parent/fees"],
    queryFn: async () => {
      const res = await fetch("/api/parent/fees", { credentials: "include" });
      return res.json();
    },
  });

  const { data: exams, isLoading: loadingExams } = useQuery<any[]>({
    queryKey: ["/api/parent/exams"],
    queryFn: async () => {
      const res = await fetch("/api/parent/exams", { credentials: "include" });
      return res.json();
    },
  });

  const { data: notices } = useQuery<any[]>({
    queryKey: ["/api/parent/notices"],
    queryFn: async () => {
      const res = await fetch("/api/parent/notices", { credentials: "include" });
      return res.json();
    },
  });

  const attPct = attendance?.summary?.total
    ? Math.round((attendance.summary.present / attendance.summary.total) * 100)
    : null;

  const upcomingExam = exams?.find(e => e.date && new Date(e.date) >= new Date());
  const latestNotice = notices?.[0];
  const pendingFees = feesData?.payments?.filter((p: any) => p.status === "Pending").length ?? 0;

  return (
    <div className="space-y-6">
      {activeStudent && (
        <div>
          <h1 className="text-xl font-bold text-gray-900">{activeStudent.name}</h1>
          <p className="text-sm text-muted-foreground">
            {activeStudent.className ?? "—"} {activeStudent.sectionName ? `· ${activeStudent.sectionName}` : ""} · #{activeStudent.admissionNo}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Attendance */}
        <Link href="/parent/attendance">
          <a className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Attendance</span>
                </div>
                {loadingAtt ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {attPct !== null ? `${attPct}%` : "—"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">This month</p>
              </CardContent>
            </Card>
          </a>
        </Link>

        {/* Fees */}
        <Link href="/parent/fees">
          <a className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Fees</span>
                </div>
                {loadingFees ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {currency.format(feesData?.summary?.totalPaid ?? 0)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pendingFees > 0 ? <span className="text-red-500">{pendingFees} pending</span> : "All clear"}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>

        {/* Exams */}
        <Link href="/parent/exams">
          <a className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-muted-foreground">Exams</span>
                </div>
                {loadingExams ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold text-purple-600">{exams?.length ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Total exams</p>
              </CardContent>
            </Card>
          </a>
        </Link>

        {/* Messages */}
        <Link href="/parent/messages">
          <a className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-muted-foreground">Messages</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  <MessageSquare className="w-6 h-6 inline" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Send a message</p>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Upcoming Exam */}
        {upcomingExam && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" /> Upcoming Exam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{upcomingExam.name}</p>
              {upcomingExam.subjectName && <p className="text-sm text-muted-foreground">{upcomingExam.subjectName}</p>}
              <p className="text-xs text-muted-foreground mt-1">{upcomingExam.date} · {upcomingExam.startTime}</p>
              <p className="text-xs text-muted-foreground">Total Marks: {upcomingExam.totalMarks}</p>
            </CardContent>
          </Card>
        )}

        {/* Latest Notice */}
        {latestNotice && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-500" /> Latest Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{latestNotice.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{latestNotice.content}</p>
              <Link href="/parent/notices">
                <a className="text-xs text-primary hover:underline mt-2 inline-block">View all notices →</a>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* This month summary */}
      {attendance?.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" /> This Month's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 flex-wrap">
              {[
                { label: "Present", val: attendance.summary.present, color: "text-green-600" },
                { label: "Absent", val: attendance.summary.absent, color: "text-red-500" },
                { label: "Late", val: attendance.summary.late, color: "text-yellow-500" },
                { label: "Half Day", val: attendance.summary.halfDay, color: "text-orange-500" },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
