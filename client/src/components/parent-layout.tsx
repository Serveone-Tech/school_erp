import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, UserCheck, CreditCard, FileText, Bell,
  BookOpen, MessageSquare, LogOut, KeyRound, ChevronDown,
  ClipboardList, Users, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useParentAuth } from "@/contexts/parent-auth";
import { ParentChangePasswordDialog } from "@/components/parent-dialogs";

const navItems = [
  { name: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { name: "Attendance", href: "/parent/attendance", icon: UserCheck },
  { name: "Fees", href: "/parent/fees", icon: CreditCard },
  { name: "Exams", href: "/parent/exams", icon: FileText },
  { name: "Notices", href: "/parent/notices", icon: Bell },
  { name: "Homework", href: "/parent/homework", icon: ClipboardList },
  { name: "Remarks", href: "/parent/remarks", icon: BookOpen },
  { name: "Messages", href: "/parent/messages", icon: MessageSquare },
];

// Admin panel colors
const SIDEBAR_BG    = "hsl(220 25% 12%)";
const SIDEBAR_BORDER = "hsl(220 22% 20%)";
const ACTIVE_BG     = "hsl(210 78% 35%)";
const ACTIVE_SHADOW = "0 2px 12px hsl(210 78% 35% / 40%)";
const TEXT_PRIMARY  = "hsl(210 30% 92%)";
const TEXT_MUTED    = "hsl(210 20% 55%)";
const TEXT_NAV      = "hsl(210 25% 78%)";
const HOVER_BG      = "hsl(220 22% 20%)";

export function ParentLayout({ children }: { children: React.ReactNode }) {
  const { parent, activeStudent, logout, switchChild } = useParentAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/parent/login";
  };

  const initials = parent?.fatherName
    ? parent.fatherName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "P";

  function NavLink({ item }: { item: typeof navItems[0] }) {
    const isActive = item.href === "/parent"
      ? location === "/parent"
      : location.startsWith(item.href);
    return (
      <Link href={item.href}>
        <a
          onClick={() => setSidebarOpen(false)}
          style={isActive
            ? { backgroundColor: ACTIVE_BG, color: "#fff", boxShadow: ACTIVE_SHADOW }
            : { color: TEXT_NAV }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-sm font-medium"
          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = HOVER_BG; }}
          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
        >
          <item.icon style={{ width: "17px", height: "17px", flexShrink: 0, color: isActive ? "#fff" : "hsl(210 25% 62%)" }} />
          <span className="truncate">{item.name}</span>
        </a>
      </Link>
    );
  }

  const SidebarInner = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: SIDEBAR_BG }}>
      {/* Logo / student info */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "hsl(210 78% 25%)" }}>
            <Users style={{ width: "18px", height: "18px", color: "hsl(210 78% 70%)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate" style={{ color: TEXT_PRIMARY }}>
              {activeStudent?.name ?? "Parent Portal"}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: TEXT_MUTED }}>
              {activeStudent?.className
                ? `${activeStudent.className}${activeStudent.sectionName ? ` · ${activeStudent.sectionName}` : ""}`
                : "Student Portal"}
            </p>
          </div>
        </div>
        <button className="lg:hidden p-1.5 rounded-lg" style={{ color: TEXT_MUTED }} onClick={() => setSidebarOpen(false)}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Child switcher (multiple children) */}
      {parent && parent.studentIds.length > 1 && (
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "hsl(210 20% 45%)" }}>Switch Child</p>
          {parent.studentIds.map((sid: number) => (
            <button
              key={sid}
              onClick={() => switchChild(sid)}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all mb-0.5"
              style={{
                color: sid === parent.studentIds[0] ? "#fff" : TEXT_NAV,
                backgroundColor: sid === parent.studentIds[0] ? ACTIVE_BG : "transparent",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = HOVER_BG; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = sid === parent.studentIds[0] ? ACTIVE_BG : "transparent"; }}
            >
              Student #{sid}
            </button>
          ))}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2" style={{ scrollbarWidth: "none" }}>
        <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsl(210 20% 45%)" }}>Menu</p>
        {navItems.map(item => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* Footer — parent info + actions */}
      <div className="px-2 py-2" style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: "hsl(210 78% 25%)", color: "hsl(210 78% 80%)" }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{parent?.fatherName ?? "Parent"}</p>
            <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{parent?.email}</p>
          </div>
        </div>
        <button
          onClick={() => setChangePasswordOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "hsl(210 25% 65%)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = HOVER_BG; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
        >
          <KeyRound style={{ width: "16px", height: "16px" }} />
          <span>Change Password</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "hsl(0 60% 65%)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(0 60% 15%)"; (e.currentTarget as HTMLElement).style.color = "hsl(0 80% 75%)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; (e.currentTarget as HTMLElement).style.color = "hsl(0 60% 65%)"; }}
        >
          <LogOut style={{ width: "16px", height: "16px" }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
        <SidebarInner />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-56 flex-shrink-0"><SidebarInner /></div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile menu toggle) */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-12 bg-white border-b flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} style={{ color: TEXT_MUTED }}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm" style={{ color: "hsl(220 25% 20%)" }}>Parent Portal</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-16 lg:pb-6">
          {children}
        </main>

        {/* Bottom nav (mobile only) */}
        <nav className="lg:hidden flex-shrink-0 flex justify-around items-center h-14 bg-white border-t">
          {navItems.slice(0, 5).map(item => {
            const isActive = item.href === "/parent"
              ? location === "/parent"
              : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <a className="flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors"
                  style={{ color: isActive ? ACTIVE_BG : "hsl(220 15% 55%)" }}>
                  <item.icon className="w-4 h-4" />
                  <span className="text-[9px] leading-none">{item.name}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      <ParentChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
