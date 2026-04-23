// client/src/App.tsx
import { Switch, Route, useLocation, Redirect } from "wouter";
import { useAuth } from "@/contexts/auth";
import { useParentAuth, ParentAuthProvider } from "@/contexts/parent-auth";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { ParentLayout } from "@/components/parent-layout";
import { BranchProvider } from "@/contexts/branch";

// Pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DriverTrackPage from "@/pages/driver-track";
import DashboardPage from "@/pages/dashboard";
import StudentsPage from "@/pages/students";
import StudentViewPage from "@/pages/student-view";
import StaffPage from "@/pages/staff";
import StaffViewPage from "@/pages/staff-view";
import ClassesPage from "@/pages/classes";
import AttendancePage from "@/pages/attendance";
import HomeworkPage from "@/pages/homework";
import ExamsPage from "@/pages/exams";
import FeesPage from "@/pages/fees";
import NoticesPage from "@/pages/notices";
import TransportPage from "@/pages/transport";
import LibraryPage from "@/pages/library";
import InventoryPage from "@/pages/inventory";
import VisitorsPage from "@/pages/visitors";
import PayrollPage from "@/pages/payroll";
import ReportsPage from "@/pages/reports";
import TimetablePage from "@/pages/timetable";
import HealthPage from "@/pages/health";
import TransactionsPage from "@/pages/transactions";
import UsersPage from "@/pages/users";
import BranchesPage from "@/pages/branches";
import NotificationsPage from "@/pages/notifications-page";
import PricingPage from "@/pages/pricing";
import SuperAdminPage from "@/pages/superadmin";
import NotFoundPage from "@/pages/not-found";
import AutomationPage from "@/pages/automation";
import AutomationHelpPage from "@/pages/automation-help";
import OnboardingPage from "@/pages/onboarding";
import OrganizationPage from "@/pages/organization";
import StaffAttendancePage from "@/pages/staff-attendance";
import RemarksPage from "@/pages/remarks";
import GalleryPage from "@/pages/gallery";
import CommunicationsPage from "@/pages/communications";
import AdmissionsPage from "@/pages/admissions";
import BackupsPage from "@/pages/backups";

// Parent Portal pages
import ParentLoginPage from "@/pages/parent/parent-login";
import ParentDashboardPage from "@/pages/parent/parent-dashboard";
import ParentAttendancePage from "@/pages/parent/parent-attendance";
import ParentFeesPage from "@/pages/parent/parent-fees";
import ParentExamsPage from "@/pages/parent/parent-exams";
import ParentNoticesPage from "@/pages/parent/parent-notices";
import ParentHomeworkPage from "@/pages/parent/parent-homework";
import ParentRemarksPage from "@/pages/parent/parent-remarks";
import ParentMessagesPage from "@/pages/parent/parent-messages";

function ProtectedRoute({ component: Component, adminOnly }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (!user) return null;
  if (adminOnly && user.role !== "admin") return <div className="p-8 text-center text-muted-foreground">Access Denied</div>;
  return <Component />;
}

function AuthenticatedRouter() {
  const { user, isLoading, subscriptionStatus } = useAuth();
  const { parent, isLoading: parentLoading } = useParentAuth();
  const [location] = useLocation();

  if (isLoading || parentLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // Public routes — accessible without login
  if (location === "/register") return <RegisterPage />;
  if (location.startsWith("/driver-track/")) return <DriverTrackPage />;

  // Parent portal login (always public)
  if (location === "/parent/login") return <ParentLoginPage />;

  // Parent portal — if logged in as parent, render parent sub-app
  if (parent) {
    // Non-parent URL while logged in as parent → send to dashboard
    if (!location.startsWith("/parent")) return <Redirect to="/parent" />;
    return (
      <ParentLayout>
        <Switch>
          <Route path="/parent" component={ParentDashboardPage} />
          <Route path="/parent/attendance" component={ParentAttendancePage} />
          <Route path="/parent/fees" component={ParentFeesPage} />
          <Route path="/parent/exams" component={ParentExamsPage} />
          <Route path="/parent/notices" component={ParentNoticesPage} />
          <Route path="/parent/homework" component={ParentHomeworkPage} />
          <Route path="/parent/remarks" component={ParentRemarksPage} />
          <Route path="/parent/messages" component={ParentMessagesPage} />
          <Route><Redirect to="/parent" /></Route>
        </Switch>
      </ParentLayout>
    );
  }

  // If trying to access parent routes but not logged in, redirect to parent login
  if (location.startsWith("/parent")) return <ParentLoginPage />;

  if (!user) return <LoginPage />;

  // SuperAdmin — bypass all gates
  if (user.role === "superadmin") {
    return (
      <AppLayout>
        <Switch>
          <Route path="/" component={SuperAdminPage} />
          <Route path="/superadmin" component={SuperAdminPage} />
        </Switch>
      </AppLayout>
    );
  }

  // Sub-users (staff/teacher/accountant) skip both gates — their admin handles these
  const isSubUser = user.role !== "admin";

  // Gate 1: Onboarding — only primary admin needs to complete this
  if (!isSubUser && !user.isOnboarded) {
    return <OnboardingPage />;
  }

  // Gate 2: Subscription — only primary admin needs a plan
  if (!isSubUser && (subscriptionStatus === "none" || subscriptionStatus === "expired")) {
    return <PricingPage />;
  }

  return (
    <BranchProvider>
      <AppLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/students">{() => <ProtectedRoute component={StudentsPage} />}</Route>
          <Route path="/students/:id">{() => <ProtectedRoute component={StudentViewPage} />}</Route>
          <Route path="/staff">{() => <ProtectedRoute component={StaffPage} />}</Route>
          <Route path="/staff/:id">{() => <ProtectedRoute component={StaffViewPage} />}</Route>
          <Route path="/classes">{() => <ProtectedRoute component={ClassesPage} />}</Route>
          <Route path="/timetable">{() => <ProtectedRoute component={TimetablePage} />}</Route>
          <Route path="/attendance">{() => <ProtectedRoute component={AttendancePage} />}</Route>
          <Route path="/homework">{() => <ProtectedRoute component={HomeworkPage} />}</Route>
          <Route path="/exams">{() => <ProtectedRoute component={ExamsPage} />}</Route>
          <Route path="/fees">{() => <ProtectedRoute component={FeesPage} />}</Route>
          <Route path="/notices">{() => <ProtectedRoute component={NoticesPage} />}</Route>
          <Route path="/transport">{() => <ProtectedRoute component={TransportPage} />}</Route>
          <Route path="/library">{() => <ProtectedRoute component={LibraryPage} />}</Route>
          <Route path="/inventory">{() => <ProtectedRoute component={InventoryPage} />}</Route>
          <Route path="/visitors">{() => <ProtectedRoute component={VisitorsPage} />}</Route>
          <Route path="/payroll">{() => <ProtectedRoute component={PayrollPage} adminOnly />}</Route>
          <Route path="/health">{() => <ProtectedRoute component={HealthPage} />}</Route>
          <Route path="/transactions">{() => <ProtectedRoute component={TransactionsPage} />}</Route>
          <Route path="/reports">{() => <ProtectedRoute component={ReportsPage} />}</Route>
          <Route path="/automation">{() => <ProtectedRoute component={AutomationPage} />}</Route>
          <Route path="/automation/help" component={AutomationHelpPage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/branches">{() => <ProtectedRoute component={BranchesPage} adminOnly />}</Route>
          <Route path="/users">{() => <ProtectedRoute component={UsersPage} adminOnly />}</Route>
          <Route path="/pricing">{() => <ProtectedRoute component={PricingPage} adminOnly />}</Route>
          <Route path="/organization">{() => <ProtectedRoute component={OrganizationPage} adminOnly />}</Route>
          <Route path="/staff-attendance">{() => <ProtectedRoute component={StaffAttendancePage} />}</Route>
          <Route path="/remarks">{() => <ProtectedRoute component={RemarksPage} />}</Route>
          <Route path="/gallery">{() => <ProtectedRoute component={GalleryPage} />}</Route>
          <Route path="/communications">{() => <ProtectedRoute component={CommunicationsPage} />}</Route>
          <Route path="/admissions">{() => <ProtectedRoute component={AdmissionsPage} />}</Route>
          <Route path="/backups">{() => <ProtectedRoute component={BackupsPage} adminOnly />}</Route>
          <Route component={NotFoundPage} />
        </Switch>
      </AppLayout>
    </BranchProvider>
  );
}

export default function App() {
  return (
    <ParentAuthProvider>
      <AuthenticatedRouter />
    </ParentAuthProvider>
  );
}
