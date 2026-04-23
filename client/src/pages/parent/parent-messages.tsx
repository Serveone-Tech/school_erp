import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParentAuth } from "@/contexts/parent-auth";

export default function ParentMessagesPage() {
  const { parent, activeStudent } = useParentAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/parent/messages"],
    queryFn: async () => {
      const res = await fetch("/api/parent/messages", { credentials: "include" });
      return res.json();
    },
    // Poll every 8 seconds for new messages from school
    refetchInterval: 8000,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/parent/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["/api/parent/messages"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) sendMutation.mutate();
    }
  };

  function formatTime(sentAt: string | null) {
    if (!sentAt) return "";
    const d = new Date(sentAt);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  // Group messages by date for date separators
  function getDateLabel(sentAt: string | null) {
    if (!sentAt) return "";
    const d = new Date(sentAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border rounded-t-xl shadow-sm flex-shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: "hsl(210 78% 35%)" }}>
          S
        </div>
        <div>
          <p className="font-semibold text-sm">School Administration</p>
          <p className="text-xs text-muted-foreground">
            {activeStudent ? `Re: ${activeStudent.name}` : "Parent-Teacher Chat"}
          </p>
        </div>
        <div className="ml-auto">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-[hsl(210_20%_98%)] border-x space-y-1"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(210 20% 92%) 1px, transparent 0)", backgroundSize: "24px 24px" }}>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Send a message to the school below</p>
          </div>
        ) : (
          (() => {
            let lastDate = "";
            return messages.map((msg: any) => {
              const isFromParent = msg.direction === "Incoming";
              const dateLabel = getDateLabel(msg.sentAt);
              const showDate = dateLabel !== lastDate;
              lastDate = dateLabel;

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] text-muted-foreground bg-white/80 px-3 py-0.5 rounded-full border text-center">
                        {dateLabel}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`flex ${isFromParent ? "justify-end" : "justify-start"} mb-1`}>
                    {/* Avatar for school */}
                    {!isFromParent && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold mr-1.5 mt-auto mb-1 flex-shrink-0"
                        style={{ backgroundColor: "hsl(210 78% 35%)" }}>
                        S
                      </div>
                    )}

                    <div className={`max-w-[72%] ${isFromParent ? "items-end" : "items-start"} flex flex-col`}>
                      {/* Sender label */}
                      <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                        {isFromParent ? "You" : "School"}
                      </span>

                      <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isFromParent
                          ? "text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                      }`}
                        style={isFromParent ? { backgroundColor: "hsl(210 78% 40%)" } : {}}>
                        {msg.subject && (
                          <p className={`text-[11px] font-semibold mb-1 ${isFromParent ? "text-white/70" : "text-gray-500"}`}>
                            {msg.subject}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[10px] mt-1 text-right ${isFromParent ? "text-white/55" : "text-gray-400"}`}>
                          {formatTime(msg.sentAt)}
                        </p>
                      </div>
                    </div>

                    {/* Avatar for parent */}
                    {isFromParent && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ml-1.5 mt-auto mb-1 flex-shrink-0"
                        style={{ backgroundColor: "hsl(210 30% 50%)" }}>
                        {parent?.fatherName?.[0]?.toUpperCase() ?? "P"}
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-3 py-3 bg-white border border-t-0 rounded-b-xl shadow-sm flex-shrink-0">
        <Textarea
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="flex-1 resize-none rounded-xl border-gray-200 text-sm min-h-[40px] max-h-[100px]"
          style={{ scrollbarWidth: "none" }}
        />
        <Button
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending || !message.trim()}
          size="icon"
          className="w-10 h-10 rounded-xl flex-shrink-0"
          style={{ backgroundColor: "hsl(210 78% 35%)" }}
        >
          {sendMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
