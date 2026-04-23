import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function ParentExamsPage() {
  const { data: exams, isLoading } = useQuery<any[]>({
    queryKey: ["/api/parent/exams"],
    queryFn: async () => {
      const res = await fetch("/api/parent/exams", { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-600" /> Examinations
      </h1>

      {!exams || exams.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-muted-foreground">No exams found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam: any) => {
            const result = exam.result;
            const isPast = exam.date && exam.date < today;
            const isPending = !result && isPast;
            const passed = result && !result.isAbsent && exam.passingMarks
              ? result.marksObtained >= exam.passingMarks
              : null;

            return (
              <Card key={exam.id} className={`border-l-4 ${
                result?.isAbsent ? "border-l-red-400" :
                passed === true ? "border-l-green-500" :
                passed === false ? "border-l-red-500" :
                isPast ? "border-l-yellow-400" :
                "border-l-blue-400"
              }`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{exam.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {exam.subjectName && (
                          <span className="text-xs text-muted-foreground">{exam.subjectName}</span>
                        )}
                        {exam.date && (
                          <span className="text-xs text-muted-foreground">{exam.date}</span>
                        )}
                        {exam.startTime && (
                          <span className="text-xs text-muted-foreground">{exam.startTime}</span>
                        )}
                        {exam.examType && (
                          <Badge variant="secondary" className="text-[10px]">{exam.examType}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {result?.isAbsent ? (
                        <div className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Absent</span>
                        </div>
                      ) : result ? (
                        <div>
                          <p className="text-lg font-bold">
                            <span className={passed ? "text-green-600" : "text-red-500"}>
                              {result.marksObtained}
                            </span>
                            <span className="text-sm text-muted-foreground">/{exam.totalMarks}</span>
                          </p>
                          {result.grade && (
                            <Badge className={`text-[10px] ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {result.grade}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            {passed ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-[10px] ${passed ? "text-green-600" : "text-red-500"}`}>
                              {passed ? "Pass" : "Fail"}
                            </span>
                          </div>
                        </div>
                      ) : isPast ? (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">Awaited</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">Upcoming</Badge>
                      )}
                    </div>
                  </div>

                  {result?.remarks && (
                    <p className="text-xs text-muted-foreground mt-2 italic">"{result.remarks}"</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Total: {exam.totalMarks}</span>
                    {exam.passingMarks && <span>Pass: {exam.passingMarks}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
