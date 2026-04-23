import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, ChevronDown, ChevronUp } from "lucide-react";

function NoticeCard({ notice }: { notice: any }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = notice.content && notice.content.length > 150;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{notice.title}</p>
            <div className="flex flex-wrap gap-x-2 mt-1">
              {notice.publishDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(notice.publishDate).toLocaleDateString("en-IN")}
                </span>
              )}
              {notice.targetAudience && (
                <Badge variant="secondary" className="text-[10px]">{notice.targetAudience}</Badge>
              )}
            </div>
          </div>
        </div>

        {notice.content && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {expanded || !truncated ? notice.content : notice.content.slice(0, 150) + "…"}
            </p>
            {truncated && (
              <button
                className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ParentNoticesPage() {
  const { data: notices, isLoading } = useQuery<any[]>({
    queryKey: ["/api/parent/notices"],
    queryFn: async () => {
      const res = await fetch("/api/parent/notices", { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Bell className="w-5 h-5 text-yellow-500" /> Notices
      </h1>

      {!notices || notices.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-muted-foreground">No notices found</CardContent></Card>
      ) : (
        notices.map((n: any) => <NoticeCard key={n.id} notice={n} />)
      )}
    </div>
  );
}
