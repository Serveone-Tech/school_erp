import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  General: "bg-blue-100 text-blue-700",
  Behaviour: "bg-orange-100 text-orange-700",
  Academic: "bg-purple-100 text-purple-700",
  Health: "bg-red-100 text-red-700",
  Positive: "bg-green-100 text-green-700",
};

export default function ParentRemarksPage() {
  const { data: remarks, isLoading } = useQuery<any[]>({
    queryKey: ["/api/parent/remarks"],
    queryFn: async () => {
      const res = await fetch("/api/parent/remarks", { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-teal-600" /> Remarks
      </h1>

      {!remarks || remarks.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-muted-foreground">No remarks found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {remarks.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {r.remarkType && (
                      <Badge className={`text-[10px] ${TYPE_COLORS[r.remarkType] ?? "bg-gray-100 text-gray-700"}`}>
                        {r.remarkType}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <p className="text-sm text-gray-700">{r.remark}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
