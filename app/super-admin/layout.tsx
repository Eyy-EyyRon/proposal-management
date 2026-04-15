import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardFooter } from "@/components/dashboard-footer";
import { AuthGuard } from "@/components/auth-guard";
import { RoleGuard } from "@/components/role-guard";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="super-admin">
        <div className="min-h-screen bg-slate-50">
          <SuperAdminSidebar />
          <div className="ml-64 flex min-h-screen flex-col">
            <DashboardHeader
              title="Super Admin Dashboard"
              subtitle="Manage your team, templates, and proposals"
            />
            <main className="flex-1 p-6">{children}</main>
            <DashboardFooter />
          </div>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
}
