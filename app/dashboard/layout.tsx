import DashboardShell from "@/components/layout/DashboardShell";
import { Toaster } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <Toaster />
      <ConfirmDialog />
    </>
  );
}
