import { apiFetch } from "@/lib/queryClient";
import { useState, useRef, useEffect } from "react";
import { useBranch } from "@/contexts/branch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Send, Search, Users } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

function formatTime(sentAt: string | null) {
  if (!sentAt) return "";
  const d = new Date(sentAt);
  if (isToday(d)) return format(d, "hh:mm a");
  if (isYesterday(d)) return "Yesterday " + format(d, "hh:mm a");
  return format(d, "dd MMM, hh:mm a");
}

function getDateLabel(sentAt: string | null) {
  if (!sentAt) return "";
  const d = new Date(sentAt);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMMM yyyy");
}

export default function CommunicationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId, branchQuery } = useBranch();
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: allComms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/communications", selectedBranchId],
    queryFn: () => apiFetch(`/api/communications${branchQuery}`),
    refetchInterval: 8000,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students", selectedBranchId],
    queryFn: () => apiFetch(`/api/students${branchQuery}`),
  });

  // Auto-scroll to bottom when chat changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allComms, selectedStudentId]);

  // Build student conversation list (students who have at least one message)
  const studentConvMap = new Map<number, { student: any; lastMsg: any; unread: number }>();
  for (const c of allComms) {
    if (!c.studentId) continue;
    const existing = studentConvMap.get(c.studentId);
    const student = students.find((s: any) => s.id === c.studentId);
    if (!student) continue;
    if (!existing || new Date(c.sentAt) > new Date(existing.lastMsg.sentAt)) {
      studentConvMap.set(c.studentId, {
        student,
        lastMsg: c,
        unread: existing ? existing.unread + (c.direction === "Incoming" ? 1 : 0) : (c.direction === "Incoming" ? 1 : 0),
      });
    }
  }

  const conversations = Array.from(studentConvMap.values())
    .sort((a, b) => new Date(b.lastMsg.sentAt).getTime() - new Date(a.lastMsg.sentAt).getTime())
    .filter(({ student }) => !search || student.name.toLowerCase().includes(search.toLowerCase()));

  // Messages for selected student
  const thread = allComms.filter((c: any) => c.studentId === selectedStudentId);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: selectedStudentId,
          type: "Message",
          direction: "Outgoing",
          message: reply.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["/api/communications"] });
    },
    onError: () => toast({ title: "Failed to send", variant: "destructive" }),
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (reply.trim()) sendMutation.mutate();
    }
  };

  const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 rounded-2xl border border-border/50 shadow-sm overflow-hidden bg-card">

      {/* Left panel — conversation list */}
      <div className={`flex flex-col border-r flex-shrink-0 bg-white ${selectedStudentId ? "hidden md:flex w-72" : "flex w-full md:w-72"}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <h1 className="font-bold text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" /> Parent Messages
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} conversations</p>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
              <Users className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No parent messages yet</p>
              <p className="text-xs text-muted-foreground">When parents send messages, they'll appear here</p>
            </div>
          ) : (
            conversations.map(({ student, lastMsg, unread }) => {
              const isSelected = selectedStudentId === student.id;
              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b transition-colors ${isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `hsl(${(student.id * 47) % 360} 55% 45%)` }}>
                    {student.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm truncate">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground flex-shrink-0">
                        {lastMsg.sentAt ? format(new Date(lastMsg.sentAt), "hh:mm a") : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg.direction === "Outgoing" ? "You: " : ""}{lastMsg.message}
                      </p>
                      {lastMsg.direction === "Incoming" && (
                        <Badge className="text-[9px] h-4 px-1.5 bg-primary text-white flex-shrink-0">
                          {lastMsg.direction === "Incoming" ? "New" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — chat thread */}
      {!selectedStudentId ? (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-center bg-muted/20 p-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="font-semibold text-muted-foreground">Select a conversation</p>
          <p className="text-sm text-muted-foreground">Choose a student from the left to view their messages</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-white flex-shrink-0">
            <button
              onClick={() => setSelectedStudentId(null)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              ←
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: `hsl(${(selectedStudentId * 47) % 360} 55% 45%)` }}>
              {selectedStudent?.name?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div>
              <p className="font-semibold text-sm">{selectedStudent?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedStudent?.classId ? `Class ${selectedStudent.classId}` : "Parent conversation"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-[hsl(210_20%_98%)] space-y-1"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(210 20% 92%) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
            {(() => {
              let lastDate = "";
              return thread.map((msg: any) => {
                const isFromSchool = msg.direction === "Outgoing";
                const dateLabel = getDateLabel(msg.sentAt);
                const showDate = dateLabel !== lastDate;
                lastDate = dateLabel;

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] text-muted-foreground bg-white/90 px-3 py-0.5 rounded-full border">
                          {dateLabel}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isFromSchool ? "justify-end" : "justify-start"} mb-1`}>
                      {!isFromSchool && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold mr-1.5 mt-auto mb-1 flex-shrink-0"
                          style={{ backgroundColor: `hsl(${(selectedStudentId * 47) % 360} 55% 45%)` }}>
                          {selectedStudent?.name?.[0]?.toUpperCase() ?? "P"}
                        </div>
                      )}

                      <div className={`max-w-[68%] flex flex-col ${isFromSchool ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                          {isFromSchool ? "You (School)" : `${selectedStudent?.name ?? "Parent"} (Parent)`}
                        </span>
                        <div className={`px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                          isFromSchool
                            ? "text-white rounded-br-sm"
                            : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                        }`}
                          style={isFromSchool ? { backgroundColor: "hsl(210 78% 40%)" } : {}}>
                          {msg.subject && (
                            <p className={`text-[11px] font-semibold mb-1 ${isFromSchool ? "text-white/70" : "text-gray-500"}`}>
                              {msg.subject}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-[10px] mt-1 text-right ${isFromSchool ? "text-white/55" : "text-gray-400"}`}>
                            {formatTime(msg.sentAt)}
                          </p>
                        </div>
                      </div>

                      {isFromSchool && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ml-1.5 mt-auto mb-1 flex-shrink-0"
                          style={{ backgroundColor: "hsl(210 78% 35%)" }}>
                          S
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <div className="flex items-end gap-2 px-3 py-3 bg-white border-t flex-shrink-0">
            <Textarea
              placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="flex-1 resize-none rounded-xl text-sm min-h-[40px] max-h-[100px]"
              style={{ scrollbarWidth: "none" }}
            />
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !reply.trim()}
              size="icon"
              className="w-10 h-10 rounded-xl flex-shrink-0"
            >
              {sendMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
