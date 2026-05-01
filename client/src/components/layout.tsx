// client/src/components/layout.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, Bell, X, Menu,
  CreditCard, Package, MessageSquare, LogOut, KeyRound, ChevronDown,
  Building2, ShieldCheck, GitBranch, ClipboardList, FileText,
  Heart, Bus, Library, Archive, UserCheck, DollarSign, Calendar,
  Eye, Zap, HelpCircle, BarChart3, BookMarked, TrendingUp, Settings,
  Image, MessageCircle, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth";
import { useBranch } from "@/contexts/branch";
import { ChangePasswordDialog } from "@/components/password-dialogs";
import { SubscriptionBanner } from "@/components/subscription-banner";
import type { Notification } from "@shared/schema";

const navigation = [
  {
    group: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    group: "Academic",
    items: [
      { name: "Students", href: "/students", icon: Users, module: "students" },
      { name: "Classes & Sections", href: "/classes", icon: BookOpen, module: "classes" },
      { name: "Staff", href: "/staff", icon: GraduationCap, module: "staff" },
      { name: "Timetable", href: "/timetable", icon: Calendar, module: "classes" },
      { name: "Attendance", href: "/attendance", icon: UserCheck, module: "attendance" },
      { name: "Staff Attendance", href: "/staff-attendance", icon: ClipboardCheck, module: "attendance" },
    ],
  },
  {
    group: "Learning",
    items: [
      { name: "Homework", href: "/homework", icon: ClipboardList, module: "homework" },
      { name: "Examinations", href: "/exams", icon: FileText, module: "exams" },
      { name: "Notice Board", href: "/notices", icon: Bell, module: "notices" },
    ],
  },
  {
    group: "Finance",
    items: [
      { name: "Fee Management", href: "/fees", icon: CreditCard, module: "fees" },
      { name: "Income / Expense", href: "/transactions", icon: TrendingUp, module: "transactions" },
      { name: "Staff Payroll", href: "/payroll", icon: DollarSign, module: "payroll", adminOnly: true },
    ],
  },
  {
    group: "Resources",
    items: [
      { name: "Library", href: "/library", icon: BookMarked, module: "library" },
      { name: "Inventory", href: "/inventory", icon: Package, module: "inventory" },
      { name: "Transport", href: "/transport", icon: Bus, module: "transport" },
      { name: "Health Records", href: "/health", icon: Heart, module: "health" },
      { name: "Visitors", href: "/visitors", icon: Eye, module: "visitors" },
    ],
  },
  {
    group: "Engagement",
    items: [
      { name: "Admissions", href: "/admissions", icon: ClipboardCheck, module: "students" },
      { name: "Student Remarks", href: "/remarks", icon: MessageSquare, module: "students" },
      { name: "Parent Communications", href: "/communications", icon: MessageCircle, module: "communications" },
      { name: "Photo Gallery", href: "/gallery", icon: Image, module: "students" },
    ],
  },
  {
    group: "Communication",
    items: [
      { name: "Automation", href: "/automation", icon: Zap, module: "communications" },
      { name: "Setup Guide", href: "/automation/help", icon: HelpCircle },
      { name: "Reports", href: "/reports", icon: BarChart3, module: "reports" },
      { name: "Notifications", href: "/notifications", icon: Bell },
      { name: "Backups", href: "/backups", icon: Archive, adminOnly: true },
    ],
  },
  {
    group: "Administration",
    items: [
      { name: "Branches", href: "/branches", icon: GitBranch, adminOnly: true },
      { name: "Users & Roles", href: "/users", icon: ShieldCheck, adminOnly: true },
      { name: "Subscription Plans", href: "/pricing", icon: CreditCard, adminOnly: true },
      { name: "Organization", href: "/organization", icon: Building2, adminOnly: true },
      { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

function useOrganization() {
  return useQuery({
    queryKey: ["/api/auth/organization"],
    queryFn: async () => {
      const res = await fetch("/api/auth/organization", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { user, logout, canAccess, planAllows } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { data: org } = useOrganization();

  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "AD";
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "hsl(220 25% 12%)" }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid hsl(220 22% 20%)" }}>
        <div className="flex items-center gap-3 min-w-0">
          {org?.logo ? (
            <img src={org.logo} alt={org.name} className="h-9 w-9 object-contain rounded-lg flex-shrink-0 bg-white/10" />
          ) : (
            <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(210 78% 25%)" }}>
              <BookOpen className="w-5 h-5" style={{ color: "hsl(210 78% 70%)" }} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate" style={{ color: "hsl(210 30% 92%)" }}>
              {org?.name || "My School"}
            </p>
            <p className="text-[10px] leading-tight capitalize" style={{ color: "hsl(210 20% 55%)" }}>
              School Management
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "hsl(210 20% 65%)" }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2" style={{ scrollbarWidth: "none" }}>
        {navigation.map(section => {
          const visibleItems = section.items.filter((item: any) => {
            if (item.adminOnly) return isAdmin;
            if (!item.module) return true;
            // Plan module gate: if plan restricts modules, hide disallowed ones
            if (isAdmin && !planAllows(item.module)) return false;
            return isAdmin || canAccess(item.module);
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.group} className="mb-1">
              <p className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsl(210 20% 45%)" }}>
                {section.group}
              </p>
              {visibleItems.map((item: any) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href} onClick={onClose}
                    style={isActive ? { backgroundColor: "hsl(210 78% 35%)", color: "#fff", boxShadow: "0 2px 12px hsl(210 78% 35% / 40%)" } : { color: "hsl(210 25% 78%)" }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-sm font-medium ${isActive ? "" : "hover:bg-white/8"}`}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "hsl(220 22% 20%)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = ""; }}
                  >
                    <item.icon style={{ width: "17px", height: "17px", flexShrink: 0, color: isActive ? "#fff" : "hsl(210 25% 62%)" }} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2" style={{ borderTop: "1px solid hsl(220 22% 20%)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: "hsl(210 78% 25%)", color: "hsl(210 78% 80%)" }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: "hsl(210 30% 92%)" }}>{user?.name}</p>
            <p className="text-[11px] capitalize" style={{ color: "hsl(210 20% 55%)" }}>{user?.role}</p>
          </div>
        </div>
        <button onClick={() => setChangePasswordOpen(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "hsl(210 25% 65%)" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "hsl(220 22% 20%)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ""; }}>
          <KeyRound style={{ width: "16px", height: "16px" }} />
          <span>Reset Password</span>
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "hsl(0 60% 65%)" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "hsl(0 60% 15%)"; e.currentTarget.style.color = "hsl(0 80% 75%)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ""; e.currentTarget.style.color = "hsl(0 60% 65%)"; }}>
          <LogOut style={{ width: "16px", height: "16px" }} />
          <span>Sign Out</span>
        </button>
      </div>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });
  const unread = notifications.filter(n => !n.isRead).length;

  const markAll = useMutation({
    mutationFn: () => fetch("/api/notifications/read-all", { method: "PUT", credentials: "include" }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9">
          <Bell style={{ width: "18px", height: "18px" }} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unread > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => markAll.mutate()}>Mark all read</Button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No notifications</div>
          ) : notifications.slice(0, 10).map(n => (
            <div key={n.id} className={`px-4 py-3 border-b last:border-0 hover:bg-muted/50 ${!n.isRead ? "bg-blue-50/50" : ""}`}>
              <p className="text-xs font-semibold">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserDropdown() {
  const { user, logout } = useAuth();
  const [cpOpen, setCpOpen] = useState(false);
  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "AD";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-accent/60 transition-colors">
            <div className="flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold">{user?.name}</span>
              <span className="text-[11px] text-muted-foreground capitalize">{user?.role}</span>
            </div>
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{initials}</AvatarFallback>
            </Avatar>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg">
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuItem onClick={() => setCpOpen(true)}><KeyRound className="w-4 h-4 mr-2" />Change Password</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="w-4 h-4 mr-2" />Sign Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={cpOpen} onOpenChange={setCpOpen} />
    </>
  );
}

function BranchSelector() {
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();
  if (!branches || branches.length === 0) return null;
  return (
    <Select
      value={selectedBranchId ? String(selectedBranchId) : "_all"}
      onValueChange={v => setSelectedBranchId(v === "_all" ? null : Number(v))}
    >
      <SelectTrigger className="h-8 w-36 rounded-lg text-xs border-border/60">
        <SelectValue placeholder="All Branches" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">All Branches</SelectItem>
        {branches.map((b: any) => (
          <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => { setMobileSidebarOpen(false); }, [location]);

  const allItems: any[] = navigation.flatMap((s: any) => s.items);
  const currentPage = allItems.find((i: any) => i.href === location)?.name || "Dashboard";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
        <SidebarContent />
      </aside>
      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 shadow-2xl transform transition-transform duration-300 lg:hidden ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent onClose={() => setMobileSidebarOpen(false)} />
      </aside>
      <div className="flex flex-col flex-1 min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-white/90 backdrop-blur-md px-4 md:px-6 shadow-sm">
          <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 rounded-xl">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-base font-semibold hidden sm:block">{currentPage}</h2>
          </div>
          <div className="flex items-center gap-2">
            <BranchSelector />
            <NotificationBell />
            <div className="h-7 w-[1px] bg-border/50 hidden sm:block" />
            <UserDropdown />
          </div>
        </header>
        <SubscriptionBanner />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
