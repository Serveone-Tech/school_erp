import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, AlertCircle } from "lucide-react";

export default function ParentHomeworkPage() {
  const { data: homeworkList, isLoading } = useQuery<any[]>({
    queryKey: ["/api/parent/homework"],
    queryFn: async () => {
      const res = await fetch("/api/parent/homework", { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-indigo-600" /> Homework
      </h1>

      {!homeworkList || homeworkList.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-muted-foreground">No homework found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {homeworkList.map((hw: any) => {
            const isOverdue = hw.dueDate && hw.dueDate < today;
            return (
              <Card key={hw.id} className={`border-l-4 ${isOverdue ? "border-l-red-400" : "border-l-indigo-400"}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{hw.title}</p>
                      <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
                        {hw.subject && <span>{hw.subject}</span>}
                        {hw.assignedDate && <span>Assigned: {hw.assignedDate}</span>}
                      </div>
                      {hw.description && (
                        <p className="text-xs text-gray-600 mt-1.5">{hw.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {hw.dueDate && (
                        <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                          <span>Due: {hw.dueDate}</span>
                        </div>
                      )}
                      {isOverdue && (
                        <Badge className="mt-1 text-[10px] bg-red-100 text-red-700">Overdue</Badge>
                      )}
                    </div>
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
